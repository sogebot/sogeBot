import _ from 'lodash';

import Core from './_interface';
import {
  getBroadcaster, isBot, isBroadcaster, isFollower, isModerator, isOwner, isSubscriber, isVIP, prepare,
} from './commons';
import { debug, warning } from './helpers/log';
import { addToCachedHighestPermission, cleanViewersCache, getFromCachedHighestPermission, permission } from './helpers/permissions';
import { areDecoratorsLoaded, command, default_permission, settings } from './decorators';
import { isMainThread } from './cluster';
import { error } from './helpers/log';
import { adminEndpoint } from './helpers/socket';

import { PermissionCommands, PermissionFiltersInterface, Permissions as PermissionsEntity, PermissionsInterface } from './database/entity/permissions';
import { getRepository, LessThan } from 'typeorm';
import { User, UserInterface } from './database/entity/user';
import oauth from './oauth';
import currency from './currency';

let isWarnedAboutCasters = false;

class Permissions extends Core {
  @settings('warnings')
  public sendWarning = false;

  @settings('warnings')
  public sendByWhisper = false;

  constructor() {
    super();
    this.addMenu({ category: 'settings', name: 'permissions', id: 'settings/permissions' });

    if (isMainThread) {
      this.ensurePreservedPermissionsInDb();
    }
  }

  public sockets() {
    adminEndpoint(this.nsp, 'permission::insert', async (data: Required<PermissionsInterface>, cb) => {
      cleanViewersCache();
      await getRepository(PermissionsEntity).insert(data);
      cb();
    });
    adminEndpoint(this.nsp, 'permission::update::order', async (id: string, order: number, cb) => {
      cleanViewersCache();
      await getRepository(PermissionsEntity).update({ id }, { order });
      cb();
    });
    adminEndpoint(this.nsp, 'permission::save', async (data: Required<PermissionsInterface>, cb) => {
      cleanViewersCache();
      await getRepository(PermissionsEntity).save(data);
      cb();
    });
    adminEndpoint(this.nsp, 'permission::delete', async (id: string, cb) => {
      cleanViewersCache();
      await getRepository(PermissionsEntity).delete({ id });
      cb();
    });
    adminEndpoint(this.nsp, 'permissions', async (cb) => {
      cleanViewersCache();
      cb(await getRepository(PermissionsEntity).find({
        relations: ['filters'],
        order: {
          order: 'ASC',
        },
      }));
    });
    adminEndpoint(this.nsp, 'permission', async (id, cb) => {
      cb(await getRepository(PermissionsEntity).findOne({id}, { relations: ['filters'] }));
    });
    adminEndpoint(this.nsp, 'permissions.order', async (data, cb) => {
      cleanViewersCache();
      for (const d of data) {
        await getRepository(PermissionsEntity)
          .createQueryBuilder().update()
          .where('id=:id', {id: d.id}).set({ order: d.order })
          .execute();
      }
      cb();
    });
    adminEndpoint(this.nsp, 'test.user', async (opts, cb) => {
      const userByName = await getRepository(User).findOne({ username: opts.value });
      if (userByName) {
        const status = await this.check(userByName.userId, opts.pid);
        const partial = await this.check(userByName.userId, opts.pid, true);
        cb({
          status,
          partial,
          state: opts.state,
        });
        return;
      } else if(isFinite(opts.value)) {
        const userById = await getRepository(User).findOne({ userId: Number(opts.value) });
        if (userById) {
          const status = await this.check(userById.userId, opts.pid);
          const partial = await this.check(userById.userId, opts.pid, true);
          cb({
            status,
            partial,
            state: opts.state,
          });
          return;
        }
      }
      cb({
        status: { access: 2 },
        partial: { access: 2 },
        state: opts.state,
      });
    });
  };

  public async getCommandPermission(commandArg: string): Promise<string | null | undefined> {
    const cItem = await getRepository(PermissionCommands).findOne({ name: commandArg });
    if (cItem) {
      return cItem.permission;
    } else {
      return undefined;
    }
  }

  public async get(identifier: string): Promise<PermissionsInterface | undefined> {
    const uuidRegex = /([0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12})/;
    if (identifier.search(uuidRegex) >= 0) {
      return getRepository(PermissionsEntity).findOne({ id: identifier });
    } else {
      // get first name-like
      return (await getRepository(PermissionsEntity).find()).find((o) => {
        return o.name.toLowerCase() === identifier.toLowerCase();
      }) || undefined;
    }
  }

  public async getUserHighestPermission(userId: number): Promise<null | string> {
    const cachedPermission = getFromCachedHighestPermission(userId);
    if (!cachedPermission) {
      const permissions = await getRepository(PermissionsEntity).find({
        cache: true,
        order: {
          order: 'ASC',
        },
      });
      for (const p of permissions) {
        if ((await this.check(userId, p.id, true)).access) {
          addToCachedHighestPermission(userId, p.id);
          return p.id;
        }
      }
      return null;
    } else {
      return cachedPermission;
    }
  }

  public async check(userId: number, permId: string, partial = false): Promise<{access: boolean; permission: PermissionsInterface | undefined}> {
    if (!areDecoratorsLoaded) {
      await new Promise((resolve) => {
        const check = () => {
          // wait for all data to be loaded
          if (areDecoratorsLoaded) {
            resolve();
          } else {
            setTimeout(() => check(), 10);
          }
        };
        check();
      });
    }

    if (_.filter(oauth.generalOwners, (o) => _.isString(o) && o.trim().length > 0).length === 0 && getBroadcaster() === '' && !isWarnedAboutCasters) {
      isWarnedAboutCasters = true;
      warning('Owners or broadcaster oauth is not set, all users are treated as CASTERS!!!');
      const pItem = await getRepository(PermissionsEntity).findOne({ id: permission.CASTERS });
      return { access: true, permission: pItem };
    }

    const user = await getRepository(User).findOne({
      where: { userId },
    });
    const pItem = (await getRepository(PermissionsEntity).findOne({
      relations: ['filters'],
      where: { id: permId },
    })) as PermissionsInterface;
    try {
      if (!user) {
        return { access: permId === permission.VIEWERS, permission: pItem };
      }
      if (!pItem) {
        throw Error(`Permissions ${permId} doesn't exist`);
      }

      // if userId is part of userIds => true
      if (pItem.userIds.includes(String(userId))) {
        return { access: true, permission: pItem };
      }

      // get all higher permissions to check if not partial check only
      if (!partial && pItem.isWaterfallAllowed) {
        const partialPermission = await getRepository(PermissionsEntity).find({
          where: {
            order: LessThan(pItem.order),
          },
        });
        for (const p of _.orderBy(partialPermission, 'order', 'asc')) {
          const partialCheck = await this.check(userId, p.id, true);
          if (partialCheck.access) {
            return { access: true, permission: p}; // we don't need to continue, user have already access with higher permission
          }
        }
      }

      let shouldProceed = false;
      switch (pItem.automation) {
        case 'viewers':
          shouldProceed = true;
          break;
        case 'casters':
          if (_.filter(oauth.generalOwners, _.isString).length === 0 && getBroadcaster() === '') {
            shouldProceed = true;
          } else {
            shouldProceed = isBot(user) || isBroadcaster(user) || isOwner(user);
          }
          break;
        case 'moderators':
          shouldProceed = isModerator(user);
          break;
        case 'subscribers':
          shouldProceed = isSubscriber(user);
          break;
        case 'vip':
          shouldProceed = isVIP(user);
          break;
        case 'followers':
          shouldProceed = isFollower(user);
          break;
        default:
          shouldProceed = false; // we don't have any automation
          break;
      }
      debug('permissions.check', JSON.stringify({ access: shouldProceed && this.filters(user, pItem.filters), permission: pItem }));
      return { access: shouldProceed && this.filters(user, pItem.filters), permission: pItem };
    } catch (e) {
      error(e.stack);
      return { access: false, permission: pItem };
    }
  }

  protected filters(
    user: Required<UserInterface>,
    filters: PermissionFiltersInterface[] = [],
  ): boolean {
    for (const f of filters) {
      let amount = 0;
      switch (f.type) {
        case 'bits':
          amount = user.bits.reduce((a, b) => (a + b.amount), 0);
          break;
        case 'messages':
          amount = user.messages;
          break;
        case 'points':
          amount = user.points;
          break;
        case 'subcumulativemonths':
          amount = user.subscribeCumulativeMonths;
          break;
        case 'substreakmonths':
          amount = user.subscribeStreak;
          break;
        case 'subtier':
          amount = user.subscribeTier === 'Prime' ? 1 : Number(user.subscribeTier);
          break;
        case 'tips':
          amount = user.tips.reduce((a, b) => (a + currency.exchange(b.amount, b.currency, currency.mainCurrency)), 0);
          break;
        case 'watched':
          amount = user.watchedTime / (60 * 60 * 1000 /*hours*/);
      }

      switch (f.comparator) {
        case '<':
          if (!(amount < f.value)) {
            return false;
          }
          break;
        case '<=':
          if (!(amount <= f.value)) {
            return false;
          }
          break;
        case '==':
          if (Number(amount) !== Number(f.value)) {
            return false;
          }
          break;
        case '>':
          if (!(amount > f.value)) {
            return false;
          }
          break;
        case '>=':
          if (!(amount >= f.value)) {
            return false;
          }
          break;
      }
    }
    return true;
  }

  @command('!permission list')
  @default_permission(permission.CASTERS)
  protected async list(opts: CommandOptions): Promise<CommandResponse[]> {
    const permissions = await getRepository(PermissionsEntity).find({
      order: {
        order: 'ASC',
      },
    });
    const responses: CommandResponse[] = [];
    responses.push({ response: await prepare('core.permissions.list'), ...opts });
    for (let i = 0; i < permissions.length; i++) {
      const symbol = permissions[i].isWaterfallAllowed ? '≥' : '=';
      responses.push({ response: `${symbol} | ${permissions[i].name} | ${permissions[i].id}`, ...opts });
    }
    return responses;
  }

  public async ensurePreservedPermissionsInDb(): Promise<void> {
    let p;
    try {
      p = await getRepository(PermissionsEntity).find();
    } catch (e) {
      setTimeout(() => this.ensurePreservedPermissionsInDb(), 1000);
      return;
    }
    let addedCount = 0;

    if (!p.find((o) => o.isCorePermission && o.automation === 'casters')) {
      await getRepository(PermissionsEntity).insert({
        id: permission.CASTERS,
        name: 'Casters',
        automation: 'casters',
        isCorePermission: true,
        isWaterfallAllowed: true,
        order: p.length + addedCount,
        userIds: [],
        filters: [],
      });
      addedCount++;
    }

    if (!p.find((o) => o.isCorePermission && o.automation === 'moderators')) {
      await getRepository(PermissionsEntity).insert({
        id: permission.MODERATORS,
        name: 'Moderators',
        automation: 'moderators',
        isCorePermission: true,
        isWaterfallAllowed: true,
        order: p.length + addedCount,
        userIds: [],
        filters: [],
      });
      addedCount++;
    }

    if (!p.find((o) => o.isCorePermission && o.automation === 'subscribers')) {
      await getRepository(PermissionsEntity).insert({
        id: permission.SUBSCRIBERS,
        name: 'Subscribers',
        automation: 'subscribers',
        isCorePermission: true,
        isWaterfallAllowed: true,
        order: p.length + addedCount,
        userIds: [],
        filters: [],
      });
      addedCount++;
    }

    if (!p.find((o) => o.isCorePermission && o.automation === 'vip')) {
      await getRepository(PermissionsEntity).insert({
        id: permission.VIP,
        name: 'VIP',
        automation: 'vip',
        isCorePermission: true,
        isWaterfallAllowed: true,
        order: p.length + addedCount,
        userIds: [],
        filters: [],
      });
      addedCount++;
    }

    if (!p.find((o) => o.isCorePermission && o.automation === 'followers')) {
      await getRepository(PermissionsEntity).insert({
        id: permission.FOLLOWERS,
        name: 'Followers',
        automation: 'followers',
        isCorePermission: true,
        isWaterfallAllowed: true,
        order: p.length + addedCount,
        userIds: [],
        filters: [],
      });
      addedCount++;
    }

    if (!p.find((o) => o.isCorePermission && o.automation === 'viewers')) {
      await getRepository(PermissionsEntity).insert({
        id: permission.VIEWERS,
        name: 'Viewers',
        automation: 'viewers',
        isCorePermission: true,
        isWaterfallAllowed: true,
        order: p.length + addedCount,
        userIds: [],
        filters: [],
      });
      addedCount++;
    }
  }
}

export default new Permissions();

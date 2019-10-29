import _ from 'lodash';

import Core from './_interface';
import {
  getBroadcaster, isBot, isBroadcaster, isFollower, isModerator, isOwner, isSubscriber, isVIP, prepare, sendMessage,
} from './commons';
import { debug, warning } from './helpers/log';
import { permission } from './helpers/permissions';
import { command, default_permission, settings } from './decorators';
import { isMainThread } from './cluster';
import { error } from './helpers/log';
import { adminEndpoint } from './helpers/socket';

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
      global.db.engine.index(this.collection.data, [{ index: 'id', unique: true }]);
      global.db.engine.index(this.collection.commands, [{ index: 'key', unique: true }]);

      this.ensurePreservedPermissionsInDb();
    }
  }

  public sockets() {
    adminEndpoint(this.nsp, 'permissions', async (cb) => {
      cb(await global.db.engine.find(this.collection.data));
    });
    adminEndpoint(this.nsp, 'permission', async (id, cb) => {
      cb(await global.db.engine.findOne(this.collection.data, { id }));
    });
    adminEndpoint(this.nsp, 'permissions.order', async (data, cb) => {
      for (const d of data) {
        await global.db.engine.update(this.collection.data, { id: String(d.id) }, { order: d.order });
      }
      cb();
    });
    adminEndpoint(this.nsp, 'test.user', async (opts, cb) => {
      const userByName = await global.db.engine.findOne('users', { username: opts.value });
      const userById = await global.db.engine.findOne('users', { id: opts.value });
      if (typeof userByName.id !== 'undefined') {
        const status = await this.check(userByName.id, opts.pid);
        const partial = await this.check(userByName.id, opts.pid, true);
        cb({
          status,
          partial,
          state: opts.state,
        });
      } else if (typeof userById.id !== 'undefined') {
        const status = await this.check(userById.id, opts.pid);
        const partial = await this.check(userById.id, opts.pid, true);
        cb({
          status,
          partial,
          state: opts.state,
        });
      } else {
        cb({
          status: { access: 2 },
          partial: { access: 2 },
          state: opts.state,
        });
      }
    });
  }

  public async getCommandPermission(commandArg: string): Promise<string | null | undefined> {
    const cItem = await global.db.engine.findOne(this.collection.commands, { key: commandArg });
    if (cItem.permission) {
      return cItem.permission;
    } else {
      return undefined;
    }
  }

  public async get(identifier: string): Promise<Permissions.Item | null> {
    const uuidRegex = /([0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12})/;
    let pItem: Permissions.Item | null = null;
    if (identifier.search(uuidRegex) >= 0) {
      pItem = await global.db.engine.findOne(this.collection.data, { id: identifier });
      if (_.isEmpty(pItem)) {
        pItem = null;
      }
    } else {
      const pItems: Permissions.Item[] = await global.db.engine.find(this.collection.data);
      // get first name-like
      pItem = pItems.find((o) => {
        return o.name.toLowerCase() === identifier.toLowerCase();
      }) || null;
    }
    return pItem;
  }

  public async getUserHighestPermission(userId: string): Promise<null | string> {
    for (const p of (_.orderBy(await global.db.engine.find(this.collection.data), 'order', 'asc')) as Permissions.Item[]) {
      if ((await this.check(userId, p.id, true)).access) {
        return p.id;
      }
    }
    return null;
  }

  public async check(userId: string, permId: string, partial = false): Promise<{access: boolean; permission: Permissions.Item | null}> {
    if (_.filter(global.oauth.generalOwners, (o) => _.isString(o) && o.trim().length > 0).length === 0 && getBroadcaster() === '' && !isWarnedAboutCasters) {
      isWarnedAboutCasters = true;
      warning('Owners or broadcaster oauth is not set, all users are treated as CASTERS!!!');
      const pItem: Permissions.Item = await global.db.engine.findOne(this.collection.data, { id: permission.CASTERS });
      return { access: true, permission: pItem };
    }
    const user: User & {
      tips: User.Tips[]; bits: User.Bits[]; points: User.Points[]; watched: User.Watched[]; messages: User.Messages[];
    } = await global.db.engine.findOne('users', { id: userId }, [
      { from: 'users.tips', as: 'tips', foreignField: 'id', localField: 'id' },
      { from: 'users.bits', as: 'bits', foreignField: 'id', localField: 'id' },
      { from: 'users.points', as: 'points', foreignField: 'id', localField: 'id' },
      { from: 'users.messages', as: 'messages', foreignField: 'id', localField: 'id' },
      { from: 'users.watched', as: 'watched', foreignField: 'id', localField: 'id' },
    ]);
    const pItem: Permissions.Item = await global.db.engine.findOne(this.collection.data, { id: permId });

    try {
      if (typeof user.id === 'undefined') {
        return { access: permId === permission.VIEWERS, permission: pItem };
      }
      if (typeof pItem.id === 'undefined') {
        throw Error(`Permissions ${permId} doesn't exist`);
      }

      // if userId is part of userIds => true
      if (pItem.userIds.includes(userId)) {
        return { access: true, permission: pItem };
      }

      // get all higher permissions to check if not partial check only
      if (!partial && pItem.isWaterfallAllowed) {
        const partialPermission: Permissions.Item[] = (await global.db.engine.find(this.collection.data)).filter((o) => {
          return o.order < pItem.order;
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
          if (_.filter(global.oauth.generalOwners, _.isString).length === 0 && getBroadcaster() === '') {
            shouldProceed = true;
          } else {
            shouldProceed = isBot(user) || isBroadcaster(user) || isOwner(user);
          }
          break;
        case 'moderators':
          shouldProceed = await isModerator(user);
          break;
        case 'subscribers':
          shouldProceed = await isSubscriber(user);
          break;
        case 'vip':
          shouldProceed = await isVIP(user);
          break;
        case 'followers':
          shouldProceed = await isFollower(user);
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
    user: User & {
      tips: User.Tips[]; bits: User.Bits[]; points: User.Points[]; watched: User.Watched[]; messages: User.Messages[];
    },
    filters: Permissions.Filter[] = [],
  ): boolean {
    for (const f of filters) {
      let amount = 0;
      switch (f.type) {
        case 'bits':
          amount = user.bits.reduce((a, b) => (a + b.amount), 0);
          break;
        case 'messages':
          amount = user.messages.reduce((a, b) => (a + b.messages), 0);
          break;
        case 'points':
          amount = user.points.reduce((a, b) => (a + b.points), 0);
          break;
        case 'subcumulativemonths':
          amount = user.stats.subCumulativeMonths || 0;
          break;
        case 'substreakmonths':
          amount = user.stats.subStreak || 0;
          break;
        case 'subtier':
          amount = user.stats.tier || 0;
          break;
        case 'tips':
          amount = user.tips.reduce((a, b) => (a + global.currency.exchange(b.amount, b.currency, global.currency.mainCurrency)), 0);
          break;
        case 'watched':
          amount = user.watched.reduce((a, b) => (a + b.watched), 0) / (60 * 60 * 1000 /*hours*/);
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
  protected async list(opts: CommandOptions): Promise<void> {
    const permissions: Permissions.Item[] = _.orderBy(await global.db.engine.find(this.collection.data), 'order', 'asc');
    sendMessage(prepare('core.permissions.list'), opts.sender, opts.attr);
    for (let i = 0; i < permissions.length; i++) {
      setTimeout(() => {
        const symbol = permissions[i].isWaterfallAllowed ? '≥' : '=';
        sendMessage(`${symbol} | ${permissions[i].name} | ${permissions[i].id}`, opts.sender, opts.attr);
      }, 500 * i);
    }
  }

  private async ensurePreservedPermissionsInDb(): Promise<void> {
    const p = await global.db.engine.find(this.collection.data);
    let addedCount = 0;

    if (!p.find((o) => o.isCorePermission && o.automation === 'casters')) {
      await global.db.engine.insert(this.collection.data, {
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
      await global.db.engine.insert(this.collection.data, {
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
      await global.db.engine.insert(this.collection.data, {
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
      await global.db.engine.insert(this.collection.data, {
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
      await global.db.engine.insert(this.collection.data, {
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
      await global.db.engine.insert(this.collection.data, {
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

export { permission, Permissions };

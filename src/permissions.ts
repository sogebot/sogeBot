import { getRepository } from 'typeorm';

import Core from './_interface';
import { Permissions as PermissionsEntity, PermissionsInterface } from './database/entity/permissions';
import { User } from './database/entity/user';
import { command, default_permission } from './decorators';
import { onStartup } from './decorators/on';
import Expects from './expects';
import { prepare } from './helpers/commons';
import { error } from './helpers/log';
import { cleanViewersCache, get } from './helpers/permissions';
import { check, defaultPermissions } from './helpers/permissions/';
import { adminEndpoint } from './helpers/socket';
import users from './users';

class Permissions extends Core {
  @onStartup()
  onStartup() {
    this.addMenu({
      category: 'settings', name: 'permissions', id: 'settings/permissions', this: null,
    });
    this.ensurePreservedPermissionsInDb();
  }

  public sockets() {
    adminEndpoint(this.nsp, 'permission::save', async (data: Required<PermissionsInterface>[], cb) => {
      cleanViewersCache();
      // we need to remove missing permissions
      const permissionsFromDB = await getRepository(PermissionsEntity).find();
      for (const permissionFromDB of permissionsFromDB) {
        if (!data.find(o => o.id === permissionFromDB.id)) {
          await getRepository(PermissionsEntity).remove(permissionFromDB);
        }
      }
      // then save new data
      await getRepository(PermissionsEntity).save(data);
      if (cb) {
        cb(null);
      }
    });
    adminEndpoint(this.nsp, 'generic::deleteById', async (id, cb) => {
      cleanViewersCache();
      await getRepository(PermissionsEntity).delete({ id: String(id) });
      if (cb) {
        cb(null);
      }
    });
    adminEndpoint(this.nsp, 'test.user', async (opts, cb) => {
      if (!(await getRepository(PermissionsEntity).findOne({ id: String(opts.pid) }))) {
        cb('permissionNotFoundInDatabase');
        return;
      }
      if (typeof opts.value === 'string') {
        const userByName = await getRepository(User).findOne({ username: opts.value });
        if (userByName) {
          const status = await check(userByName.userId, opts.pid);
          const partial = await check(userByName.userId, opts.pid, true);
          cb(null, {
            status,
            partial,
            state: opts.state,
          });
          return;
        }
      } else if(isFinite(opts.value)) {
        const userById = await getRepository(User).findOne({ userId: String(opts.value) });
        if (userById) {
          const status = await check(userById.userId, opts.pid);
          const partial = await check(userById.userId, opts.pid, true);
          cb(null, {
            status,
            partial,
            state: opts.state,
          });
          return;
        }
      }
      cb(null, {
        status:  { access: 2 },
        partial: { access: 2 },
        state:   opts.state,
      });
    });
  }

  /**
   * !permission exclude-add -p SongRequest -u soge
   */
  @command('!permission exclude-add')
  @default_permission(defaultPermissions.CASTERS)
  async excludeAdd(opts: CommandOptions): Promise<CommandResponse[]> {
    try  {
      const [userlevel, username] = new Expects(opts.parameters)
        .permission()
        .argument({ name: 'u', type: 'username' })
        .toArray();

      const userId = await users.getIdByName(username);
      if (!userId) {
        throw new Error(prepare('permissions.userNotFound', { username }));
      }

      const pItem = await get(userlevel);
      if (!pItem) {
        throw Error(prepare('permissions.permissionNotFound', { userlevel }));
      }
      if (pItem.isCorePermission) {
        throw Error(prepare('permissions.cannotIgnoreForCorePermission', { userlevel: pItem.name }));
      }

      await getRepository(PermissionsEntity).save({ ...pItem, excludeUserIds: [ String(userId), ...pItem.excludeUserIds ] });
      cleanViewersCache();

      return [{
        response: prepare('permissions.excludeAddSuccessful', {
          username,
          permissionName: pItem.name,
        }),
        ...opts,
      }];
    } catch (e) {
      error(e.stack);
      return [{ response: e.message, ...opts }];
    }
  }

  /**
   * !permission exclude-rm -p SongRequest -u soge
   */
  @command('!permission exclude-rm')
  @default_permission(defaultPermissions.CASTERS)
  async excludeRm(opts: CommandOptions): Promise<CommandResponse[]> {
    try  {
      const [userlevel, username] = new Expects(opts.parameters)
        .permission()
        .argument({ name: 'u', type: 'username' })
        .toArray();

      const userId = await users.getIdByName(username);
      if (!userId) {
        throw new Error(prepare('permissions.userNotFound', { username }));
      }

      const pItem = await get(userlevel);
      if (!pItem) {
        throw Error(prepare('permissions.permissionNotFound', { userlevel }));
      }

      await getRepository(PermissionsEntity).save({ ...pItem, excludeUserIds: [ ...pItem.excludeUserIds.filter(id => id !== String(userId)) ] });
      cleanViewersCache();

      return [{
        response: prepare('permissions.excludeRmSuccessful', {
          username,
          permissionName: pItem.name,
        }),
        ...opts,
      }];
    } catch (e) {
      return [{ response: e.message, ...opts }];
    }
  }

  @command('!permission list')
  @default_permission(defaultPermissions.CASTERS)
  protected async list(opts: CommandOptions): Promise<CommandResponse[]> {
    const permissions = await getRepository(PermissionsEntity).find({ order: { order: 'ASC' } });
    const responses: CommandResponse[] = [];
    responses.push({ response: prepare('core.permissions.list'), ...opts });
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
        id:                 defaultPermissions.CASTERS,
        name:               'Casters',
        automation:         'casters',
        isCorePermission:   true,
        isWaterfallAllowed: true,
        order:              p.length + addedCount,
        userIds:            [],
        excludeUserIds:     [],
        filters:            [],
      });
      addedCount++;
    }

    if (!p.find((o) => o.isCorePermission && o.automation === 'moderators')) {
      await getRepository(PermissionsEntity).insert({
        id:                 defaultPermissions.MODERATORS,
        name:               'Moderators',
        automation:         'moderators',
        isCorePermission:   true,
        isWaterfallAllowed: true,
        order:              p.length + addedCount,
        userIds:            [],
        excludeUserIds:     [],
        filters:            [],
      });
      addedCount++;
    }

    if (!p.find((o) => o.isCorePermission && o.automation === 'subscribers')) {
      await getRepository(PermissionsEntity).insert({
        id:                 defaultPermissions.SUBSCRIBERS,
        name:               'Subscribers',
        automation:         'subscribers',
        isCorePermission:   true,
        isWaterfallAllowed: true,
        order:              p.length + addedCount,
        userIds:            [],
        excludeUserIds:     [],
        filters:            [],
      });
      addedCount++;
    }

    if (!p.find((o) => o.isCorePermission && o.automation === 'vip')) {
      await getRepository(PermissionsEntity).insert({
        id:                 defaultPermissions.VIP,
        name:               'VIP',
        automation:         'vip',
        isCorePermission:   true,
        isWaterfallAllowed: true,
        order:              p.length + addedCount,
        userIds:            [],
        excludeUserIds:     [],
        filters:            [],
      });
      addedCount++;
    }

    if (!p.find((o) => o.isCorePermission && o.automation === 'followers')) {
      await getRepository(PermissionsEntity).insert({
        id:                 defaultPermissions.FOLLOWERS,
        name:               'Followers',
        automation:         'followers',
        isCorePermission:   true,
        isWaterfallAllowed: true,
        order:              p.length + addedCount,
        userIds:            [],
        excludeUserIds:     [],
        filters:            [],
      });
      addedCount++;
    }

    if (!p.find((o) => o.isCorePermission && o.automation === 'viewers')) {
      await getRepository(PermissionsEntity).insert({
        id:                 defaultPermissions.VIEWERS,
        name:               'Viewers',
        automation:         'viewers',
        isCorePermission:   true,
        isWaterfallAllowed: true,
        order:              p.length + addedCount,
        userIds:            [],
        excludeUserIds:     [],
        filters:            [],
      });
      addedCount++;
    }
  }
}

export default new Permissions();

import { z } from 'zod';

import { Delete, ErrorNotFound, Get, Post } from './decorators/endpoint.js';
import { scopes } from './helpers/socket.js';

import Core from '~/_interface.js';
import { Permissions as PermissionsEntity } from '~/database/entity/permissions.js';
import { User } from '~/database/entity/user.js';
import { AppDataSource } from '~/database.js';
import { onStartup } from '~/decorators/on.js';
import { command, default_permission } from '~/decorators.js';
import { Expects } from  '~/expects.js';
import { prepare } from '~/helpers/commons/index.js';
import { error } from '~/helpers/log.js';
import { check } from '~/helpers/permissions/check.js';
import { defaultPermissions } from '~/helpers/permissions/defaultPermissions.js';
import { get } from '~/helpers/permissions/get.js';
import * as changelog from '~/helpers/user/changelog.js';
import users from '~/users.js';

class Permissions extends Core {
  @onStartup()
  onStartup() {
    this.addMenu({
      category: 'settings', name: 'permissions', id: 'settings/permissions', this: null, scopeParent: this.scope(),
    });
    this.ensurePreservedPermissionsInDb();
  }

  @Get('/', {
    scope:       'read',
    scopeOrigin: 'dashboard',
  })
  getAll() {
    return PermissionsEntity.find({
      order: { order: 'ASC' },
    });
  }

  @Get('/availableScopes', {
    scope:       'read',
    scopeOrigin: 'dashboard',
  })
  async getAvailableScopes() {
    return Array.from(scopes);
  }

  @Delete('/:id')
  async removeOne(req: any) {
    const al = await PermissionsEntity.findOneBy({ id: req.params.id });
    if (al) {
      await al.remove();
    }
  }

  @Post('/')
  async save(req: any) {
    const data = req.body as PermissionsEntity[];
    // we need to remove missing permissions
    const permissionsFromDB = await PermissionsEntity.find();
    for (const permissionFromDB of permissionsFromDB) {
      if (!data.find(o => o.id === permissionFromDB.id)) {
        await PermissionsEntity.remove(permissionFromDB);
      }
    }
    // then save new data
    return PermissionsEntity.save(data);
  }

  @Post('/?_action=testUser', {
    zodValidator: z.object({
      pid:   z.string(),
      value: z.union([z.string(), z.number()]),
      state: z.string(),
    }),
  })
  async testUser(req: any) {
    const { pid, value, state } = req.body;
    if (!(await PermissionsEntity.findOneBy({ id: String(pid) }))) {
      throw new ErrorNotFound();
    }
    if (typeof value === 'string') {
      await changelog.flush();
      const userByName = await AppDataSource.getRepository(User).findOneBy({ userName: value });
      if (userByName) {
        const status = await check(userByName.userId, pid);
        const partial = await check(userByName.userId, pid, true);
        return { status, partial, state };

      }
    } else if(isFinite(value)) {
      const userById = await changelog.get(String(value));
      if (userById) {
        const status = await check(userById.userId, pid);
        const partial = await check(userById.userId, pid, true);
        return { status, partial, state };
      }
    }

    return {
      status:  { access: 2 },
      partial: { access: 2 },
      state,
    };
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

      pItem.excludeUserIds = [ String(userId), ...pItem.excludeUserIds ];
      await pItem.save();

      return [{
        response: prepare('permissions.excludeAddSuccessful', {
          username,
          permissionName: pItem.name,
        }),
        ...opts,
      }];
    } catch (e: any) {
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

      pItem.excludeUserIds = [ ...pItem.excludeUserIds.filter(id => id !== String(userId))];
      await pItem.save();

      return [{
        response: prepare('permissions.excludeRmSuccessful', {
          username,
          permissionName: pItem.name,
        }),
        ...opts,
      }];
    } catch (e: any) {
      return [{ response: e.message, ...opts }];
    }
  }

  @command('!permission list')
  @default_permission(defaultPermissions.CASTERS)
  protected async list(opts: CommandOptions): Promise<CommandResponse[]> {
    const permissions = await PermissionsEntity.find({ order: { order: 'ASC' } });
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
      p = await PermissionsEntity.find();
    } catch (e: any) {
      setTimeout(() => this.ensurePreservedPermissionsInDb(), 1000);
      return;
    }
    let addedCount = 0;

    if (!p.find((o) => o.isCorePermission && o.automation === 'casters')) {
      await PermissionsEntity.insert({
        id:                     defaultPermissions.CASTERS,
        name:                   'Casters',
        automation:             'casters',
        isCorePermission:       true,
        isWaterfallAllowed:     true,
        order:                  p.length + addedCount,
        userIds:                [],
        excludeUserIds:         [],
        filters:                [],
        scopes:                 [],
        haveAllScopes:          true,
        excludeSensitiveScopes: false,
      });
      addedCount++;
    }

    if (!p.find((o) => o.isCorePermission && o.automation === 'moderators')) {
      await PermissionsEntity.insert({
        id:                 defaultPermissions.MODERATORS,
        name:               'Moderators',
        automation:         'moderators',
        isCorePermission:   true,
        isWaterfallAllowed: true,
        order:              p.length + addedCount,
        userIds:            [],
        excludeUserIds:     [],
        filters:            [],
        scopes:             [],
      });
      addedCount++;
    }

    if (!p.find((o) => o.isCorePermission && o.automation === 'subscribers')) {
      await PermissionsEntity.insert({
        id:                 defaultPermissions.SUBSCRIBERS,
        name:               'Subscribers',
        automation:         'subscribers',
        isCorePermission:   true,
        isWaterfallAllowed: true,
        order:              p.length + addedCount,
        userIds:            [],
        excludeUserIds:     [],
        filters:            [],
        scopes:             [],
      });
      addedCount++;
    }

    if (!p.find((o) => o.isCorePermission && o.automation === 'vip')) {
      await PermissionsEntity.insert({
        id:                 defaultPermissions.VIP,
        name:               'VIP',
        automation:         'vip',
        isCorePermission:   true,
        isWaterfallAllowed: true,
        order:              p.length + addedCount,
        userIds:            [],
        excludeUserIds:     [],
        filters:            [],
        scopes:             [],
      });
      addedCount++;
    }

    if (!p.find((o) => o.isCorePermission && o.automation === 'viewers')) {
      await PermissionsEntity.insert({
        id:                 defaultPermissions.VIEWERS,
        name:               'Viewers',
        automation:         'viewers',
        isCorePermission:   true,
        isWaterfallAllowed: true,
        order:              p.length + addedCount,
        userIds:            [],
        excludeUserIds:     [],
        filters:            [],
        scopes:             [],
      });
      addedCount++;
    }
  }
}

export default new Permissions();

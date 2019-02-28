'use strict';

import * as _ from 'lodash';
import XRegExp from 'xregexp';
import { permissions } from './_constants';
import Core from './_interface';
import * as Parser from './parser';

class Permissions extends Core {
  [x: string]: any; // TODO: remove after interface ported to TS

  constructor() {
    const options: InterfaceSettings = {
      settings: {
        warnings: {
          sendWarning: false,
          sendByWhisper: true,
        },
      },
      // TBD permissions commands
    };
    super(options);

    this.ensurePreservedPermissionsInDb();
    this.addMenu({ category: 'settings', name: 'permissions', id: '/settings/permissions' });
  }

  public async check(userId: string, permId: string) {
    const user = await global.db.engine.findOne('users', { id: userId });
    const permission: Permissions.Item = await global.db.engine.findOne(this.collection.data, { id: permId });

    try {
      if (typeof user.id === 'undefined') {
        throw Error(`User ${userId} doesn't exist`);
      }
      if (typeof permission.id === 'undefined') {
        throw Error(`Permissions ${permId} doesn't exist`);
      }

      // @TODO: waterfall check caster can proceed on moderators etc. etc.

      let shouldProceed = false;
      switch (permission.automation) {
        case 'viewers':
          shouldProceed = true;
          break;
        case 'caster':
          shouldProceed = global.commons.isBot(user) || global.commons.isBroadcaster(user);
          return;
        case 'moderators':
          shouldProceed = global.commons.isModerator(user);
          break;
        case 'subscribers':
          shouldProceed = global.commons.isSubscriber(user);
          break;
        case 'followers':
          shouldProceed = global.commons.isFollower(user);
          break;
        case null:
          // check first if extended permission passes
          shouldProceed = await this.check(userId, permission.extendsPID);
          if (shouldProceed) {
            // todo filters
          }
          break;

      }
      return shouldProceed;
    } catch (e) {
      global.log.error(e);
      return false;
    }
  }

  protected sockets() {
    this.socket.on('connection', (socket) => {
      socket.on('permissions', async (cb) => {
        cb(await global.db.engine.find(this.collection.data));
      });
      socket.on('permission', async (id, cb) => {
        cb(await global.db.engine.findOne(this.collection.data, { id }));
      });
      socket.on('permissions.order', async (data) => {
        for (const d of data) {
          await global.db.engine.update(this.collection.data, { id: String(d.id) }, { order: d.order });
        }
      });
      socket.on('permissions.extendsList', async (cb) => {
        cb(await this.getExtendablePermissions());
      });
    });
  }

  private async getExtendablePermissions() {
    return (await global.db.engine.find(this.collection.data, { preserve: true }));
  }

  private async ensurePreservedPermissionsInDb() {
    const p = await global.db.engine.find(this.collection.data);
    let addedCount = 0;

    if (!p.find((o) => o.id === String(permissions.CASTERS))) {
      await global.db.engine.insert(this.collection.data, {
        id: String(permissions.CASTERS),
        name: 'Casters',
        preserve: true,
        automation: 'casters',
        extendsPID: null,
        order: p.length + addedCount,
        userIds: [],
        filters: [],
      });
      addedCount++;
    }

    if (!p.find((o) => o.id === String(permissions.ADMINISTRATORS))) {
      await global.db.engine.insert(this.collection.data, {
        id: String(permissions.ADMINISTRATORS),
        name: 'Administrators',
        preserve: true,
        automation: null,
        extendsPID: null,
        order: p.length + addedCount,
        userIds: [],
        filters: [],
      });
      addedCount++;
    }

    if (!p.find((o) => o.id === String(permissions.MODERATORS))) {
      await global.db.engine.insert(this.collection.data, {
        id: String(permissions.MODERATORS),
        name: 'Moderators',
        preserve: true,
        automation: 'moderators',
        extendsPID: null,
        order: p.length + addedCount,
        userIds: [],
        filters: [],
      });
      addedCount++;
    }

    if (!p.find((o) => o.id === String(permissions.SUBSCRIBERS))) {
      await global.db.engine.insert(this.collection.data, {
        id: String(permissions.SUBSCRIBERS),
        name: 'Subscribers',
        preserve: true,
        automation: 'subscribers',
        extendsPID: null,
        order: p.length + addedCount,
        userIds: [],
        filters: [],
      });
      addedCount++;
    }

    if (!p.find((o) => o.id === String(permissions.FOLLOWERS))) {
      await global.db.engine.insert(this.collection.data, {
        id: String(permissions.FOLLOWERS),
        name: 'Followers',
        preserve: true,
        automation: 'followers',
        extendsPID: null,
        order: p.length + addedCount,
        userIds: [],
        filters: [],
      });
      addedCount++;
    }

    if (!p.find((o) => o.id === String(permissions.VIEWERS))) {
      await global.db.engine.insert(this.collection.data, {
        id: String(permissions.VIEWERS),
        name: 'Viewers',
        preserve: true,
        automation: 'viewers',
        extendsPID: null,
        order: p.length + addedCount,
        userIds: [],
        filters: [],
      });
      addedCount++;
    }
  }
}

module.exports = Permissions;

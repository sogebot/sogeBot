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
      });
      addedCount++;
    }
  }
}

module.exports = Permissions;

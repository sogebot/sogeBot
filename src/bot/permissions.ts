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

  private async ensurePreservedPermissionsInDb() {
    const p = await global.db.engine.find(this.collection.data);
    let addedCount = 0;

    if (!p.find((o) => o.id === permissions.CASTERS)) {
      await global.db.engine.insert(this.collection.data, {
        id: permissions.CASTERS,
        name: 'Casters',
        preserve: true,
        automation: 'casters',
        order: p.length + addedCount,
      });
      addedCount++;
    }

    if (!p.find((o) => o.id === permissions.ADMINISTRATORS)) {
      await global.db.engine.insert(this.collection.data, {
        id: permissions.ADMINISTRATORS,
        name: 'Administrators',
        preserve: true,
        automation: 'administrators',
        order: p.length + addedCount,
      });
      addedCount++;
    }

    if (!p.find((o) => o.id === permissions.MODERATORS)) {
      await global.db.engine.insert(this.collection.data, {
        id: permissions.MODERATORS,
        name: 'Moderators',
        preserve: true,
        automation: 'moderators',
        order: p.length + addedCount,
      });
      addedCount++;
    }

    if (!p.find((o) => o.id === permissions.SUBSCRIBERS)) {
      await global.db.engine.insert(this.collection.data, {
        id: permissions.SUBSCRIBERS,
        name: 'Subscribers',
        preserve: true,
        automation: 'subscribers',
        order: p.length + addedCount,
      });
      addedCount++;
    }

    if (!p.find((o) => o.id === permissions.VIEWERS)) {
      await global.db.engine.insert(this.collection.data, {
        id: permissions.VIEWERS,
        name: 'Viewers',
        preserve: true,
        automation: 'viewers',
        order: p.length + addedCount,
      });
      addedCount++;
    }
  }

  private sockets() {
    this.socket.on('connection', (socket) => {
      socket.on('permissions', async (cb) => {
        cb(await global.db.engine.find(this.collection.data));
      });
      socket.on('permissions.order', async (data) => {
        for (const d of data) {
          await global.db.engine.update(this.collection.data, { id: d.id }, { order: d.order });
        }
      });
    });
  }
}

module.exports = Permissions;

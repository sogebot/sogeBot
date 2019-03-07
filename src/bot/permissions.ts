'use strict';

import * as _ from 'lodash';
import { v4 as uuid } from 'uuid';
import Core from './_interface';

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

  public async check(userId: string, permId: string, partial: boolean = false): Promise<{access: boolean, permission: Permissions.Item}> {
    const user: User & {
      tips: User.Tips[], bits: User.Bits[], points: User.Points[], watched: User.Watched[], messages: User.Messages[],
    } = await global.db.engine.findOne('users', { id: userId }, [
      { from: 'users.tips', as: 'tips', foreignField: 'id', localField: 'id' },
      { from: 'users.bits', as: 'bits', foreignField: 'id', localField: 'id' },
      { from: 'users.points', as: 'points', foreignField: 'id', localField: 'id' },
      { from: 'users.messages', as: 'messages', foreignField: 'id', localField: 'id' },
      { from: 'users.watched', as: 'watched', foreignField: 'id', localField: 'id' },
    ]);
    const permission: Permissions.Item = await global.db.engine.findOne(this.collection.data, { id: permId });

    try {
      if (typeof user.id === 'undefined') {
        throw Error(`User ${userId} doesn't exist`);
      }
      if (typeof permission.id === 'undefined') {
        throw Error(`Permissions ${permId} doesn't exist`);
      }

      // if userId is part of userIds => true
      if (permission.userIds.includes(userId)) {
        return { access: true, permission };
      }

      // get all higher permissions to check if not partial check only
      if (!partial) {
        const partialPermission: Permissions.Item[] = (await global.db.engine.find(this.collection.data)).filter((o) => {
          return o.order < permission.order;
        });
        for (const p of _.orderBy(partialPermission, 'order', 'asc')) {
          const partialCheck = await this.check(userId, p.id, true);
          if (partialCheck.access) {
            return { access: true, permission: p}; // we don't need to continue, user have already access with higher permission
          }
        }
      }

      let shouldProceed = false;
      switch (permission.automation) {
        case 'viewers':
          shouldProceed = true;
          break;
        case 'casters':
          shouldProceed = global.commons.isBot(user) || global.commons.isBroadcaster(user);
          break;
        case 'moderators':
          shouldProceed = await global.commons.isModerator(user);
          break;
        case 'subscribers':
          shouldProceed = global.commons.isSubscriber(user);
          break;
        case 'followers':
          shouldProceed = await global.commons.isFollower(user);
          break;
        default:
          shouldProceed = false; // we don't have any automation
          break;
      }
      return { access: shouldProceed || this.filters(user, permission.filters), permission };
    } catch (e) {
      global.log.error(e);
      return { access: false, permission };
    }
  }

  protected filters(
    user: User & {
      tips: User.Tips[], bits: User.Bits[], points: User.Points[], watched: User.Watched[], messages: User.Messages[],
    },
    filters: Permissions.Filter[] = [],
  ): boolean {
    for (const f of filters) {
      let amount: number = 0;
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
          amount = user.tips.reduce((a, b) => (a + global.currency.exchange(b.amount, b.currency, global.currency.settings.currency.mainCurrency)), 0);
          break;
        case 'watched':
          amount = user.watched.reduce((a, b) => (a + b.value), 0);
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
          if (!(Number(amount) === Number(f.value))) {
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
      socket.on('test.user', async (opts, cb) => {
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
    });
  }

  private async ensurePreservedPermissionsInDb(): Promise<void> {
    const p = await global.db.engine.find(this.collection.data);
    let addedCount = 0;

    if (!p.find((o) => o.isCorePermission && o.automation === 'casters')) {
      await global.db.engine.insert(this.collection.data, {
        id: uuid(),
        name: 'Casters',
        automation: 'casters',
        isCorePermission: true,
        order: p.length + addedCount,
        userIds: [],
        filters: [],
      });
      addedCount++;
    }

    if (!p.find((o) => o.isCorePermission && o.automation === 'moderators')) {
      await global.db.engine.insert(this.collection.data, {
        id: uuid(),
        name: 'Moderators',
        automation: 'moderators',
        isCorePermission: true,
        order: p.length + addedCount,
        userIds: [],
        filters: [],
      });
      addedCount++;
    }

    if (!p.find((o) => o.isCorePermission && o.automation === 'subscribers')) {
      await global.db.engine.insert(this.collection.data, {
        id: uuid(),
        name: 'Subscribers',
        automation: 'subscribers',
        isCorePermission: true,
        order: p.length + addedCount,
        userIds: [],
        filters: [],
      });
      addedCount++;
    }

    if (!p.find((o) => o.isCorePermission && o.automation === 'followers')) {
      await global.db.engine.insert(this.collection.data, {
        id: uuid(),
        name: 'Followers',
        automation: 'followers',
        isCorePermission: true,
        order: p.length + addedCount,
        userIds: [],
        filters: [],
      });
      addedCount++;
    }

    if (!p.find((o) => o.isCorePermission && o.automation === 'viewers')) {
      await global.db.engine.insert(this.collection.data, {
        id: uuid(),
        name: 'Viewers',
        automation: 'viewers',
        isCorePermission: true,
        order: p.length + addedCount,
        userIds: [],
        filters: [],
      });
      addedCount++;
    }
  }
}

module.exports = Permissions;

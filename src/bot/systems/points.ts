'use strict';

import * as _ from 'lodash';
import { isMainThread } from '../cluster';

import { isBot, prepare, sendMessage } from '../commons';
import { command, default_permission, parser, permission_settings, settings } from '../decorators';
import Expects from '../expects';
import { permission } from '../permissions';
import System from './_interface';
import * as constants from '../constants';
import { debug, error } from '../helpers/log';
import { adminEndpoint } from '../helpers/socket';

class Points extends System {
  @settings('points')
  name = 'point|points'; // default is <singular>|<plural> | in some languages can be set with custom <singular>|<x:multi>|<plural> where x <= 10

  @permission_settings('points')
  interval = 10;

  @permission_settings('points')
  perInterval = 1;

  @permission_settings('points')
  offlineInterval = 30;

  @permission_settings('points')
  perOfflineInterval = 1;

  @permission_settings('points')
  messageInterval = 5;

  @permission_settings('points')
  perMessageInterval = 1;

  @permission_settings('points')
  messageOfflineInterval = 5;

  @permission_settings('points')
  perMessageOfflineInterval = 0;


  constructor () {
    super();

    if (isMainThread) {
      this.updatePoints();
    }
  }

  async updatePoints () {
    clearTimeout(this.timeouts.updatePoints);
    if (!this.enabled) {
      this.timeouts.updatePoints = global.setTimeout(() => this.updatePoints(), 5000);
      return;
    }

    const [interval, offlineInterval, perInterval, perOfflineInterval, isOnline] = await Promise.all([
      this.getPermissionBasedSettingsValue('interval'),
      this.getPermissionBasedSettingsValue('offlineInterval'),
      this.getPermissionBasedSettingsValue('perInterval'),
      this.getPermissionBasedSettingsValue('perOfflineInterval'),
      global.api.isStreamOnline,
    ]);

    try {
      const userPromises: Promise<void>[] = [];
      for (const username of (await global.users.getAllOnlineUsernames())) {
        if (isBot(username)) {
          continue;
        }
        userPromises.push(this.processPoints(username, { interval, offlineInterval, perInterval, perOfflineInterval, isOnline }));
        await Promise.all(userPromises);
      }
    } catch (e) {
      error(e);
      error(e.stack);
    } finally {
      this.timeouts.updatePoints = global.setTimeout(() => this.updatePoints(), 60000);
    }
  }

  private async processPoints(username: string, opts: {interval: {[permissionId: string]: any}; offlineInterval: {[permissionId: string]: any}; perInterval: {[permissionId: string]: any}; perOfflineInterval: {[permissionId: string]: any}; isOnline: boolean}): Promise<void> {
    return new Promise(async (resolve) => {
      const userId = await global.users.getIdByName(username);
      if (!userId) {
        return resolve(); // skip without id
      }

      // get user max permission
      const permId = await global.permissions.getUserHighestPermission(userId);
      if (!permId) {
        return resolve(); // skip without id
      }

      const interval_calculated = opts.isOnline ? opts.interval[permId] * 60 * 1000 : opts.offlineInterval[permId]  * 60 * 1000;
      const ptsPerInterval = opts.isOnline ? opts.perInterval[permId]  : opts.perOfflineInterval[permId] ;

      const user = await global.db.engine.findOne('users', { username });
      if (_.isEmpty(user)) {
        user.id = await global.api.getIdFromTwitch(username);
      }
      if (user.id) {
        const chat = await global.users.getChatOf(user.id, opts.isOnline);
        const userPointsKey = opts.isOnline ? 'pointsOnline' : 'pointsOffline';
        if (interval_calculated !== 0 && ptsPerInterval[permId]  !== 0) {
          debug('points.update', `${user.username}#${user.id}[${permId}] ${chat} | ${_.get(user, 'time.points', 'n/a')}`);
          _.set(user, 'time.' + userPointsKey, _.get(user, 'time.' + userPointsKey, chat));

          if (user.time[userPointsKey] + interval_calculated <= chat) {
            // add points to user.time[userPointsKey] + interval to user to not overcalculate (this should ensure recursive add points in time)
            const userTimePoints = user.time[userPointsKey] + interval_calculated;
            debug('points.update', `${user.username}#${user.id}[${permId}] +${Math.floor(ptsPerInterval)}`);
            await global.db.engine.increment('users.points', { id: user.id }, { points: ptsPerInterval });
            await global.db.engine.update('users', { id: user.id }, { id: user.id, username, time: { [userPointsKey]: userTimePoints } });
          } else {
            await global.db.engine.update('users', { id: user.id }, { id: user.id, username, time: { [userPointsKey]: user.time[userPointsKey] } });
            debug('points.update', `${user.username}#${user.id}[${permId}] need another ${Number.parseFloat(String(Math.abs((chat - user.time[userPointsKey] - interval_calculated) / constants.MINUTE))).toFixed(2)} minutes to count`);
          }
        } else {
          debug('points.update', `${user.username}#${user.id}[${permId}] points disled or interval is 0, settint points time to chat`);
          await global.db.engine.update('users', { id: user.id }, { id: user.id, username, time: { [userPointsKey]: chat } });
        }
      } else {
        debug('points.update', `${username} doesn't have id`);
      }
      resolve();
    });
  }

  @parser({ fireAndForget: true })
  async messagePoints (opts: ParserOptions) {
    if (opts.skip || opts.message.startsWith('!')) {
      return true;
    }

    const [perMessageInterval, messageInterval, perMessageOfflineInterval, messageOfflineInterval, isOnline] = await Promise.all([
      this.getPermissionBasedSettingsValue('perMessageInterval'),
      this.getPermissionBasedSettingsValue('messageInterval'),
      this.getPermissionBasedSettingsValue('perMessageOfflineInterval'),
      this.getPermissionBasedSettingsValue('messageOfflineInterval'),
      global.api.isStreamOnline,
    ]);

    // get user max permission
    const permId = await global.permissions.getUserHighestPermission(opts.sender.userId);
    if (!permId) {
      return true; // skip without permission
    }

    const interval_calculated = isOnline ? messageInterval[permId] : messageOfflineInterval[permId];
    const ptsPerInterval = isOnline ? perMessageInterval[permId] : perMessageOfflineInterval[permId];

    if (interval_calculated === 0 || ptsPerInterval === 0) {
      return;
    }

    const [user, userMessages] = await Promise.all([
      global.users.getById(opts.sender.userId),
      global.users.getMessagesOf(opts.sender.userId),
    ]);
    const lastMessageCount = _.isNil(user.custom.lastMessagePoints) ? 0 : user.custom.lastMessagePoints;

    if (lastMessageCount + interval_calculated <= userMessages) {
      await global.db.engine.increment('users.points', { id: opts.sender.userId }, { points: ptsPerInterval });
      await global.db.engine.update('users', { id: opts.sender.userId }, { custom: { lastMessagePoints: userMessages } });
    }
    return true;
  }

  sockets () {
    adminEndpoint(this.nsp, 'reset', async () => {
      global.db.engine.remove('users.points', {});
    });
  }

  async getPointsOf (id) {
    let points = 0;
    for (const item of await global.db.engine.find('users.points', { id })) {
      const itemPoints = !_.isNaN(parseInt(_.get(item, 'points', 0))) ? _.get(item, 'points', 0) : 0;
      points = points + Number(itemPoints);
    }
    if (Number(points) < 0) {
      points = 0;
    }

    return points <= Number.MAX_SAFE_INTEGER
      ? points
      : Number.MAX_SAFE_INTEGER;
  }

  @command('!points set')
  @default_permission(permission.CASTERS)
  async set (opts: CommandOptions) {
    try {
      const [username, points] = new Expects(opts.parameters).username().points({ all: false }).toArray();

      const user = await global.users.getByName(username);
      if (!user.id) {
        user.id = await global.api.getIdFromTwitch(username);
      }

      if (user.id) {
        await global.db.engine.remove('users.points', { id: user.id });
        await global.db.engine.insert('users.points', { id: user.id, points });

        const message = await prepare('points.success.set', {
          amount: points,
          username,
          pointsName: await this.getPointsName(points),
        });
        sendMessage(message, opts.sender, opts.attr);
      } else {
        throw new Error('User doesn\'t have ID');
      }
    } catch (err) {
      error(err);
      sendMessage(global.translate('points.failed.set').replace('$command', opts.command), opts.sender, opts.attr);
    }
  }

  @command('!points give')
  async give (opts: CommandOptions) {
    try {
      const [username, points] = new Expects(opts.parameters).username().points({ all: true }).toArray();
      if (opts.sender.username.toLowerCase() === username.toLowerCase()) {
        return;
      }

      const availablePoints = await this.getPointsOf(opts.sender.userId);
      const guser = await global.users.getByName(username);

      if (!guser.id) {
        guser.id = await global.api.getIdFromTwitch(username);
      }

      if (points !== 'all' && availablePoints < points) {
        const message = await prepare('points.failed.giveNotEnough'.replace('$command', opts.command), {
          amount: points,
          username,
          pointsName: await this.getPointsName(points),
        });
        sendMessage(message, opts.sender, opts.attr);
      } else if (points === 'all') {
        await global.db.engine.update('users.points', { id: opts.sender.userId }, { points: 0 });
        await global.db.engine.increment('users.points', { id: guser.id }, { points: availablePoints });
        const message = await prepare('points.success.give', {
          amount: availablePoints,
          username,
          pointsName: await this.getPointsName(availablePoints),
        });
        sendMessage(message, opts.sender, opts.attr);
      } else {
        await global.db.engine.increment('users.points', { id: opts.sender.userId }, { points: (parseInt(points, 10) * -1) });
        await global.db.engine.increment('users.points', { id: guser.id }, { points: parseInt(points, 10) });
        const message = await prepare('points.success.give', {
          amount: points,
          username,
          pointsName: await this.getPointsName(points),
        });
        sendMessage(message, opts.sender, opts.attr);
      }
    } catch (err) {
      sendMessage(global.translate('points.failed.give').replace('$command', opts.command), opts.sender, opts.attr);
    }
  }

  async getPointsName (points): Promise<string> {
    const pointsNames = this.name.split('|').map(Function.prototype.call, String.prototype.trim);
    let single, multi, xmulti;
    // get single|x:multi|multi from pointsName
    if (this.name.length === 0) {
      return '';
    } else {
      switch (pointsNames.length) {
        case 1:
          xmulti = null;
          single = multi = pointsNames[0];
          break;
        case 2:
          single = pointsNames[0];
          multi = pointsNames[1];
          xmulti = null;
          break;
        default:
          const len = pointsNames.length;
          single = pointsNames[0];
          multi = pointsNames[len - 1];
          xmulti = {};

          for (const pattern in pointsNames) {
            if (pointsNames.hasOwnProperty(pattern)) {
              const maxPts = pointsNames[pattern].split(':')[0];
              const name = pointsNames[pattern].split(':')[1];
              xmulti[maxPts] = name;
            }
          }
          break;
      }
    }

    let pointsName = (points === 1 ? single : multi);
    if (!_.isNull(xmulti) && _.isObject(xmulti) && points > 1 && points <= 10) {
      for (let i = points; i <= 10; i++) {
        if (typeof xmulti[i] === 'string') {
          pointsName = xmulti[i];
          break;
        }
      }
    }
    return pointsName;
  }

  @command('!points get')
  @default_permission(permission.CASTERS)
  async get (opts: CommandOptions) {
    try {
      const [username] = new Expects(opts.parameters).username({ optional: true, default: opts.sender.username }).toArray();
      const user = await global.users.getByName(username);

      if (!user.id) {
        user.id = await global.api.getIdFromTwitch(username);
      }

      const points = await this.getPointsOf(user.id);
      const message = await prepare('points.defaults.pointsResponse', {
        amount: points,
        username: username,
        pointsName: await this.getPointsName(points),
      });
      sendMessage(message, opts.sender, opts.attr);
    } catch (err) {
      sendMessage(global.translate('points.failed.get').replace('$command', opts.command), opts.sender, opts.attr);
    }
  }

  @command('!points all')
  @default_permission(permission.CASTERS)
  async all (opts: CommandOptions) {
    try {
      const points = new Expects(opts.parameters).points({ all: false }).toArray();

      for (const username of (await global.users.getAllOnlineUsernames())) {
        if (isBot(username)) {
          continue;
        }

        const user = await global.db.engine.findOne('users', { username });

        if (user.id) {
          await global.db.engine.increment('users.points', { id: user.id }, { points });
        }
      }
      const message = await prepare('points.success.all', {
        amount: points,
        pointsName: await this.getPointsName(points),
      });
      sendMessage(message, opts.sender, opts.attr);
    } catch (err) {
      sendMessage(global.translate('points.failed.all').replace('$command', opts.command), opts.sender, opts.attr);
    }
  }

  @command('!makeitrain')
  @default_permission(permission.CASTERS)
  async rain (opts: CommandOptions) {
    try {
      const points = new Expects(opts.parameters).points({ all: false }).toArray()[0];

      for (const username of (await global.users.getAllOnlineUsernames())) {
        if (isBot(username)) {
          continue;
        }

        const user = await global.db.engine.findOne('users', { username });

        if (user.id) {
          await global.db.engine.increment('users.points', { id: user.id }, { points: Math.floor(Math.random() * points) });
        }
      }
      const message = await prepare('points.success.rain', {
        amount: points,
        pointsName: await this.getPointsName(points),
      });
      sendMessage(message, opts.sender, opts.attr);
    } catch (err) {
      sendMessage(global.translate('points.failed.rain').replace('$command', opts.command), opts.sender, opts.attr);
    }
  }

  @command('!points add')
  @default_permission(permission.CASTERS)
  async add (opts: CommandOptions) {
    try {
      const [username, points] = new Expects(opts.parameters).username().points({ all: false }).toArray();
      const user = await global.db.engine.findOne('users', { username });
      if (user.id) {
        await global.db.engine.increment('users.points', { id: user.id }, { points: points });
      } else {
        user.id = await global.users.getIdByName(username, true);
        if (!user.id) {
          throw new Error('User doesn\'t have ID');
        }
      }

      const message = await prepare('points.success.add', {
        amount: points,
        username: username,
        pointsName: await this.getPointsName(points),
      });
      sendMessage(message, opts.sender, opts.attr);
    } catch (err) {
      sendMessage(global.translate('points.failed.add').replace('$command', opts.command), opts.sender, opts.attr);
    }
  }

  @command('!points remove')
  @default_permission(permission.CASTERS)
  async remove (opts: CommandOptions) {
    try {
      const [username, points] = new Expects(opts.parameters).username().points({ all: true }).toArray();
      const user = await global.db.engine.findOne('users', { username });

      if (!user.id) {
        user.id = await global.api.getIdFromTwitch(username);
      }

      if (user.id) {
        if (points === 'all') {
          await global.db.engine.remove('users.points', { id: user.id });
        } else {
          const availablePoints = await this.getPointsOf(user.id);
          await global.db.engine.increment('users.points', { id: user.id }, { points: -Math.min(points, availablePoints) });
        }

        const message = await prepare('points.success.remove', {
          amount: points,
          username: username,
          pointsName: await this.getPointsName(points === 'all' ? 0 : points),
        });
        sendMessage(message, opts.sender, opts.attr);
      } else {
        throw new Error('User doesn\'t have ID');
      }
    } catch (err) {
      sendMessage(global.translate('points.failed.remove').replace('$command', opts.command), opts.sender, opts.attr);
    }
  }

  @command('!points')
  main (opts: CommandOptions) {
    this.get(opts);
  }
}

export default Points;
export { Points };

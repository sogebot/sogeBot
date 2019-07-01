'use strict';

import * as _ from 'lodash';
import { isMainThread } from 'worker_threads';

import { isBot, prepare, sendMessage } from '../commons';
import { command, default_permission, parser, settings } from '../decorators';
import Expects from '../expects';
import { permission } from '../permissions';
import System from './_interface';

class Points extends System {
  @settings('points')
  name: string = 'point|points'; // default is <singular>|<plural> | in some languages can be set with custom <singular>|<x:multi>|<plural> where x <= 10

  @settings('points')
  interval: number = 10;

  @settings('points')
  perInterval: number = 1;

  @settings('points')
  offlineInterval: number = 30;

  @settings('points')
  perOfflineInterval: number = 1;

  @settings('points')
  messageInterval: number = 5;

  @settings('points')
  perMessageInterval: number = 1;

  @settings('points')
  messageOfflineInterval: number = 5;

  @settings('points')
  perMessageOfflineInterval: number = 0;


  constructor () {
    super();

    if (isMainThread) {
      this.updatePoints();
    }
  }

  async updatePoints () {
    clearTimeout(this.timeouts['updatePoints']);
    if (!(await this.isEnabled())) {
      this.timeouts['updatePoints'] = global.setTimeout(() => this.updatePoints(), 5000);
      return;
    }

    let [interval, perInterval, offlineInterval, perOfflineInterval, isOnline] = await Promise.all([
      this.interval,
      this.perInterval,
      this.offlineInterval,
      this.perOfflineInterval,
      global.cache.isOnline()
    ]);

    interval = isOnline ? interval * 60 * 1000 : offlineInterval * 60 * 1000;
    var ptsPerInterval = isOnline ? perInterval : perOfflineInterval;

    try {
      for (let username of (await global.users.getAllOnlineUsernames())) {
        if (isBot(username)) {continue;}

        let user = await global.db.engine.findOne('users', { username });
        if (_.isEmpty(user)) {user.id = await global.api.getIdFromTwitch(username);}
        if (user.id) {
          if (interval !== 0 && ptsPerInterval !== 0) {
            _.set(user, 'time.points', _.get(user, 'time.points', 0));
            let shouldUpdate = new Date().getTime() - new Date(user.time.points).getTime() >= interval;
            if (shouldUpdate) {
              await global.db.engine.increment('users.points', { id: user.id }, { points: ptsPerInterval });
              await global.db.engine.update('users', { id: user.id }, { id: user.id, username, time: { points: String(new Date()) } });
            }
          } else {
            // force time update if interval or points are 0
            await global.db.engine.update('users', { id: user.id }, { id: user.id, username, time: { points: String(new Date()) } });
          }
        }
      }
    } catch (e) {
      global.log.error(e);
      global.log.error(e.stack);
    } finally {
      this.timeouts['updatePoints'] = global.setTimeout(() => this.updatePoints(), interval === 0 ? 60000 : interval);
    }
  }

  @parser({ fireAndForget: true })
  async messagePoints (opts: ParserOptions) {
    if (opts.skip || opts.message.startsWith('!')) {return true;}

    let [perMessageInterval, messageInterval, perMessageOfflineInterval, messageOfflineInterval, isOnline] = await Promise.all([
      this.perMessageInterval,
      this.messageInterval,
      this.perMessageOfflineInterval,
      this.messageOfflineInterval,
      global.cache.isOnline()
    ]);

    const interval = isOnline ? messageInterval : messageOfflineInterval;
    const ptsPerInterval = isOnline ? perMessageInterval : perMessageOfflineInterval;

    if (interval === 0 || ptsPerInterval === 0) {return;}

    let [user, userMessages] = await Promise.all([
      global.users.getById(opts.sender.userId),
      global.users.getMessagesOf(opts.sender.userId)
    ]);
    let lastMessageCount = _.isNil(user.custom.lastMessagePoints) ? 0 : user.custom.lastMessagePoints;

    if (lastMessageCount + interval <= userMessages) {
      await global.db.engine.increment('users.points', { id: opts.sender.userId }, { points: ptsPerInterval });
      await global.db.engine.update('users', { id: opts.sender.userId }, { custom: { lastMessagePoints: userMessages } });
    }
    return true;
  }

  sockets () {
    if (this.socket === null) {
      return setTimeout(() => this.sockets(), 100);
    }

    this.socket.on('connection', (socket) => {
      socket.on('reset', async () => {
        global.db.engine.remove('users.points', {});
      });
    });
  }

  async getPointsOf (id) {
    let points = 0;
    for (let item of await global.db.engine.find('users.points', { id })) {
      let itemPoints = !_.isNaN(parseInt(_.get(item, 'points', 0))) ? _.get(item, 'points', 0) : 0;
      points = points + Number(itemPoints);
    }
    if (Number(points) < 0) {points = 0;}

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

        let message = await prepare('points.success.set', {
          amount: points,
          username,
          pointsName: await this.getPointsName(points)
        });
        sendMessage(message, opts.sender, opts.attr);
      } else {
        throw new Error('User doesn\'t have ID');
      }
    } catch (err) {
      global.log.error(err);
      sendMessage(global.translate('points.failed.set').replace('$command', opts.command), opts.sender, opts.attr);
    }
  }

  @command('!points give')
  async give (opts: CommandOptions) {
    try {
      const [username, points] = new Expects(opts.parameters).username().points({ all: true }).toArray();
      if (opts.sender.username.toLowerCase() === username.toLowerCase()) {return;}

      const availablePoints = await this.getPointsOf(opts.sender.userId);
      const guser = await global.users.getByName(username);

      if (!guser.id) {guser.id = await global.api.getIdFromTwitch(username);}

      if (points !== 'all' && availablePoints < points) {
        let message = await prepare('points.failed.giveNotEnough'.replace('$command', opts.command), {
          amount: points,
          username,
          pointsName: await this.getPointsName(points)
        });
        sendMessage(message, opts.sender, opts.attr);
      } else if (points === 'all') {
        await global.db.engine.update('users.points', { id: opts.sender.userId }, { points: 0 });
        await global.db.engine.increment('users.points', { id: guser.id }, { points: availablePoints });
        let message = await prepare('points.success.give', {
          amount: availablePoints,
          username,
          pointsName: await this.getPointsName(availablePoints)
        });
        sendMessage(message, opts.sender, opts.attr);
      } else {
        await global.db.engine.increment('users.points', { id: opts.sender.userId }, { points: (parseInt(points, 10) * -1) });
        await global.db.engine.increment('users.points', { id: guser.id }, { points: parseInt(points, 10) });
        let message = await prepare('points.success.give', {
          amount: points,
          username,
          pointsName: await this.getPointsName(points)
        });
        sendMessage(message, opts.sender, opts.attr);
      }
    } catch (err) {
      sendMessage(global.translate('points.failed.give').replace('$command', opts.command), opts.sender, opts.attr);
    }
  }

  async getPointsName (points): Promise<string> {
    var pointsNames = this.name.split('|').map(Function.prototype.call, String.prototype.trim);
    var single, multi, xmulti;
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
          var len = pointsNames.length;
          single = pointsNames[0];
          multi = pointsNames[len - 1];
          xmulti = {};

          for (var pattern in pointsNames) {
            if (pointsNames.hasOwnProperty(pattern)) {
              var maxPts = pointsNames[pattern].split(':')[0];
              var name = pointsNames[pattern].split(':')[1];
              xmulti[maxPts] = name;
            }
          }
          break;
      }
    }

    var pointsName = (points === 1 ? single : multi);
    if (!_.isNull(xmulti) && _.isObject(xmulti) && points > 1 && points <= 10) {
      for (var i = points; i <= 10; i++) {
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

      let points = await this.getPointsOf(user.id);
      let message = await prepare('points.defaults.pointsResponse', {
        amount: points,
        username: username,
        pointsName: await this.getPointsName(points)
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

      for (let username of (await global.users.getAllOnlineUsernames())) {
        if (isBot(username)) {continue;}

        let user = await global.db.engine.findOne('users', { username });

        if (user.id) {
          await global.db.engine.increment('users.points', { id: user.id }, { points });
        }
      }
      let message = await prepare('points.success.all', {
        amount: points,
        pointsName: await this.getPointsName(points)
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
      const points = new Expects(opts.parameters).points({ all: false }).toArray();

      for (let username of (await global.users.getAllOnlineUsernames())) {
        if (isBot(username)) {continue;}

        let user = await global.db.engine.findOne('users', { username });

        if (user.id) {
          await global.db.engine.increment('users.points', { id: user.id }, { points: Math.floor(Math.random() * points) });
        }
      }
      let message = await prepare('points.success.rain', {
        amount: points,
        pointsName: await this.getPointsName(points)
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
      let user = await global.db.engine.findOne('users', { username });
      if (user.id) {
        await global.db.engine.increment('users.points', { id: user.id }, { points: points });
      } else {
        user.id = await global.users.getIdByName(username, true);
        if (!user.id) {
          throw new Error('User doesn\'t have ID');
        }
      }

      let message = await prepare('points.success.add', {
        amount: points,
        username: username,
        pointsName: await this.getPointsName(points)
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
      let user = await global.db.engine.findOne('users', { username });

      if (!user.id) {user.id = await global.api.getIdFromTwitch(username);}

      if (user.id) {
        if (points === 'all') {
          await global.db.engine.remove('users.points', { id: user.id });
        } else {
          let availablePoints = await this.getPointsOf(user.id);
          await global.db.engine.increment('users.points', { id: user.id }, { points: -Math.min(points, availablePoints) });
        }

        let message = await prepare('points.success.remove', {
          amount: points,
          username: username,
          pointsName: await this.getPointsName(points === 'all' ? 0 : points)
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

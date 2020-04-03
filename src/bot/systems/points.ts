'use strict';

import * as _ from 'lodash';
import * as cronparser from 'cron-parser';

import { isBot, prepare, sendMessage } from '../commons';
import { command, default_permission, parser, permission_settings, settings, shared, ui } from '../decorators';
import Expects from '../expects';
import { permission } from '../helpers/permissions';
import System from './_interface';
import { debug, error, warning } from '../helpers/log';
import { adminEndpoint } from '../helpers/socket';
import { FindConditions, getConnection, getRepository } from 'typeorm';
import { User, UserInterface } from '../database/entity/user';
import { getAllOnlineUsernames } from '../helpers/getAllOnlineUsernames';
import { onChange, onLoad } from '../decorators/on';
import permissions from '../permissions';
import api from '../api';
import users from '../users';
import { translate } from '../translate';
import { MINUTE } from '../constants';

class Points extends System {
  cronTask: any = null;
  isLoaded: string[] = [];

  @settings('reset')
  isPointResetIntervalEnabled = false;
  @settings('reset')
  @ui({
    'type': 'cron',
    'emit': 'parseCron',
  })
  resetIntervalCron = '@monthly';
  @shared(true)
  lastCronRun = 0;

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


  constructor() {
    super();

    setInterval(() => {
      try {
        const interval = cronparser.parseExpression(this.resetIntervalCron);
        const lastProbableRun = new Date(interval.prev().toISOString()).getTime();
        if (lastProbableRun > this.lastCronRun) {
          if (this.isPointResetIntervalEnabled) {
            warning('Points were reset by cron');
            getRepository(User).update({}, { points: 0 });
          } else {
            debug('points.cron', 'Cron would run, but it is disabled.');
          }
          this.lastCronRun = Date.now();
        }
      } catch (e) {
        error(e);
      }
    }, MINUTE);
  }

  @onChange('resetIntervalCron')
  @onChange('isPointResetIntervalEnabled')
  resetLastCronRun() {
    this.lastCronRun = Date.now();
  }

  @onLoad('enabled')
  async updatePoints () {
    if (!this.enabled) {
      debug('points.update', 'Disabled, next check in 5s');
      setTimeout(() => this.updatePoints(), 5000);
      return;
    }

    const [interval, offlineInterval, perInterval, perOfflineInterval, isOnline] = await Promise.all([
      this.getPermissionBasedSettingsValue('interval'),
      this.getPermissionBasedSettingsValue('offlineInterval'),
      this.getPermissionBasedSettingsValue('perInterval'),
      this.getPermissionBasedSettingsValue('perOfflineInterval'),
      api.isStreamOnline,
    ]);

    try {
      const userPromises: Promise<void>[] = [];
      debug('points.update', `Started points adding, isOnline: ${isOnline}`);
      for (const username of (await getAllOnlineUsernames())) {
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
      debug('points.update', 'Finished points adding, triggering next check in 60s');
      setTimeout(() => this.updatePoints(), 60000);
    }
  }

  private async processPoints(username: string, opts: {interval: {[permissionId: string]: any}; offlineInterval: {[permissionId: string]: any}; perInterval: {[permissionId: string]: any}; perOfflineInterval: {[permissionId: string]: any}; isOnline: boolean}): Promise<void> {
    return new Promise(async (resolve) => {
      const userId = await users.getIdByName(username);
      if (!userId) {
        debug('points.update', `User ${username} missing userId`);
        return resolve(); // skip without id
      }

      // get user max permission
      const permId = await permissions.getUserHighestPermission(userId);
      if (!permId) {
        debug('points.update', `User ${username}#${userId} permId not found`);
        return resolve(); // skip without id
      }

      const interval_calculated = opts.isOnline ? opts.interval[permId] * 60 * 1000 : opts.offlineInterval[permId]  * 60 * 1000;
      const ptsPerInterval = opts.isOnline ? opts.perInterval[permId]  : opts.perOfflineInterval[permId] ;

      const user = await getRepository(User).findOne({ username });
      if (!user) {
        debug('points.update', `new user in db ${username}#${userId}[${permId}]`);
        await getRepository(User).save({
          userId,
          username,
          points: 0,
          pointsOfflineGivenAt: 0,
          pointsOnlineGivenAt: 0,
        });
      } else {
        const chat = await users.getChatOf(userId, opts.isOnline);
        const userPointsKey = opts.isOnline ? 'pointsOnlineGivenAt' : 'pointsOfflineGivenAt';
        if (interval_calculated !== 0 && ptsPerInterval[permId]  !== 0) {
          debug('points.update', `${user.username}#${userId}[${permId}] ${chat} | ${user[userPointsKey]}`);
          if (user[userPointsKey] + interval_calculated <= chat) {
            // add points to user[userPointsKey] + interval to user to not overcalculate (this should ensure recursive add points in time)
            const userTimePoints = user[userPointsKey] + interval_calculated;
            debug('points.update', `${user.username}#${userId}[${permId}] +${Math.floor(ptsPerInterval)}`);
            await getRepository(User).save({
              ...user,
              points: user.points + ptsPerInterval,
              [userPointsKey]: userTimePoints,
            });
          }
        } else {
          await getRepository(User).save({
            ...user,
            [userPointsKey]: chat,
          });
          debug('points.update', `${user.username}#${userId}[${permId}] points disabled or interval is 0, settint points time to chat`);
        }
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
      api.isStreamOnline,
    ]);

    // get user max permission
    const permId = await permissions.getUserHighestPermission(opts.sender.userId);
    if (!permId) {
      return true; // skip without permission
    }

    const interval_calculated = isOnline ? messageInterval[permId] : messageOfflineInterval[permId];
    const ptsPerInterval = isOnline ? perMessageInterval[permId] : perMessageOfflineInterval[permId];

    if (interval_calculated === 0 || ptsPerInterval === 0) {
      return;
    }

    const user = await getRepository(User).findOne({ userId: opts.sender.userId });
    if (!user) {
      return true;
    }

    if (user.pointsByMessageGivenAt + interval_calculated <= user.messages) {
      await getRepository(User).save({
        ...user,
        points: user.points + ptsPerInterval,
        pointsByMessageGivenAt: user.messages,
      });
    }
    return true;
  }

  sockets () {
    adminEndpoint(this.nsp, 'parseCron', (cron, cb) => {
      try {
        const interval = cronparser.parseExpression(cron);
        // get 5 dates
        const intervals: number[] = [];
        for (let i = 0; i < 5; i++) {
          intervals.push(new Date(interval.next().toISOString()).getTime());
        }
        cb(null, intervals);
      } catch (e) {
        cb(e.stack, []);
      }
    });

    adminEndpoint(this.nsp, 'reset', async () => {
      getRepository(User).update({}, { points: 0 });
    });
  }

  maxSafeInteger(number) {
    return number <= Number.MAX_SAFE_INTEGER
      ? number
      : Number.MAX_SAFE_INTEGER;
  }

  async getPointsOf (id) {
    const user = await getRepository(User).findOne({ where: { userId: id }});

    if (user) {
      if (user.points < 0) {
        await getRepository(User).save({
          ...user,
          points: 0,
        });
      }
      return user.points <= Number.MAX_SAFE_INTEGER
        ? user.points
        : Number.MAX_SAFE_INTEGER;
    } else {
      return 0;
    }
  }

  @command('!points set')
  @default_permission(permission.CASTERS)
  async set (opts: CommandOptions) {
    try {
      const [username, points] = new Expects(opts.parameters).username().points({ all: false }).toArray();

      await getRepository(User).update({ username }, { points });

      const message = await prepare('points.success.set', {
        amount: points,
        username,
        pointsName: await this.getPointsName(points),
      });
      sendMessage(message, opts.sender, opts.attr);
    } catch (err) {
      error(err);
      sendMessage(translate('points.failed.set').replace('$command', opts.command), opts.sender, opts.attr);
    }
  }

  @command('!points give')
  async give (opts: CommandOptions) {
    try {
      const [username, points] = new Expects(opts.parameters).username().points({ all: true }).toArray();
      if (opts.sender.username.toLowerCase() === username.toLowerCase()) {
        return;
      }

      const guser = await getRepository(User).findOne({ username });
      const sender = await getRepository(User).findOne({ userId: opts.sender.userId });

      if (!sender) {
        throw new Error('Sender was not found in DB!');
      }

      if (!guser) {
        await getRepository(User).save({
          userId: Number(await api.getIdFromTwitch(username)),
          username, points: 0,
        });
        this.give(opts);
        return;
      }

      const availablePoints = sender.points;

      if (points !== 'all' && availablePoints < points) {
        const message = await prepare('points.failed.giveNotEnough'.replace('$command', opts.command), {
          amount: points,
          username,
          pointsName: await this.getPointsName(points),
        });
        sendMessage(message, opts.sender, opts.attr);
      } else if (points === 'all') {
        await getRepository(User).save([
          { ...guser, points: guser.points + availablePoints },
          { ...sender, points: 0 },
        ]);
        const message = await prepare('points.success.give', {
          amount: availablePoints,
          username,
          pointsName: await this.getPointsName(availablePoints),
        });
        sendMessage(message, opts.sender, opts.attr);
      } else {
        await getRepository(User).save([
          { ...guser, points: guser.points + points },
          { ...sender, points: sender.points - points },
        ]);
        const message = await prepare('points.success.give', {
          amount: points,
          username,
          pointsName: await this.getPointsName(points),
        });
        sendMessage(message, opts.sender, opts.attr);
      }
    } catch (err) {
      sendMessage(translate('points.failed.give').replace('$command', opts.command), opts.sender, opts.attr);
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
      const user = await getRepository(User).findOne({ username });

      if (!user) {
        await getRepository(User).save({
          userId: Number(await api.getIdFromTwitch(username)),
          username,
        });
        this.get(opts);
        return;
      }

      const connection = await getConnection();
      const query = (type) => {
        switch(type) {
          case 'postgres':
          case 'sqlite':
            return `SELECT COUNT(*) as "order" FROM "user" WHERE "points" > (SELECT "points" FROM "user" WHERE "username"='${user.username}')`;
          case 'mysql':
          case 'mariadb':
          default:
            return `SELECT COUNT(*) as \`order\` FROM \`user\` WHERE \`points\` > (SELECT \`points\` FROM \`user\` WHERE \`username\`="${user.username}")`;
        }
      };

      const orderQuery = await getRepository(User).query(query(connection.options.type));
      const count = await getRepository(User).count();

      let order: number | string = '?';
      if (orderQuery.length > 0) {
        order = Number(orderQuery[0].order) + 1;
      }

      const message = await prepare('points.defaults.pointsResponse', {
        amount: this.maxSafeInteger(user.points),
        username: username,
        pointsName: await this.getPointsName(this.maxSafeInteger(user.points)),
        order, count,
      });
      sendMessage(message, opts.sender, opts.attr);
    } catch (err) {
      sendMessage(translate('points.failed.get').replace('$command', opts.command), opts.sender, opts.attr);
    }
  }

  @command('!points online')
  @default_permission(permission.CASTERS)
  async online (opts: CommandOptions) {
    try {
      let points = new Expects(opts.parameters).points({ all: false, negative: true }).toArray()[0];

      let message: string;
      if (points >= 0) {
        await getRepository(User).increment({}, 'points', points);
        message = await prepare('points.success.online.positive', {
          amount: points,
          pointsName: await this.getPointsName(points),
        });
      } else {
        points = Math.abs(points);
        await this.decrement({}, points);
        message = await prepare('points.success.online.negative', {
          amount: -points,
          pointsName: await this.getPointsName(points),
        });
      };

      sendMessage(message, opts.sender, opts.attr);
    } catch (err) {
      sendMessage(translate('points.failed.online').replace('$command', opts.command), opts.sender, opts.attr);
    }
  }

  @command('!points all')
  @default_permission(permission.CASTERS)
  async all (opts: CommandOptions) {
    try {
      let points: number = new Expects(opts.parameters).points({ all: false, negative: true }).toArray()[0];
      let message: string;
      if (points >= 0) {
        await getRepository(User).increment({}, 'points', points);
        message = await prepare('points.success.all.positive', {
          amount: points,
          pointsName: await this.getPointsName(points),
        });
      } else {
        points = Math.abs(points);
        await this.decrement({}, points);
        message = await prepare('points.success.all.negative', {
          amount: -points,
          pointsName: await this.getPointsName(points),
        });
      };

      sendMessage(message, opts.sender, opts.attr);
    } catch (err) {
      sendMessage(translate('points.failed.all').replace('$command', opts.command), opts.sender, opts.attr);
    }
  }

  @command('!makeitrain')
  @default_permission(permission.CASTERS)
  async rain (opts: CommandOptions) {
    try {
      const points = new Expects(opts.parameters).points({ all: false }).toArray()[0];

      for (const user of (await getRepository(User).find({ isOnline: true }))) {
        if (isBot(user.username)) {
          continue;
        }

        getRepository(User).increment({ userId: user.userId }, 'points', Math.floor(Math.random() * points));
      }
      const message = await prepare('points.success.rain', {
        amount: points,
        pointsName: await this.getPointsName(points),
      });
      sendMessage(message, opts.sender, opts.attr);
    } catch (err) {
      sendMessage(translate('points.failed.rain').replace('$command', opts.command), opts.sender, opts.attr);
    }
  }

  @command('!points add')
  @default_permission(permission.CASTERS)
  async add (opts: CommandOptions) {
    try {
      const [username, points] = new Expects(opts.parameters).username().points({ all: false }).toArray();

      const user = await getRepository(User).findOne({ username });

      if (!user) {
        await getRepository(User).save({
          userId: Number(await api.getIdFromTwitch(username)),
          username, points,
        });
      } else {
        await getRepository(User).save({ ...user, points: user.points + points });
      }

      const message = await prepare('points.success.add', {
        amount: points,
        username: username,
        pointsName: await this.getPointsName(points),
      });
      sendMessage(message, opts.sender, opts.attr);
    } catch (err) {
      sendMessage(translate('points.failed.add').replace('$command', opts.command), opts.sender, opts.attr);
    }
  }

  @command('!points remove')
  @default_permission(permission.CASTERS)
  async remove (opts: CommandOptions) {
    try {
      const [username, points] = new Expects(opts.parameters).username().points({ all: true }).toArray();

      const user = await getRepository(User).findOne({ username });
      if (!user) {
        await getRepository(User).save({
          userId: Number(await api.getIdFromTwitch(username)),
          username, points: 0,
        });
        this.remove(opts);
        return;
      }

      if (points === 'all') {
        await getRepository(User).save({...user, points: 0});
      } else {
        await getRepository(User).save({...user, points: Math.max(user.points - points, 0)});
      }

      const message = await prepare('points.success.remove', {
        amount: points,
        username: username,
        pointsName: await this.getPointsName(points === 'all' ? 0 : points),
      });
      sendMessage(message, opts.sender, opts.attr);
    } catch (err) {
      sendMessage(translate('points.failed.remove').replace('$command', opts.command), opts.sender, opts.attr);
    }
  }

  @command('!points')
  main (opts: CommandOptions) {
    this.get(opts);
  }

  async decrement(where: FindConditions<Readonly<Required<UserInterface>>>, points: number) {
    await getRepository(User).decrement(where, 'points', points);
    await getRepository(User).createQueryBuilder()
      .update(User)
      .set({ points: 0 })
      .where('points < 0')
      .execute();
  }
}

export default new Points();

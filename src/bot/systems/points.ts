'use strict';

import * as cronparser from 'cron-parser';
import {
  FindConditions, getConnection, getRepository, LessThanOrEqual,
} from 'typeorm';

import { MINUTE } from '../constants';
import { PointsChangelog } from '../database/entity/points';
import { User, UserInterface } from '../database/entity/user';
import {
  command, default_permission, parser, permission_settings, persistent, settings, ui,
} from '../decorators';
import {
  onChange, onLoad, onStartup,
} from '../decorators/on';
import Expects from '../expects';
import { isStreamOnline } from '../helpers/api';
import { prepare } from '../helpers/commons';
import { getAllOnlineUsernames } from '../helpers/getAllOnlineUsernames';
import {
  debug, error, warning,
} from '../helpers/log';
import { ParameterError } from '../helpers/parameterError';
import { getUserHighestPermission } from '../helpers/permissions/';
import { defaultPermissions } from '../helpers/permissions/';
import { getPointsName, name } from '../helpers/points/';
import { adminEndpoint } from '../helpers/socket';
import { isBot } from '../helpers/user/isBot';
import { getIdFromTwitch } from '../microservices/getIdFromTwitch';
import oauth from '../oauth';
import { translate } from '../translate';
import users from '../users';
import System from './_interface';

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
  @persistent()
  lastCronRun = 0;

  @settings('customization')
  name = 'point|points'; // default is <singular>|<plural> | in some languages can be set with custom <singular>|<x:multi>|<plural> where x <= 10

  @permission_settings('customization')
  interval = 10;

  @permission_settings('customization')
  perInterval = 1;

  @permission_settings('customization')
  offlineInterval = 30;

  @permission_settings('customization')
  perOfflineInterval = 1;

  @permission_settings('customization')
  messageInterval = 5;

  @permission_settings('customization')
  perMessageInterval = 1;

  @permission_settings('customization')
  messageOfflineInterval = 5;

  @permission_settings('customization')
  perMessageOfflineInterval = 0;

  @onLoad('name')
  @onChange('name')
  setPointsName() {
    name.value = this.name;
  }

  @onStartup()
  onStartup() {
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

    // cleanup all undoes (only 10minutes should be kept)
    await getRepository(PointsChangelog).delete({ updatedAt: LessThanOrEqual(Date.now() - (10 * MINUTE)) });

    const [interval, offlineInterval, perInterval, perOfflineInterval] = await Promise.all([
      this.getPermissionBasedSettingsValue('interval'),
      this.getPermissionBasedSettingsValue('offlineInterval'),
      this.getPermissionBasedSettingsValue('perInterval'),
      this.getPermissionBasedSettingsValue('perOfflineInterval'),
    ]);

    try {
      const userPromises: Promise<void>[] = [];
      debug('points.update', `Started points adding, isStreamOnline: ${isStreamOnline.value}`);
      for (const username of (await getAllOnlineUsernames())) {
        if (isBot(username)) {
          continue;
        }
        userPromises.push(this.processPoints(username, {
          interval, offlineInterval, perInterval, perOfflineInterval, isStreamOnline: isStreamOnline.value,
        }));
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

  private async processPoints(username: string, opts: {interval: {[permissionId: string]: any}; offlineInterval: {[permissionId: string]: any}; perInterval: {[permissionId: string]: any}; perOfflineInterval: {[permissionId: string]: any}; isStreamOnline: boolean}): Promise<void> {
    return new Promise(async (resolve) => {
      const userId = await users.getIdByName(username);
      if (!userId) {
        debug('points.update', `User ${username} missing userId`);
        return resolve(); // skip without id
      }

      // get user max permission
      const permId = await getUserHighestPermission(userId);
      if (!permId) {
        debug('points.update', `User ${username}#${userId} permId not found`);
        return resolve(); // skip without id
      }

      const interval_calculated = opts.isStreamOnline ? opts.interval[permId] * 60 * 1000 : opts.offlineInterval[permId]  * 60 * 1000;
      const ptsPerInterval = opts.isStreamOnline ? opts.perInterval[permId]  : opts.perOfflineInterval[permId] ;

      const user = await getRepository(User).findOne({ username });
      if (!user) {
        debug('points.update', `new user in db ${username}#${userId}[${permId}]`);
        await getRepository(User).save({
          userId,
          username,
          points:               0,
          pointsOfflineGivenAt: 0,
          pointsOnlineGivenAt:  0,
        });
      } else {
        const chat = await users.getChatOf(userId, opts.isStreamOnline);
        const userPointsKey = opts.isStreamOnline ? 'pointsOnlineGivenAt' : 'pointsOfflineGivenAt';
        if (interval_calculated !== 0 && ptsPerInterval[permId]  !== 0) {
          const givenAt = user[userPointsKey] + interval_calculated;
          debug('points.update', `${user.username}#${userId}[${permId}] ${chat} | ${givenAt}`);

          let modifier = 0;
          let userTimePoints = givenAt + interval_calculated;
          for (; userTimePoints <= chat; userTimePoints += interval_calculated) {
            modifier++;
          }
          if (modifier > 0) {
            // add points to user[userPointsKey] + interval to user to not overcalculate (this should ensure recursive add points in time)
            debug('points.update', `${user.username}#${userId}[${permId}] +${Math.floor(ptsPerInterval * modifier)}`);
            await getRepository(User).save({
              ...user,
              points:          user.points + ptsPerInterval * modifier,
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

  @parser({ fireAndForget: true, skippable: true })
  async messagePoints (opts: ParserOptions) {
    if (opts.skip || opts.message.startsWith('!')) {
      return true;
    }

    const [perMessageInterval, messageInterval, perMessageOfflineInterval, messageOfflineInterval] = await Promise.all([
      this.getPermissionBasedSettingsValue('perMessageInterval'),
      this.getPermissionBasedSettingsValue('messageInterval'),
      this.getPermissionBasedSettingsValue('perMessageOfflineInterval'),
      this.getPermissionBasedSettingsValue('messageOfflineInterval'),
    ]);

    // get user max permission
    const permId = await getUserHighestPermission(Number(opts.sender.userId));
    if (!permId) {
      return true; // skip without permission
    }

    const interval_calculated = isStreamOnline.value ? messageInterval[permId] : messageOfflineInterval[permId];
    const ptsPerInterval = isStreamOnline.value ? perMessageInterval[permId] : perMessageOfflineInterval[permId];

    if (interval_calculated === 0 || ptsPerInterval === 0) {
      return;
    }

    const user = await getRepository(User).findOne({ userId: Number(opts.sender.userId) });
    if (!user) {
      return true;
    }

    if (user.pointsByMessageGivenAt + interval_calculated <= user.messages) {
      await getRepository(User).save({
        ...user,
        points:                 user.points + ptsPerInterval,
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

  maxSafeInteger(number: number) {
    return number <= Number.MAX_SAFE_INTEGER
      ? number
      : Number.MAX_SAFE_INTEGER;
  }

  async getPointsOf(id: number | string) {
    const user = await getRepository(User).findOne({ where: { userId: Number(id) } });

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

  @command('!points undo')
  @default_permission(defaultPermissions.CASTERS)
  async undo(opts: CommandOptions) {
    try {
      const [username] = new Expects(opts.parameters).username().toArray();
      const userId = await users.getIdByName(username);
      if (!userId) {
        throw new Error(`User ${username} not found in database`);
      }

      const undoOperation = await getRepository(PointsChangelog).findOne({
        where: { userId },
        order: { updatedAt: 'DESC' },
      });
      if (!undoOperation) {
        throw new Error(`No undo operation found for ` + username);
      }

      await getRepository(PointsChangelog).delete({ id: undoOperation.id });
      await getRepository(User).update({ userId }, { points: undoOperation.originalValue });

      return [{
        response: prepare('points.success.undo', {
          username,
          command:                   undoOperation.command,
          originalValue:             undoOperation.originalValue,
          originalValuePointsLocale: getPointsName(undoOperation.originalValue),
          updatedValue:              undoOperation.updatedValue,
          updatedValuePointsLocale:  getPointsName(undoOperation.updatedValue),
        }), ...opts,
      }];
    } catch (err) {
      error(err);
      return [{ response: translate('points.failed.undo').replace('$command', opts.command), ...opts }];
    }
  }

  @command('!points set')
  @default_permission(defaultPermissions.CASTERS)
  async set (opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const [username, points] = new Expects(opts.parameters).username().points({ all: false }).toArray();

      const originalUser = await getRepository(User).findOne({ username });
      if (!originalUser) {
        throw new Error(`User ${username} not found in database.`);
      }
      await getRepository(User).update({ username }, { points });
      await getRepository(PointsChangelog).insert({
        userId:        originalUser.userId,
        updatedAt:     Date.now(),
        command:       'set',
        originalValue: originalUser.points,
        updatedValue:  points,
      });

      const response = prepare('points.success.set', {
        amount:     points,
        username,
        pointsName: getPointsName(points),
      });
      return [{ response, ...opts }];
    } catch (err) {
      error(err);
      return [{ response: translate('points.failed.set').replace('$command', opts.command), ...opts }];
    }
  }

  @command('!points give')
  async give (opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const [username, points] = new Expects(opts.parameters).username().points({ all: true }).toArray();
      if (opts.sender.username.toLowerCase() === username.toLowerCase()) {
        return [];
      }

      const guser = await getRepository(User).findOne({ username });
      const sender = await getRepository(User).findOne({ userId: Number(opts.sender.userId) });

      if (!sender) {
        throw new Error('Sender was not found in DB!');
      }

      if (!guser) {
        await getRepository(User).save({
          userId: Number(await getIdFromTwitch(username)),
          username, points: 0,
        });
        return this.give(opts);
      }

      const availablePoints = sender.points;
      if (points === 0 || points === 'all' && availablePoints === 0) {
        const response = prepare('points.failed.cannotGiveZeroPoints'.replace('$command', opts.command), {
          amount:     0,
          username,
          pointsName: getPointsName(0),
        });
        return [{ response, ...opts }];
      }

      if (points !== 'all' && availablePoints < points) {
        const response = prepare('points.failed.giveNotEnough'.replace('$command', opts.command), {
          amount:     points,
          username,
          pointsName: getPointsName(points),
        });
        return [{ response, ...opts }];
      } else if (points === 'all') {
        await getRepository(User).save([
          { ...guser, points: guser.points + availablePoints },
          { ...sender, points: 0 },
        ]);
        const response = prepare('points.success.give', {
          amount:     availablePoints,
          username,
          pointsName: getPointsName(availablePoints),
        });
        return [{ response, ...opts }];
      } else {
        await getRepository(User).save([
          { ...guser, points: guser.points + points },
          { ...sender, points: sender.points - points },
        ]);
        const response = prepare('points.success.give', {
          amount:     points,
          username,
          pointsName: getPointsName(points),
        });
        return [{ response, ...opts }];
      }
    } catch (err) {
      return [{ response: translate('points.failed.give').replace('$command', opts.command), ...opts }];
    }
  }

  @command('!points get')
  @default_permission(defaultPermissions.CASTERS)
  async get (opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const [username] = new Expects(opts.parameters).username({ optional: true, default: opts.sender.username }).toArray();

      let user: Readonly<Required<UserInterface>> | undefined;
      if (opts.sender.username === username) {
        user = await getRepository(User).findOne({ userId: Number(opts.sender.userId) });
      } else {
        user = await getRepository(User).findOne({ username });
      }

      if (!user) {
        const userId = await getIdFromTwitch(username);
        if (userId) {
          await getRepository(User).save({
            userId: Number(userId),
            username,
          });
          return this.get(opts);
        } else {
          throw new Error(`User ${username} not found on twitch`);
        }
      }

      const connection = await getConnection();
      const query = (type: typeof connection.options.type) => {
        switch(type) {
          case 'postgres':
          case 'better-sqlite3':
            return `SELECT COUNT(*) as "order" FROM "user" WHERE "points" > (SELECT "points" FROM "user" WHERE "userId"=${user?.userId}) AND "username"!='${oauth.broadcasterUsername}'`;
          case 'mysql':
          case 'mariadb':
          default:
            return `SELECT COUNT(*) as \`order\` FROM \`user\` WHERE \`points\` > (SELECT \`points\` FROM \`user\` WHERE \`userId\`=${user?.userId}) AND "username"!='${oauth.broadcasterUsername}'`;
        }
      };

      const orderQuery = await getRepository(User).query(query(connection.options.type));
      const count = await getRepository(User).count();

      let order: number | string = '?';
      if (orderQuery.length > 0) {
        order = Number(orderQuery[0].order) + 1;
      }

      if (user.username === oauth.broadcasterUsername) {
        order = '?'; // broadcaster is removed from ordering
      }

      const response = prepare('points.defaults.pointsResponse', {
        amount:     this.maxSafeInteger(user.points),
        username:   username,
        pointsName: getPointsName(this.maxSafeInteger(user.points)),
        order, count,
      });
      return [{ response, ...opts }];
    } catch (err) {
      if (!(err instanceof ParameterError)) {
        error(err.stack);
      }
      return [{ response: translate('points.failed.get').replace('$command', opts.command), ...opts }];
    }
  }

  @command('!points online')
  @default_permission(defaultPermissions.CASTERS)
  async online (opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      let points = new Expects(opts.parameters).points({ all: false, negative: true }).toArray()[0];

      let response: string;
      if (points >= 0) {
        await getRepository(User).increment({}, 'points', points);
        response = prepare('points.success.online.positive', {
          amount:     points,
          pointsName: getPointsName(points),
        });
      } else {
        points = Math.abs(points);
        await this.decrement({}, points);
        response = prepare('points.success.online.negative', {
          amount:     -points,
          pointsName: getPointsName(points),
        });
      }

      return [{ response, ...opts }];
    } catch (err) {
      return [{ response: translate('points.failed.online').replace('$command', opts.command), ...opts }];
    }
  }

  @command('!points all')
  @default_permission(defaultPermissions.CASTERS)
  async all (opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      let points: number = new Expects(opts.parameters).points({ all: false, negative: true }).toArray()[0];
      let response: string;
      if (points >= 0) {
        await getRepository(User).increment({}, 'points', points);
        response = prepare('points.success.all.positive', {
          amount:     points,
          pointsName: getPointsName(points),
        });
      } else {
        points = Math.abs(points);
        await this.decrement({}, points);
        response = prepare('points.success.all.negative', {
          amount:     -points,
          pointsName: getPointsName(points),
        });
      }

      return [{ response, ...opts }];
    } catch (err) {
      return [{ response: translate('points.failed.all').replace('$command', opts.command), ...opts }];
    }
  }

  @command('!makeitrain')
  @default_permission(defaultPermissions.CASTERS)
  async rain (opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const points = new Expects(opts.parameters).points({ all: false }).toArray()[0];

      for (const user of (await getRepository(User).find({ isOnline: true }))) {
        if (isBot(user.username)) {
          continue;
        }

        getRepository(User).increment({ userId: user.userId }, 'points', Math.floor(Math.random() * points));
      }
      const response = prepare('points.success.rain', {
        amount:     points,
        pointsName: getPointsName(points),
      });
      return [{ response, ...opts }];
    } catch (err) {
      return [{ response: translate('points.failed.rain').replace('$command', opts.command), ...opts }];
    }
  }

  @command('!points add')
  @default_permission(defaultPermissions.CASTERS)
  async add (opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const [username, points] = new Expects(opts.parameters).username().points({ all: false }).toArray();

      const user = await getRepository(User).findOne({ username });

      if (!user) {
        await getRepository(User).save({
          userId: Number(await getIdFromTwitch(username)),
          username,
        });
        return this.add(opts);
      } else {
        await getRepository(User).save({ ...user, points: user.points + points });
      }

      await getRepository(PointsChangelog).insert({
        userId:        user.userId,
        command:       'add',
        originalValue: user.points,
        updatedValue:  user.points + points,
        updatedAt:     Date.now(),
      });

      const response = prepare('points.success.add', {
        amount:     points,
        username:   username,
        pointsName: getPointsName(points),
      });
      return [{ response, ...opts }];
    } catch (err) {
      return [{ response: translate('points.failed.add').replace('$command', opts.command), ...opts }];
    }
  }

  @command('!points remove')
  @default_permission(defaultPermissions.CASTERS)
  async remove (opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const [username, points] = new Expects(opts.parameters).username().points({ all: true }).toArray();

      const user = await getRepository(User).findOne({ username });
      if (!user) {
        await getRepository(User).save({
          userId: Number(await getIdFromTwitch(username)),
          username, points: 0,
        });
        return this.remove(opts);
      }

      if (points === 'all') {
        await getRepository(User).save({ ...user, points: 0 });
      } else {
        await getRepository(User).save({ ...user, points: Math.max(user.points - points, 0) });
      }

      await getRepository(PointsChangelog).insert({
        userId:        user.userId,
        command:       'remove',
        originalValue: user.points,
        updatedValue:  points === 'all' ? 0 : Math.max(user.points - points, 0),
        updatedAt:     Date.now(),
      });

      const response = prepare('points.success.remove', {
        amount:     points,
        username:   username,
        pointsName: getPointsName(points === 'all' ? 0 : points),
      });
      return [{ response, ...opts }];
    } catch (err) {
      error(err);
      return [{ response: translate('points.failed.remove').replace('$command', opts.command), ...opts }];
    }
  }

  @command('!points')
  async main (opts: CommandOptions): Promise<CommandResponse[]> {
    return this.get(opts);
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

'use strict';

import * as _ from 'lodash';
import { evaluate as mathJsEvaluate } from 'mathjs';
import { ResponseError } from '../helpers/commandError';

import { isBot, prepare } from '../commons';
import { command, default_permission, parser, permission_settings, settings, ui } from '../decorators';
import System from './_interface';
import { debug, error } from '../helpers/log';
import { getRepository } from 'typeorm';
import { User, UserInterface } from '../database/entity/user';
import { getAllOnlineUsernames } from '../helpers/getAllOnlineUsernames';
import { onStartup } from '../decorators/on';
import permissions from '../permissions';
import api from '../api';
import users from '../users';
import { MINUTE, SECOND } from '../constants';
import { setImmediateAwait } from '../helpers/setImmediateAwait';
import { translate } from '../translate';
import Expects from '../expects';
import { permission } from '../helpers/permissions';
import points from './points';
import { adminEndpoint } from '../helpers/socket';

class Levels extends System {
  @settings('conversion')
  conversionRate = 10;

  @settings('levels')
  firstLevelStartsAt = 100;

  @settings('levels')
  nextLevelFormula = '$prevLevelXP + ($prevLevelXP * 1.5)';

  @ui({ type: 'levels-showcase', emit: 'getLevelsExample' }, 'levels')
  levelShowcase = null;
  @ui({
    type: 'helpbox',
  }, 'levels')
  levelShowcaseHelp = null;

  @settings('xp')
  xpName = 'XP';

  @permission_settings('xp')
  interval = 10;

  @permission_settings('xp')
  perInterval = 10;

  @permission_settings('xp')
  offlineInterval = 0;

  @permission_settings('xp')
  perOfflineInterval = 0;

  @permission_settings('xp')
  messageInterval = 5;

  @permission_settings('xp')
  perMessageInterval = 1;

  @permission_settings('xp')
  messageOfflineInterval = 0;

  @permission_settings('xp')
  perMessageOfflineInterval = 0;

  sockets () {
    adminEndpoint(this.nsp, 'getLevelsExample', (cb) => {
      try {
        const levels = [`${this.firstLevelStartsAt} ${this.xpName}`];
        for (let i = 2; i < 9; i++) {
          const xp = this.getNextLevelXP(levels.length);
          if (xp <= 0) {
            levels.push(`Something went wrong with calculation, this level have lower XP than previous.`);
            break;
          }
          levels.push(`${xp} ${this.xpName}`);
        }
        cb(null, levels);
      } catch (e) {
        cb(e.stack, []);
      }
    });
  }

  @onStartup()
  async update () {
    if (!this.enabled) {
      debug('levels.update', 'Disabled, next check in 5s');
      setTimeout(() => this.update(), 5 * SECOND);
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
      debug('levels.update', `Started XP adding, isOnline: ${isOnline}`);
      let i = 0;
      for (const username of (await getAllOnlineUsernames())) {
        if (isBot(username)) {
          continue;
        }
        await this.process(username, { interval, offlineInterval, perInterval, perOfflineInterval, isOnline });
        if ( i % 10 === 0) {
          await setImmediateAwait();
        }
        i++;
      }
    } catch (e) {
      error(e);
      error(e.stack);
    } finally {
      debug('levels.update', 'Finished xp adding, triggering next check in 60s');
      setTimeout(() => this.update(), MINUTE);
    }
  }

  private async process(username: string, opts: {interval: {[permissionId: string]: any}; offlineInterval: {[permissionId: string]: any}; perInterval: {[permissionId: string]: any}; perOfflineInterval: {[permissionId: string]: any}; isOnline: boolean}): Promise<void> {
    const userId = await users.getIdByName(username);
    if (!userId) {
      debug('levels.update', `User ${username} missing userId`);
      return; // skip without id
    }

    // get user max permission
    const permId = await permissions.getUserHighestPermission(userId);
    if (!permId) {
      debug('levels.update', `User ${username}#${userId} permId not found`);
      return; // skip without id
    }

    const interval_calculated = opts.isOnline ? opts.interval[permId] * 60 * 1000 : opts.offlineInterval[permId]  * 60 * 1000;
    const ptsPerInterval = opts.isOnline ? opts.perInterval[permId]  : opts.perOfflineInterval[permId] ;

    const user = await getRepository(User).findOne({ username });
    if (!user) {
      debug('levels.update', `new user in db ${username}#${userId}[${permId}]`);
      await getRepository(User).save({
        userId,
        username,
      });
    } else {
      const chat = await users.getChatOf(userId, opts.isOnline);
      if (interval_calculated !== 0 && ptsPerInterval[permId] !== 0) {
        const givenAt = opts.isOnline
          ? user.extra.levels?.xpOnlineGivenAt ?? chat
          : user.extra.levels?.xpOfflineGivenAt ?? chat;
        debug('levels.update', `${user.username}#${userId}[${permId}] ${chat} | ${givenAt}`);
        if (givenAt + interval_calculated <= chat) {
          // add xp to givenAt + interval to user to not overcalculate (this should ensure recursive add xp in time)
          const userTimeXP = givenAt + interval_calculated;
          debug('levels.update', `${user.username}#${userId}[${permId}] +${Math.floor(ptsPerInterval)}`);
          const levels: UserInterface['extra']['levels'] = {
            xp: Math.floor(ptsPerInterval + user.extra.levels?.xp),
            xpOfflineGivenAt: !opts.isOnline ? userTimeXP : user.extra.levels?.xpOfflineGivenAt ?? chat,
            xpOnlineGivenAt:   opts.isOnline ? userTimeXP : user.extra.levels?.xpOnlineGivenAt ?? chat,
            xpByMessageGivenAt: user.extra.levels?.xpByMessageGivenAt ?? user.messages,
          };
          await getRepository(User).save({
            ...user,
            extra: {
              ...user.extra,
              levels,
            },
          });
        }
      } else {
        const levels: UserInterface['extra']['levels'] = {
          xp: Math.floor(ptsPerInterval + user.extra.levels?.xp),
          xpOfflineGivenAt: !opts.isOnline ? chat : user.extra.levels?.xpOfflineGivenAt ?? chat,
          xpOnlineGivenAt:   opts.isOnline ? chat : user.extra.levels?.xpOnlineGivenAt ?? chat,
          xpByMessageGivenAt: user.extra.levels?.xpByMessageGivenAt ?? user.messages,
        };
        await getRepository(User).save({
          ...user,
          extra: {
            ...user.extra,
            levels,
          },
        });
        debug('levels.update', `${user.username}#${userId}[${permId}] levels disabled or interval is 0, settint levels time to chat`);
      }
    }
  }

  @parser({ fireAndForget: true })
  async messageXP (opts: ParserOptions) {
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
    const permId = await permissions.getUserHighestPermission(Number(opts.sender.userId));
    if (!permId) {
      return true; // skip without permission
    }

    const interval_calculated = isOnline ? messageInterval[permId] : messageOfflineInterval[permId];
    const ptsPerInterval = isOnline ? perMessageInterval[permId] : perMessageOfflineInterval[permId];

    if (interval_calculated === 0 || ptsPerInterval === 0) {
      return;
    }

    const user = await getRepository(User).findOne({ userId: Number(opts.sender.userId) });
    if (!user) {
      return true;
    }

    const xpByMessageGivenAt = user.extra.levels?.xpByMessageGivenAt ?? 0;
    if (xpByMessageGivenAt + interval_calculated <= user.messages) {
      const chat = await users.getChatOf(user.userId, api.isStreamOnline);
      const levels: UserInterface['extra']['levels'] = {
        xp: Math.floor(ptsPerInterval + (user.extra.levels?.xp ?? 0)),
        xpOfflineGivenAt: user.extra.levels?.xpOfflineGivenAt ?? chat,
        xpOnlineGivenAt: user.extra.levels?.xpOnlineGivenAt ?? chat,
        xpByMessageGivenAt: user.messages,
      };
      await getRepository(User).save({
        ...user,
        extra: {
          ...user.extra,
          levels,
        },
      });
    }
    return true;
  }

  getNextLevelXP(level: number) {
    let prevLevelXP = this.firstLevelStartsAt;
    if (level === 0) {
      return this.firstLevelStartsAt;
    }

    for (let i = 1; i <= level; i++) {
      const formula = Number(mathJsEvaluate(this.nextLevelFormula
        .replace(/\$prevLevelXP/g, String(prevLevelXP))
        .replace(/\$prevLevel/g, String(i))
      ));
      if (formula <= prevLevelXP) {
        error('Next level cannot be equal or less than previous level');
        return 0;
      }
      prevLevelXP = formula;
    }
    return Math.max(Math.floor(prevLevelXP), 0);
  }

  getLevelOf(user: UserInterface | undefined): number {
    if (!user) {
      return 0;
    }

    const currentXP = user.extra.levels?.xp ?? 0;

    if (currentXP < this.firstLevelStartsAt) {
      return 0;
    }

    let levelXP = this.firstLevelStartsAt;
    let level = 1;
    for (; currentXP > 0; level++) {
      if (level > 1) {
        const formula = Number(mathJsEvaluate(this.nextLevelFormula
          .replace(/\$prevLevelXP/g, String(levelXP))
          .replace(/\$prevLevel/g, String(level))
        ));
        levelXP = Math.floor(formula);
        if (formula === 0) {
          error('Formula of level calculation is returning 0, please adjust.');
          return 0;
        }
      }
      if (currentXP < levelXP) {
        level--;
        break;
      }
    }
    return level;
  }

  @command('!level buy')
  async buy (opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      if (!points.enabled) {
        throw new Error('Point system disabled.');
      }

      const user = await getRepository(User).findOneOrFail({ userId: Number(opts.sender.userId) });
      const availablePoints = user.points;
      const currentLevel = this.getLevelOf(user);
      const xp = this.getNextLevelXP(currentLevel);
      const xpNeeded = xp - (user.extra.levels?.xp ?? 0);
      const neededPoints = xpNeeded * this.conversionRate;

      if (neededPoints >= availablePoints) {
        throw new ResponseError(
          prepare('systems.levels.notEnoughPointsToBuy', {
            points: neededPoints,
            pointsName: points.getPointsName(neededPoints),
            amount: xpNeeded,
            level: currentLevel + 1,
            xpName: this.xpName,
          })
        );
      }

      const chat = await users.getChatOf(user.userId, api.isStreamOnline);
      const levels: UserInterface['extra']['levels'] = {
        xp,
        xpOfflineGivenAt: user.extra.levels?.xpOfflineGivenAt ?? chat,
        xpOnlineGivenAt: user.extra.levels?.xpOnlineGivenAt ?? chat,
        xpByMessageGivenAt: user.extra.levels?.xpByMessageGivenAt ?? user.messages,
      };
      await getRepository(User).save({
        ...user,
        points: user.points - neededPoints,
        extra: {
          ...user.extra,
          levels,
        },
      });

      const response = prepare('systems.levels.XPBoughtByPoints', {
        points: neededPoints,
        pointsName: points.getPointsName(neededPoints),
        level: currentLevel + 1,
        amount: xpNeeded,
        xpName: this.xpName,
      });
      return [{ response, ...opts }];
    } catch (e) {
      if (e instanceof ResponseError) {
        return [{
          response: e.message, ...opts,
        }];
      } else {
        if (e.message === 'Point system disabled.') {
          error(e.message);
        }
        return [{ response: translate('systems.levels.somethingGetWrong').replace('$command', opts.command), ...opts }];
      }
    }
  }

  @command('!level change')
  @default_permission(permission.CASTERS)
  async add (opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const [username, xp] = new Expects(opts.parameters).username().number({ minus: true }).toArray();
      const user = await getRepository(User).findOneOrFail({ username });
      const chat = await users.getChatOf(user.userId, api.isStreamOnline);

      const levels: UserInterface['extra']['levels'] = {
        xp: Math.max(Math.floor(xp + (user.extra.levels?.xp ?? 0)), 0),
        xpOfflineGivenAt: user.extra.levels?.xpOfflineGivenAt ?? chat,
        xpOnlineGivenAt: user.extra.levels?.xpOnlineGivenAt ?? chat,
        xpByMessageGivenAt: user.extra.levels?.xpByMessageGivenAt ?? user.messages,
      };
      await getRepository(User).save({
        ...user,
        extra: {
          ...user.extra,
          levels,
        },
      });

      const response = prepare('systems.levels.changeXP', {
        username,
        amount: xp,
        xpName: this.xpName,
      });
      return [{ response, ...opts }];
    } catch (e) {
      return [{ response: translate('systems.levels.somethingGetWrong').replace('$command', opts.command), ...opts }];
    }
  }

  @command('!level')
  async main (opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const [username] = new Expects(opts.parameters).username({ optional: true, default: opts.sender.username }).toArray();
      const user = await getRepository(User).findOneOrFail({ username });

      let currentLevel = 0;
      let nextXP = this.firstLevelStartsAt;
      let currentXP = 0;

      if (user.extra.levels) {
        currentXP = user.extra.levels?.xp ?? 0;
        currentLevel = await this.getLevelOf(user);
        nextXP = await this.getNextLevelXP(currentLevel);
      }

      const response = prepare('systems.levels.currentLevel', {
        username,
        currentLevel,
        nextXP: Math.max(nextXP - currentXP, 0),
        currentXP,
        xpName: this.xpName,
      });
      return [{ response, ...opts }];
    } catch (e) {
      return [{ response: translate('systems.levels.somethingGetWrong').replace('$command', opts.command), ...opts }];
    }
  }
}

export default new Levels();

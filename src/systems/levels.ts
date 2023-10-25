import { User, UserInterface } from '@entity/user.js';
import { MINUTE, SECOND } from '@sogebot/ui-helpers/constants.js';
import { format } from '@sogebot/ui-helpers/number.js';
import { evaluate as mathJsEvaluate, round } from 'mathjs';

import System from './_interface.js';
import { onStartup } from '../decorators/on.js';
import {
  command, default_permission, parser, permission_settings, settings, ui,
} from '../decorators.js';
import { Expects } from  '../expects.js';
import general from '../general.js';
import users from '../users.js';

import { AppDataSource } from '~/database.js';
import { isStreamOnline } from '~/helpers/api/index.js';
import { ResponseError } from '~/helpers/commandError.js';
import { prepare } from '~/helpers/commons/index.js';
import { getAllOnlineIds } from '~/helpers/getAllOnlineUsernames.js';
import { debug, error } from '~/helpers/log.js';
import defaultPermissions from '~/helpers/permissions/defaultPermissions.js';
import { getUserHighestPermission } from '~/helpers/permissions/getUserHighestPermission.js';
import { getPointsName } from '~/helpers/points/index.js';
import { setImmediateAwait } from '~/helpers/setImmediateAwait.js';
import { adminEndpoint } from '~/helpers/socket.js';
import {
  bigIntMax, serialize, unserialize,
} from '~/helpers/type.js';
import * as changelog from '~/helpers/user/changelog.js';
import { isBotId } from '~/helpers/user/isBot.js';
import { translate } from '~/translate.js';

let cachedLevelsHash = '';
const cachedLevels: bigint[] = [];

class Levels extends System {
  @settings('conversion')
    conversionRate = 10;

  @settings('levels')
    firstLevelStartsAt = 100;

  @settings('levels')
    nextLevelFormula = '$prevLevelXP + ($prevLevelXP * 1.5)';

  @ui({ type: 'levels-showcase', emit: 'getLevelsExample' }, 'levels')
    levelShowcase = null;
  @ui({ type: 'helpbox' }, 'levels')
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
    adminEndpoint('/systems/levels', 'getLevelsExample', (data, cb) => {
      try {
        const firstLevelStartsAt = typeof data === 'function' ? this.firstLevelStartsAt : data.firstLevelStartsAt;
        const nextLevelFormula = typeof data === 'function' ? this.nextLevelFormula : data.nextLevelFormula;
        const xpName = typeof data === 'function' ? this.xpName : data.xpName;
        const levels = [];
        for (let i = 1; i <= 21; i++) {
          levels.push(this.getLevelXP(i, BigInt(firstLevelStartsAt), nextLevelFormula, true));
        }
        (typeof data === 'function' ? data : cb!)(null, levels.map(xp => `${Intl.NumberFormat(general.lang).format(xp)} ${xpName}`));
      } catch (e: any) {
        (typeof data === 'function' ? data : cb!)(e, []);
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

    const [interval, offlineInterval, perInterval, perOfflineInterval] = await Promise.all([
      this.getPermissionBasedSettingsValue('interval'),
      this.getPermissionBasedSettingsValue('offlineInterval'),
      this.getPermissionBasedSettingsValue('perInterval'),
      this.getPermissionBasedSettingsValue('perOfflineInterval'),
    ]);

    try {
      debug('levels.update', `Started XP adding, isOnline: ${isStreamOnline.value}`);
      let i = 0;
      for (const userId of (await getAllOnlineIds())) {
        if (isBotId(userId)) {
          continue;
        }
        await this.process(userId, {
          interval, offlineInterval, perInterval, perOfflineInterval, isOnline: isStreamOnline.value,
        });
        if ( i % 10 === 0) {
          await setImmediateAwait();
        }
        i++;
      }
    } catch (e: any) {
      error(e);
      error(e.stack);
    } finally {
      debug('levels.update', 'Finished xp adding, triggering next check in 60s');
      setTimeout(() => this.update(), MINUTE);
    }
  }

  getLevelFromCache(levelFromCache: number) {
    const hash = `${this.nextLevelFormula} + ${this.firstLevelStartsAt}`;
    if (hash !== cachedLevelsHash) {
      cachedLevelsHash = hash;
      cachedLevels.length = 0;
      // level 0
      cachedLevels.push(BigInt(0));
    }

    if (!cachedLevels[levelFromCache]) {
      // recalculate from level (length is +1 as we start with level 0)
      let level = cachedLevels.length;

      if (levelFromCache >= 1) {
        for (; level <= levelFromCache; level++) {
          const xp = this.getLevelXP(level, undefined, undefined, true);
          debug('levels.update', `Recalculating level ${level} - ${xp} XP`);
          cachedLevels.push(xp);
        }
      }
    }
    return cachedLevels[levelFromCache];
  }

  private async process(userId: string, opts: {interval: {[permissionId: string]: any}; offlineInterval: {[permissionId: string]: any}; perInterval: {[permissionId: string]: any}; perOfflineInterval: {[permissionId: string]: any}; isOnline: boolean}): Promise<void> {
    const user = await changelog.get(userId);
    if (!user) {
      // user is not existing in db, skipping
      return;
    }

    // get user max permission
    const permId = await getUserHighestPermission(userId);
    if (!permId) {
      debug('levels.update', `User ${user.userName}#${userId} permId not found`);
      return; // skip without id
    }

    const interval_calculated = opts.isOnline ? opts.interval[permId] * 60 * 1000 : opts.offlineInterval[permId]  * 60 * 1000;
    const ptsPerInterval = opts.isOnline ? opts.perInterval[permId]  : opts.perOfflineInterval[permId] ;

    const chat = await users.getChatOf(userId, true);
    const chatOffline = await users.getChatOf(userId, false);

    // we need to save if extra.levels are not defined
    if (typeof user.extra?.levels === 'undefined') {
      debug('levels.update', `${user.userName}#${userId}[${permId}] -- initial data --`);
      const levels: NonNullable<UserInterface['extra']>['levels'] = {
        xp:                serialize(BigInt(0)),
        xpOfflineGivenAt:  chatOffline,
        xpOfflineMessages: 0,
        xpOnlineGivenAt:   chat,
        xpOnlineMessages:  0,
      };
      changelog.update(user.userId,
        {
          extra: {
            ...user.extra,
            levels,
          },
        });
    }

    if (interval_calculated !== 0 && ptsPerInterval[permId] !== 0) {
      const givenAt = opts.isOnline
        ? user.extra?.levels?.xpOnlineGivenAt ?? chat
        : user.extra?.levels?.xpOfflineGivenAt ?? chat;
      debug('levels.update', `${user.userName}#${userId}[${permId}] ${chat} | ${givenAt}`);
      let modifier = 0;
      let userTimeXP = givenAt + interval_calculated;
      for (; userTimeXP <= chat; userTimeXP += interval_calculated) {
        modifier++;
      }

      if (modifier > 0) {
        debug('levels.update', `${user.userName}#${userId}[${permId}] +${Math.floor(ptsPerInterval * modifier)}`);
        const levels: NonNullable<UserInterface['extra']>['levels'] = {
          xp:                serialize(BigInt(Math.floor(ptsPerInterval * modifier)) + (unserialize<bigint>(user.extra?.levels?.xp) ?? BigInt(0))),
          xpOfflineGivenAt:  !opts.isOnline ? userTimeXP : user.extra?.levels?.xpOfflineGivenAt ?? chatOffline,
          xpOfflineMessages: user.extra?.levels?.xpOfflineMessages ?? 0,
          xpOnlineGivenAt:   opts.isOnline ? userTimeXP : user.extra?.levels?.xpOnlineGivenAt ?? chat,
          xpOnlineMessages:  user.extra?.levels?.xpOnlineMessages ?? 0,
        };
        changelog.update(user.userId,
          {
            extra: {
              ...user.extra,
              levels,
            },
          });
      }
    } else {
      const levels: NonNullable<UserInterface['extra']>['levels'] = {
        xp:                serialize(BigInt(ptsPerInterval) + (unserialize<bigint>(user.extra?.levels?.xp) ?? BigInt(0))),
        xpOfflineGivenAt:  !opts.isOnline ? chat : user.extra?.levels?.xpOfflineGivenAt ?? chat,
        xpOfflineMessages: user.extra?.levels?.xpOfflineMessages ?? 0,
        xpOnlineGivenAt:   opts.isOnline ? chat : user.extra?.levels?.xpOnlineGivenAt ?? chat,
        xpOnlineMessages:  user.extra?.levels?.xpOnlineMessages ?? 0,
      };
      changelog.update(user.userId,
        {
          extra: {
            ...user.extra,
            levels,
          },
        });
      debug('levels.update', `${user.userName}#${userId}[${permId}] levels disabled or interval is 0, settint levels time to chat`);
    }

  }

  @parser({ fireAndForget: true })
  async messageXP (opts: ParserOptions) {
    if (!opts.sender ||opts.skip || opts.message.startsWith('!')) {
      return true;
    }

    const [perMessageInterval, messageInterval, perMessageOfflineInterval, messageOfflineInterval] = await Promise.all([
      this.getPermissionBasedSettingsValue('perMessageInterval'),
      this.getPermissionBasedSettingsValue('messageInterval'),
      this.getPermissionBasedSettingsValue('perMessageOfflineInterval'),
      this.getPermissionBasedSettingsValue('messageOfflineInterval'),
    ]);

    // get user max permission
    const permId = await getUserHighestPermission(opts.sender.userId);
    if (!permId) {
      return true; // skip without permission
    }

    const interval_calculated = isStreamOnline.value ? messageInterval[permId] : messageOfflineInterval[permId];
    const ptsPerInterval = isStreamOnline.value ? perMessageInterval[permId] : perMessageOfflineInterval[permId];

    if (interval_calculated === 0 || ptsPerInterval === 0) {
      return true;
    }

    const user = await changelog.get(opts.sender.userId);
    if (!user) {
      return true;
    }

    // next message count (be it offline or online)
    const messages = 1 + ((isStreamOnline.value
      ? user.extra?.levels?.xpOnlineMessages
      : user.extra?.levels?.xpOfflineMessages) ?? 0);
    const chat = await users.getChatOf(user.userId, isStreamOnline.value);

    // default level object
    const levels: NonNullable<UserInterface['extra']>['levels'] = {
      xp:                serialize(unserialize<bigint>(user.extra?.levels?.xp) ?? BigInt(0)),
      xpOfflineGivenAt:  user.extra?.levels?.xpOfflineGivenAt ?? chat,
      xpOfflineMessages: !isStreamOnline.value
        ? 0
        : user.extra?.levels?.xpOfflineMessages ?? 0,
      xpOnlineGivenAt:  user.extra?.levels?.xpOnlineGivenAt ?? chat,
      xpOnlineMessages: isStreamOnline.value
        ? 0
        : user.extra?.levels?.xpOnlineMessages ?? 0,
    };

    if (messages >= interval_calculated) {
      // add xp and set offline/online messages to 0
      changelog.update(user.userId,
        {
          extra: {
            ...user.extra,
            levels: {
              ...levels,
              [isStreamOnline.value ? 'xpOnlineMessages' : 'xpOfflineMessages']: 0,
              xp:                                                                serialize(BigInt(ptsPerInterval) + (unserialize<bigint>(user.extra?.levels?.xp) ?? BigInt(0))),
            },
          },
        });
    } else {
      changelog.update(user.userId,
        {
          extra: {
            ...user.extra,
            levels: {
              ...levels,
              [isStreamOnline.value ? 'xpOnlineMessages' : 'xpOfflineMessages']: messages,
            },
          },
        });
    }
    return true;
  }

  getLevelXP(level: number, firstLevelStartsAt = BigInt(this.firstLevelStartsAt), nextLevelFormula = this.nextLevelFormula, calculate = false) {
    let prevLevelXP = firstLevelStartsAt;

    if (level === 0) {
      return BigInt(0);
    }
    if (level === 1) {
      return firstLevelStartsAt;
    }

    for (let i = 1; i < level; i++) {
      const expr = nextLevelFormula
        .replace(/\$prevLevelXP/g, String(prevLevelXP))
        .replace(/\$prevLevel/g, String(i));
      const formula = !calculate
        ? this.getLevelFromCache(i + 1)
        : BigInt(round(mathJsEvaluate(expr)));
      if (formula <= prevLevelXP && i > 1) {
        error('Next level cannot be equal or less than previous level');
        return BigInt(0);
      }
      prevLevelXP = formula;
    }
    return bigIntMax(prevLevelXP, BigInt(0));
  }

  getLevelOf(user: UserInterface | null): number {
    if (!user) {
      return 0;
    }

    const currentXP = unserialize<bigint>(user.extra?.levels?.xp) ?? BigInt(0);

    if (currentXP < this.firstLevelStartsAt) {
      return 0;
    }

    let levelXP = BigInt(this.firstLevelStartsAt);
    let level = 1;
    for (; currentXP > 0; level++) {
      if (level > 1) {
        const formula = this.getLevelFromCache(level);
        levelXP = formula;
        if (formula === BigInt(0)) {
          error('Formula of level calculation is returning 0, please adjust.');
          return 0;
        }
      }
      if (BigInt(currentXP) < levelXP) {
        level--;
        break;
      }
    }
    return level;
  }

  @command('!level buy')
  async buy (opts: CommandOptions): Promise<CommandResponse[]> {
    const points = (await import('../systems/points.js')).default;
    try {
      if (!points.enabled) {
        throw new Error('Point system disabled.');
      }

      const user = await changelog.getOrFail(opts.sender.userId);
      const availablePoints = user.points;
      const currentLevel = this.getLevelOf(user);
      const xp = this.getLevelXP(currentLevel + 1);
      const xpNeeded = xp - (unserialize<bigint>(user.extra?.levels?.xp) ?? BigInt(0));
      const neededPoints = Number(xpNeeded * BigInt(this.conversionRate));

      if (neededPoints >= availablePoints) {
        throw new ResponseError(
          prepare('systems.levels.notEnoughPointsToBuy', {
            points:     format(general.numberFormat, 0)(neededPoints),
            pointsName: getPointsName(neededPoints),
            amount:     xpNeeded,
            level:      currentLevel + 1,
            xpName:     this.xpName,
          }),
        );
      }

      const chat = await users.getChatOf(user.userId, isStreamOnline.value);
      const levels: NonNullable<UserInterface['extra']>['levels'] = {
        xp:                serialize(xp),
        xpOfflineGivenAt:  user.extra?.levels?.xpOfflineGivenAt ?? chat,
        xpOfflineMessages: user.extra?.levels?.xpOfflineMessages ?? 0,
        xpOnlineGivenAt:   user.extra?.levels?.xpOnlineGivenAt ?? chat,
        xpOnlineMessages:  user.extra?.levels?.xpOnlineMessages ?? 0,
      };
      changelog.update(user.userId,
        {
          points: user.points - neededPoints,
          extra:  {
            ...user.extra,
            levels,
          },
        });

      const response = prepare('systems.levels.XPBoughtByPoints', {
        points:     format(general.numberFormat, 0)(neededPoints),
        pointsName: getPointsName(neededPoints),
        level:      currentLevel + 1,
        amount:     xpNeeded,
        xpName:     this.xpName,
      });
      return [{ response, ...opts }];
    } catch (e: any) {
      if (e instanceof ResponseError) {
        return [{ response: e.message, ...opts }];
      } else {
        if (e.message === 'Point system disabled.') {
          error(e.stack);
        }
        return [{ response: translate('systems.levels.somethingGetWrong').replace('$command', opts.command), ...opts }];
      }
    }
  }

  @command('!level change')
  @default_permission(defaultPermissions.CASTERS)
  async add (opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const [userName, xp] = new Expects(opts.parameters).username().number({ minus: true }).toArray();
      await changelog.flush();
      const user = await AppDataSource.getRepository(User).findOneByOrFail({ userName });
      const chat = await users.getChatOf(user.userId, isStreamOnline.value);

      const levels: NonNullable<UserInterface['extra']>['levels'] = {
        xp:                serialize(bigIntMax(BigInt(xp) + (unserialize<bigint>(user.extra?.levels?.xp) ?? BigInt(0)), BigInt(0))),
        xpOfflineGivenAt:  user.extra?.levels?.xpOfflineGivenAt ?? chat,
        xpOfflineMessages: user.extra?.levels?.xpOfflineMessages ?? 0,
        xpOnlineGivenAt:   user.extra?.levels?.xpOnlineGivenAt ?? chat,
        xpOnlineMessages:  user.extra?.levels?.xpOnlineMessages ?? 0,
      };
      changelog.update(user.userId,
        {
          extra: {
            ...user.extra,
            levels,
          },
        });

      const response = prepare('systems.levels.changeXP', {
        userName,
        amount: xp,
        xpName: this.xpName,
      });
      return [{ response, ...opts }];
    } catch (e: any) {
      return [{ response: translate('systems.levels.somethingGetWrong').replace('$command', opts.command), ...opts }];
    }
  }

  @command('!level')
  async main (opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const [userName] = new Expects(opts.parameters).username({ optional: true, default: opts.sender.userName }).toArray();
      await changelog.flush();
      const user = await AppDataSource.getRepository(User).findOneByOrFail({ userName });

      let currentLevel = this.firstLevelStartsAt === 0 ? 1 : 0;
      let nextXP = await this.getLevelXP(currentLevel + 1);
      let currentXP = BigInt(0);

      if (user.extra?.levels) {
        currentXP = unserialize<bigint>(user.extra?.levels.xp) ?? BigInt(0);
        currentLevel = this.getLevelOf(user);
        nextXP = await this.getLevelXP(currentLevel + 1);
      }

      const response = prepare('systems.levels.currentLevel', {
        userName,
        currentLevel,
        nextXP: bigIntMax(nextXP - currentXP, BigInt(0)),
        currentXP,
        xpName: this.xpName,
      });
      return [{ response, ...opts }];
    } catch (e: any) {
      return [{ response: translate('systems.levels.somethingGetWrong').replace('$command', opts.command), ...opts }];
    }
  }
}

export default new Levels();

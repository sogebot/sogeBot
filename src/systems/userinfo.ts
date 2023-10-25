import {
  User, UserBit, UserTip,
} from '@entity/user.js';
import { dayjs, timezone } from '@sogebot/ui-helpers/dayjsHelper.js';
import { getLocalizedName } from '@sogebot/ui-helpers/getLocalized.js';
import { format } from '@sogebot/ui-helpers/number.js';

import System from './_interface.js';
import levels from './levels.js';
import points from './points.js';
import ranks from './ranks.js';
import { dateDiff } from '../commons.js';
import {
  command, default_permission, settings,
} from '../decorators.js';
import { Expects } from  '../expects.js';
import general from '../general.js';
import { isFollowerUpdate } from '../services/twitch/calls/isFollowerUpdate.js';
import users from '../users.js';

import { AppDataSource } from '~/database.js';
import { prepare } from '~/helpers/commons/index.js';
import exchange from '~/helpers/currency/exchange.js';
import { mainCurrency } from '~/helpers/currency/index.js';
import { error } from '~/helpers/log.js';
import { get } from '~/helpers/permissions/get.js';
import { getUserHighestPermission } from '~/helpers/permissions/getUserHighestPermission.js';
import { getPointsName } from '~/helpers/points/index.js';
import * as changelog from '~/helpers/user/changelog.js';
import twitch from '~/services/twitch.js';
import { translate } from '~/translate.js';

/*
 * !me
 * !stats
 * !lastseen
 * !watched
 * !followage
 * !subage
 * !age
 */

class UserInfo extends System {
  @settings('me')
    order: string[] = ['$sender', '$level', '$rank', '$role', '$watched', '$points', '$messages', '$tips', '$bits', '$subMonths'];

  @settings('me')
    _formatDisabled: string[] = ['$role'];

  @settings('me')
    formatSeparator = ' | ';

  @settings('customization')
    lastSeenFormat = 'L LTS';

  @command('!followage')
  protected async followage(opts: CommandOptions): Promise<CommandResponse[]> {
    const [userName] = new Expects(opts.parameters).username({ optional: true, default: opts.sender.userName }).toArray();
    const id = await users.getIdByName(userName);
    const followedAt = await isFollowerUpdate(id);

    if (!followedAt) {
      return [{ response: prepare('followage.' + (opts.sender.userName === userName.toLowerCase() ? 'successSameUsername' : 'success') + '.never', { username: userName }), ...opts }];
    } else {
      const units = ['years', 'months', 'days', 'hours', 'minutes'] as const;
      const diff = dateDiff(new Date(followedAt).getTime(), Date.now());

      const output: string[] = [];
      for (const unit of units) {
        if (diff[unit]) {
          const v = Number(diff[unit]).toFixed();
          output.push(v + ' ' + getLocalizedName(v, translate('core.' + unit)));
        }
      }
      if (output.length === 0) {
        output.push(0 + ' ' + getLocalizedName(0, translate('core.minutes')));
      }

      return [{
        response: prepare('followage.' + (opts.sender.userName === userName.toLowerCase() ? 'successSameUsername' : 'success') + '.time', {
          username: userName,
          diff:     output.join(', '),
        }), ...opts,
      }];
    }
  }

  @command('!subage')
  protected async subage(opts: CommandOptions): Promise<CommandResponse[]> {
    const [userName] = new Expects(opts.parameters).username({ optional: true, default: opts.sender.userName }).toArray();
    await changelog.flush();
    const user = await AppDataSource.getRepository(User).findOneBy({ userName });
    const subCumulativeMonths = user?.subscribeCumulativeMonths;
    const subStreak = user?.subscribeStreak;
    const localePath = 'subage.' + (opts.sender.userName === userName.toLowerCase() ? 'successSameUsername' : 'success') + '.';

    if (!user || !user.isSubscriber) {
      return [{
        response: prepare(localePath + (subCumulativeMonths ? 'notNow' : 'never'), {
          username:                userName,
          subCumulativeMonths,
          subCumulativeMonthsName: getLocalizedName(subCumulativeMonths || 0, translate('core.months')),
        }), ...opts,
      }];
    } else {
      const units = ['years', 'months', 'days', 'hours', 'minutes'] as const;
      const diff = user.subscribedAt ? dateDiff(new Date(user.subscribedAt).getTime(), Date.now()) : null;
      const output: string[] = [];

      if (diff) {
        for (const unit of units) {
          if (diff[unit]) {
            const v = Number(diff[unit]).toFixed();
            output.push(v + ' ' + getLocalizedName(v, translate('core.' + unit)));
          }
        }
        if (output.length === 0) {
          output.push(0 + ' ' + getLocalizedName(0, translate('core.minutes')));
        }
      }

      return [{
        response: prepare(localePath + (subStreak ? 'timeWithSubStreak' : 'time'), {
          username:                userName,
          subCumulativeMonths,
          subCumulativeMonthsName: getLocalizedName(subCumulativeMonths ?? 1, translate('core.months')),
          subStreak,
          subStreakMonthsName:     getLocalizedName(subStreak ?? 1, translate('core.months')),
          diff:                    output.join(', '),
        }), ...opts,
      }];
    }
  }

  @command('!age')
  protected async age(opts: CommandOptions, retry = false): Promise<CommandResponse[]> {
    const [userName] = new Expects(opts.parameters).username({ optional: true, default: opts.sender.userName }).toArray();
    await changelog.flush();
    const user = await AppDataSource.getRepository(User).findOneBy({ userName });
    if (!user || !user.createdAt) {
      try {

        const getUserByName = await twitch.apiClient?.asIntent(['bot'], ctx => ctx.users.getUserByName(userName));
        if (getUserByName) {
          changelog.update(getUserByName.id, { userName, createdAt: new Date(getUserByName.creationDate).toISOString() });
        }
        if (!retry) {
          return this.age(opts, true);
        } else {
          throw new Error('retry');
        }
      } catch (e: any) {
        if (e.message !== 'retry') {
          error(e);
        }
        return [{ response: prepare('age.failed', { username: userName }), ...opts }];
      }
    } else {
      const units = ['years', 'months', 'days', 'hours', 'minutes'] as const;
      const diff = dateDiff(new Date(user.createdAt).getTime(), Date.now());
      const output: string[] = [];
      for (const unit of units) {
        if (diff[unit]) {
          const v = Number(diff[unit]).toFixed();
          output.push(v + ' ' + getLocalizedName(v, translate('core.' + unit)));
        }
      }
      if (output.length === 0) {
        output.push(0 + ' ' + getLocalizedName(0, translate('core.minutes')));
      }
      return [{
        response: prepare('age.success.' + (opts.sender.userName === userName.toLowerCase() ? 'withoutUsername' : 'withUsername'), {
          username: userName,
          diff:     output.join(', '),
        }), ...opts,
      }];
    }
  }

  @command('!lastseen')
  protected async lastseen(opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const [userName] = new Expects(opts.parameters).username().toArray();
      await changelog.flush();
      const user = await AppDataSource.getRepository(User).findOneBy({ userName: userName });
      if (!user || !user.seenAt) {
        return [{ response: translate('lastseen.success.never').replace(/\$username/g, userName), ...opts }];
      } else {
        return [{
          response: translate('lastseen.success.time')
            .replace(/\$username/g, userName)
            .replace(/\$when/g, dayjs(user.seenAt).tz(timezone).format(this.lastSeenFormat)), ...opts,
        }];
      }
    } catch (e: any) {
      return [{ response: translate('lastseen.failed.parse'), ...opts }];
    }
  }

  @command('!watched')
  protected async watched(opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const [username] = new Expects(opts.parameters).username({ optional: true, default: opts.sender.userName }).toArray();

      let id;
      if (opts.sender.userName === username) {
        id = opts.sender.userId;
      } else {
        id = await users.getIdByName(username);
      }
      const time = id ? Number((await users.getWatchedOf(id) / (60 * 60 * 1000))).toFixed(1) : 0;
      return [{ response: prepare('watched.success.time', { time: String(time), username }), ...opts }];
    } catch (e: any) {
      return [{ response: translate('watched.failed.parse'), ...opts }];
    }
  }

  @command('!me')
  async showMe(opts: CommandOptions, returnOnly = false): Promise<string | CommandResponse[]> {
    try {
      const message: (string | null)[] = [];
      const [user, tips, bits] = await Promise.all([
        changelog.get(opts.sender.userId),
        AppDataSource.getRepository(UserTip).find({ where: { userId: opts.sender.userId } }),
        AppDataSource.getRepository(UserBit).find({ where: { userId: opts.sender.userId } }),
      ]);

      if (!user) {
        throw Error(`User ${opts.sender.userName}#${opts.sender.userId} not found.`);
      }

      // build message
      for (const i of this.order) {
        if (!this._formatDisabled.includes(i)) {
          message.push(i);
        }
      }

      if (message.includes('$rank')) {
        const idx = message.indexOf('$rank');
        const rank = await ranks.get(await changelog.get(opts.sender.userId));
        if (ranks.enabled && rank.current !== null) {
          message[idx] = typeof rank.current === 'string' ? rank.current : rank.current.rank;
        } else {
          message.splice(idx, 1);
        }
      }

      if (message.includes('$level')) {
        const idx = message.indexOf('$level');
        if (levels.enabled) {
          const level = await levels.getLevelOf(await changelog.get(opts.sender.userId));
          message[idx] = `Level ${level}`;
        } else {
          message.splice(idx, 1);
        }
      }

      if (message.includes('$watched')) {
        const idx = message.indexOf('$watched');
        message[idx] = format(general.numberFormat, 1)(user.watchedTime / 1000 / 60 / 60) + ' ' + getLocalizedName(user.watchedTime, translate('core.hours'));
      }

      if (message.includes('$points')) {
        const idx = message.indexOf('$points');
        if (points.enabled) {
          message[idx] = format(general.numberFormat, 0)(user.points) + ' ' + getPointsName(user.points);
        } else {
          message.splice(idx, 1);
        }
      }

      if (message.includes('$messages')) {
        const idx = message.indexOf('$messages');
        message[idx] = format(general.numberFormat, 0)(user.messages) + ' ' + getLocalizedName(user.messages, translate('core.messages'));
      }

      if (message.includes('$tips')) {
        const idx = message.indexOf('$tips');
        let tipAmount = 0;
        for (const t of tips) {
          tipAmount += exchange(Number(t.amount), t.currency, mainCurrency.value);
        }
        message[idx] = Intl.NumberFormat(general.lang, { style: 'currency', currency: mainCurrency.value }).format(tipAmount);
      }

      if (message.includes('$subMonths')) {
        const idx = message.indexOf('$subMonths');
        message[idx] = format(general.numberFormat, 0)(user.subscribeCumulativeMonths) + ' ' + getLocalizedName(user.subscribeCumulativeMonths, translate('core.months'));
      }

      if (message.includes('$bits')) {
        const idx = message.indexOf('$bits');
        const bitAmount = bits.map(o => Number(o.amount)).reduce((a, b) => a + b, 0);
        message[idx] = `${format(general.numberFormat, 0)(bitAmount)} ${getLocalizedName(bitAmount, translate('core.bits'))}`;
      }

      if (message.includes('$role')) {
        const idx = message.indexOf('$role');
        message[idx] = null;
        const permId = await getUserHighestPermission(opts.sender.userId);
        if (permId) {
          const pItem = await get(permId);
          if (pItem) {
            message[idx] = pItem.name;
          }
        }
      }

      const response = message.filter(o => o !== null).join(this.formatSeparator);
      if (returnOnly) {
        return response;
      } else {
        return [{
          response, sender: opts.sender, attr: opts.attr, discord: opts.discord,
        }];
      }
    } catch (e: any) {
      error(e.stack);
      return [];
    }
  }

  @command('!stats')
  @default_permission(null)
  async showStats(opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const userName = new Expects(opts.parameters).username().toArray()[0].toLowerCase();
      await changelog.flush();
      const user = await AppDataSource.getRepository(User).findOneBy({ userName: userName.toLowerCase() });

      if (!user) {
        throw Error(`User ${userName} not found.`);
      }

      const response = await this.showMe({
        ...opts,
        sender: {
          ...opts.sender,
          userName,
          userId: String(user.userId),
        },
      }, true) as string;
      return [
        {
          response: response.replace('$sender', '$touser'), sender: opts.sender, attr: { ...opts.attr, param: userName }, discord: opts.discord,
        },
      ];
    } catch (e: any) {
      if (e.message.includes('<username>')) {
        return this.showMe(opts) as Promise<CommandResponse[]>; // fallback to me without param
      } else {
        error(e.stack);
        return [];
      }
    }

  }
}

export default new UserInfo();

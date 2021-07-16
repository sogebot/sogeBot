import { getRepository } from 'typeorm';

import api from '../api';
import { dateDiff } from '../commons';
import currency from '../currency';
import {
  User, UserBit, UserTip,
} from '../database/entity/user';
import {
  command, default_permission, settings,
} from '../decorators';
import Expects from '../expects';
import general from '../general';
import { prepare } from '../helpers/commons/';
import { mainCurrency } from '../helpers/currency';
import { dayjs, timezone } from '../helpers/dayjs';
import { getLocalizedName } from '../helpers/getLocalized';
import { debug, error } from '../helpers/log';
import { get, getUserHighestPermission } from '../helpers/permissions/';
import { getPointsName } from '../helpers/points';
import { fetchAccountAge } from '../microservices/fetchAccountAge';
import { getUserFromTwitch } from '../microservices/getUserFromTwitch';
import { translate } from '../translate';
import users from '../users';
import System from './_interface';
import levels from './levels';
import points from './points';
import ranks from './ranks';

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
  order: string[] = ['$sender', '$level', '$rank', '$role', '$watched', '$points', '$messages', '$tips', '$bits'];

  @settings('me')
  _formatDisabled: string[] = ['$role'];

  @settings('me')
  formatSeparator = ' | ';

  @settings('customization')
  lastSeenFormat = 'L LTS';

  @command('!followage')
  protected async followage(opts: CommandOptions): Promise<CommandResponse[]> {
    const [username] = new Expects(opts.parameters).username({ optional: true, default: opts.sender.username }).toArray();
    const id = await users.getIdByName(username);
    const isFollowerUpdate = await api.isFollowerUpdate(await getRepository(User).findOne({ userId: id }));
    debug('userinfo.followage', JSON.stringify(isFollowerUpdate));

    const user = await getRepository(User).findOne({ username });
    if (!user || !user.isFollower || user.followedAt === 0) {
      return [{ response: prepare('followage.' + (opts.sender.username === username.toLowerCase() ? 'successSameUsername' : 'success') + '.never', { username }), ...opts }];
    } else {
      const units = ['years', 'months', 'days', 'hours', 'minutes'] as const;
      const diff = dateDiff(new Date(user.followedAt).getTime(), Date.now());

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
        response: prepare('followage.' + (opts.sender.username === username.toLowerCase() ? 'successSameUsername' : 'success') + '.time', {
          username,
          diff: output.join(', '),
        }), ...opts,
      }];
    }
  }

  @command('!subage')
  protected async subage(opts: CommandOptions): Promise<CommandResponse[]> {
    const [username] = new Expects(opts.parameters).username({ optional: true, default: opts.sender.username }).toArray();

    const user = await getRepository(User).findOne({ username });
    const subCumulativeMonths = user?.subscribeCumulativeMonths;
    const subStreak = user?.subscribeStreak;
    const localePath = 'subage.' + (opts.sender.username === username.toLowerCase() ? 'successSameUsername' : 'success') + '.';

    if (!user || !user.isSubscriber || user.subscribedAt === 0) {
      return [{
        response: prepare(localePath + (subCumulativeMonths ? 'notNow' : 'never'), {
          username,
          subCumulativeMonths,
          subCumulativeMonthsName: getLocalizedName(subCumulativeMonths || 0, translate('core.months')),
        }), ...opts,
      }];
    } else {
      const units = ['years', 'months', 'days', 'hours', 'minutes'] as const;
      const diff = dateDiff(new Date(user.subscribedAt).getTime(), Date.now());
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
        response: prepare(localePath + (subStreak ? 'timeWithSubStreak' : 'time'), {
          username,
          subCumulativeMonths,
          subCumulativeMonthsName: getLocalizedName(subCumulativeMonths || 0, translate('core.months')),
          subStreak,
          subStreakMonthsName:     getLocalizedName(subStreak || 0, translate('core.months')),
          diff:                    output.join(', '),
        }), ...opts,
      }];
    }
  }

  @command('!age')
  protected async age(opts: CommandOptions, retry = false): Promise<CommandResponse[]> {
    const [username] = new Expects(opts.parameters).username({ optional: true, default: opts.sender.username }).toArray();

    const user = await getRepository(User).findOne({ username });
    if (!user || user.createdAt === 0) {
      try {
        const { id: userId } = await getUserFromTwitch(username);
        if (!user) {
          await getRepository(User).save({
            userId,
            username,
          });
        }
        await fetchAccountAge(userId);
        if (!retry) {
          return this.age(opts, true);
        } else {
          throw new Error('retry');
        }
      } catch (e) {
        if (e.message !== 'retry') {
          error(e);
        }
        return [{ response: prepare('age.failed', { username }), ...opts }];
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
        response: prepare('age.success.' + (opts.sender.username === username.toLowerCase() ? 'withoutUsername' : 'withUsername'), {
          username,
          diff: output.join(', '),
        }), ...opts,
      }];
    }
  }

  @command('!lastseen')
  protected async lastseen(opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const [username] = new Expects(opts.parameters).username().toArray();
      const user = await getRepository(User).findOne({ username: username });
      if (!user || user.seenAt === 0) {
        return [{ response: translate('lastseen.success.never').replace(/\$username/g, username), ...opts }];
      } else {
        return [{
          response: translate('lastseen.success.time')
            .replace(/\$username/g, username)
            .replace(/\$when/g, dayjs(user.seenAt).tz(timezone).format(this.lastSeenFormat)), ...opts,
        }];
      }
    } catch (e) {
      return [{ response: translate('lastseen.failed.parse'), ...opts }];
    }
  }

  @command('!watched')
  protected async watched(opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const [username] = new Expects(opts.parameters).username({ optional: true, default: opts.sender.username }).toArray();

      let id;
      if (opts.sender.username === username) {
        id = opts.sender.userId;
      } else {
        id = await users.getIdByName(username);
      }
      const time = id ? Number((await users.getWatchedOf(id) / (60 * 60 * 1000))).toFixed(1) : 0;
      return [{ response: prepare('watched.success.time', { time: String(time), username }), ...opts }];
    } catch (e) {
      return [{ response: translate('watched.failed.parse'), ...opts }];
    }
  }

  @command('!me')
  async showMe(opts: CommandOptions, returnOnly = false): Promise<string | CommandResponse[]> {
    try {
      const message: (string | null)[] = [];
      const user = await getRepository(User).findOne({
        where: { userId: opts.sender.userId },
        cache: true,
      });
      const tips =  await getRepository(UserTip).find({ where: { userId: opts.sender.userId } });
      const bits =  await getRepository(UserBit).find({ where: { userId: opts.sender.userId } });

      if (!user) {
        throw Error(`User ${opts.sender.username}#${opts.sender.userId} not found.`);
      }

      // build message
      for (const i of this.order) {
        if (!this._formatDisabled.includes(i)) {
          message.push(i);
        }
      }

      if (message.includes('$rank')) {
        const idx = message.indexOf('$rank');
        const rank = await ranks.get(await getRepository(User).findOne({ userId: opts.sender.userId }));
        if (ranks.enabled && rank.current !== null) {
          message[idx] = typeof rank.current === 'string' ? rank.current : rank.current.rank;
        } else {
          message.splice(idx, 1);
        }
      }

      if (message.includes('$level')) {
        const idx = message.indexOf('$level');
        if (levels.enabled) {
          const level = await levels.getLevelOf(await getRepository(User).findOne({ userId: opts.sender.userId }));
          message[idx] = `Level ${level}`;
        } else {
          message.splice(idx, 1);
        }
      }

      if (message.includes('$watched')) {
        const idx = message.indexOf('$watched');
        message[idx] = (user.watchedTime / 1000 / 60 / 60).toFixed(1) + 'h';
      }

      if (message.includes('$points')) {
        const idx = message.indexOf('$points');
        if (points.enabled) {
          message[idx] = user.points + ' ' + getPointsName(user.points);
        } else {
          message.splice(idx, 1);
        }
      }

      if (message.includes('$messages')) {
        const idx = message.indexOf('$messages');
        message[idx] = user.messages + ' ' + getLocalizedName(user.messages, translate('core.messages'));
      }

      if (message.includes('$tips')) {
        const idx = message.indexOf('$tips');
        let tipAmount = 0;
        for (const t of tips) {
          tipAmount += currency.exchange(Number(t.amount), t.currency, mainCurrency.value);
        }
        message[idx] = Intl.NumberFormat(general.lang, { style: 'currency', currency: mainCurrency.value }).format(tipAmount);
      }

      if (message.includes('$bits')) {
        const idx = message.indexOf('$bits');
        const bitAmount = bits.map(o => Number(o.amount)).reduce((a, b) => a + b, 0);
        message[idx] = `${bitAmount} ${getLocalizedName(bitAmount, translate('core.bits'))}`;
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
          response, sender: opts.sender, attr: opts.attr,
        }];
      }
    } catch (e) {
      error(e.stack);
      return [];
    }
  }

  @command('!stats')
  @default_permission(null)
  async showStats(opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const username = new Expects(opts.parameters).username().toArray()[0].toLowerCase();
      const user = await getRepository(User).findOne({ where: { username: username.toLowerCase() } });

      if (!user) {
        throw Error(`User ${username} not found.`);
      }

      const response = await this.showMe({
        ...opts,
        sender: {
          ...opts.sender,
          username,
          userId: String(user.userId),
        },
      }, true) as string;
      return [
        {
          response: response.replace('$sender', '$touser'), sender: opts.sender, attr: { ...opts.attr, param: username },
        },
      ];
    } catch (e) {
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

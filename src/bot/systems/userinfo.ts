import _ from 'lodash';
import moment from 'moment';

import { dateDiff, getLocalizedName, prepare, sendMessage } from '../commons';
import { command, default_permission, settings, ui } from '../decorators';
import System from './_interface';
import { debug, error } from '../helpers/log';
import { getRepository } from 'typeorm';
import { User } from '../database/entity/user';
import permissions from '../permissions';
import users from '../users';
import api from '../api';
import { translate } from '../translate';
import translateLib from '../translate';
import currency from '../currency';
import ranks from './ranks';
import points from './points';
import Expects from '../expects';
import { getUserFromTwitch } from '../microservices/getUserFromTwitch';
import { clusteredFetchAccountAge } from '../cluster';

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
  @ui({
    type: 'sortable-list',
    values: 'order',
    toggle: '_formatDisabled',
    toggleOnIcon: 'eye',
    toggleOffIcon: 'eye-slash',
  })
  order: string[] = ['$sender', '$rank', '$role', '$watched', '$points', '$messages', '$tips', '$bits'];

  @settings('me')
  _formatDisabled: string[] = ['$role'];

  @settings('me')
  formatSeparator = ' | ';

  @settings('lastseen')
  lastSeenFormat = 'L LTS';

  @command('!followage')
  protected async followage(opts: CommandOptions) {
    const [username] = new Expects(opts.parameters).username({ optional: true, default: opts.sender.username }).toArray();

    const id = await users.getIdByName(username);
    const isFollowerUpdate = await api.isFollowerUpdate(await getRepository(User).findOne({ userId: id }));
    debug('userinfo.followage', JSON.stringify(isFollowerUpdate));

    const user = await getRepository(User).findOne({ username });
    if (!user || !user.isFollower || user.followedAt === 0) {
      sendMessage(prepare('followage.' + (opts.sender.username === username.toLowerCase() ? 'successSameUsername' : 'success') + '.never', { username }), opts.sender, opts.attr);
    } else {
      const units: string[] = ['years', 'months', 'days', 'hours', 'minutes'];
      const diff = dateDiff(new Date(user.followedAt).getTime(), Date.now());

      const output: string[] = [];
      for (const unit of units) {
        if (diff[unit]) {
          const v = Number(diff[unit]).toFixed();
          output.push(v + ' ' + getLocalizedName(v, 'core.' + unit));
        }
      }
      if (output.length === 0) {
        output.push(0 + ' ' + getLocalizedName(0, 'core.minutes'));
      }

      sendMessage(prepare('followage.' + (opts.sender.username === username.toLowerCase() ? 'successSameUsername' : 'success') + '.time', {
        username,
        diff: output.join(', '),
      }), opts.sender);
    }
  }

  @command('!subage')
  protected async subage(opts: CommandOptions) {
    const [username] = new Expects(opts.parameters).username({ optional: true, default: opts.sender.username }).toArray();

    const user = await getRepository(User).findOne({ username });
    const subCumulativeMonths = user?.subscribeCumulativeMonths;
    const subStreak = user?.subscribeStreak;
    const localePath = 'subage.' + (opts.sender.username === username.toLowerCase() ? 'successSameUsername' : 'success') + '.';

    if (!user || !user.isSubscriber || user.subscribedAt === 0) {
      sendMessage(prepare(localePath + (subCumulativeMonths ? 'notNow' : 'never'), {
        username,
        subCumulativeMonths,
        subCumulativeMonthsName: getLocalizedName(subCumulativeMonths || 0, 'core.months'),
      }), opts.sender);
    } else {
      const units: string[] = ['years', 'months', 'days', 'hours', 'minutes'];
      const diff = dateDiff(new Date(user.subscribedAt).getTime(), Date.now());
      const output: string[] = [];
      for (const unit of units) {
        if (diff[unit]) {
          const v = Number(diff[unit]).toFixed();
          output.push(v + ' ' + getLocalizedName(v, 'core.' + unit));
        }
      }
      if (output.length === 0) {
        output.push(0 + ' ' + getLocalizedName(0, 'core.minutes'));
      }

      sendMessage(prepare(localePath + (subStreak ? 'timeWithSubStreak' : 'time'), {
        username,
        subCumulativeMonths,
        subCumulativeMonthsName: getLocalizedName(subCumulativeMonths || 0, 'core.months'),
        subStreak,
        subStreakMonthsName: getLocalizedName(subStreak || 0, 'core.months'),
        diff: output.join(', '),
      }), opts.sender);
    }
  }

  @command('!age')
  protected async age(opts: CommandOptions, retry = false) {
    const [username] = new Expects(opts.parameters).username({ optional: true, default: opts.sender.username }).toArray();

    const user = await getRepository(User).findOne({ username });
    if (!user || user.createdAt === 0) {
      try {
        const { id: userId } = await getUserFromTwitch(username);
        if (!user) {
          await getRepository(User).save({
            userId: Number(userId),
            username: username,
          });
        }
        await clusteredFetchAccountAge(Number(userId));
        if (!retry) {
          this.age(opts, retry = true);
        } else {
          throw new Error('retry');
        }
      } catch (e) {
        if (e.message !== 'retry') {
          error(e);
        }
        sendMessage(prepare('age.failed', { username }), opts.sender, opts.attr);
      }
    } else {
      const units: string[] = ['years', 'months', 'days', 'hours', 'minutes'];
      const diff = dateDiff(new Date(user.createdAt).getTime(), Date.now());
      const output: string[] = [];
      for (const unit of units) {
        if (diff[unit]) {
          const v = Number(diff[unit]).toFixed();
          output.push(v + ' ' + getLocalizedName(v, 'core.' + unit));
        }
      }
      if (output.length === 0) {
        output.push(0 + ' ' + getLocalizedName(0, 'core.minutes'));
      }
      sendMessage(prepare('age.success.' + (opts.sender.username === username.toLowerCase() ? 'withoutUsername' : 'withUsername'), {
        username,
        diff: output.join(', '),
      }), opts.sender);
    }
  }

  @command('!lastseen')
  protected async lastseen(opts: CommandOptions) {
    try {
      const [username] = new Expects(opts.parameters).username().toArray();
      const user = await getRepository(User).findOne({ username: username });
      if (!user || user.seenAt === 0) {
        sendMessage(translate('lastseen.success.never').replace(/\$username/g, username), opts.sender, opts.attr);
      } else {
        moment.locale(translateLib.lang);
        sendMessage(translate('lastseen.success.time')
          .replace(/\$username/g, username)
          .replace(/\$when/g, moment(user.seenAt).format(this.lastSeenFormat)), opts.sender);
      }
    } catch (e) {
      sendMessage(translate('lastseen.failed.parse'), opts.sender, opts.attr);
    }
  }

  @command('!watched')
  protected async watched(opts: CommandOptions) {
    try {
      const [username] = new Expects(opts.parameters).username({ optional: true, default: opts.sender.username }).toArray();

      let id;
      if (opts.sender.username === username) {
        id = opts.sender.userId;
      } else {
        id = await users.getIdByName(username);
      }
      const time = id ? Number((await users.getWatchedOf(id) / (60 * 60 * 1000))).toFixed(1) : 0;
      sendMessage(prepare('watched.success.time', { time: String(time), username }), opts.sender, opts.attr);
    } catch (e) {
      sendMessage(translate('watched.failed.parse'), opts.sender, opts.attr);
    }
  }

  @command('!me')
  async showMe(opts: CommandOptions, returnOnly = false): Promise<string | { response: string; sender: any; attr: any }[]> {
    try {
      const message: (string | null)[] = [];
      const user = await getRepository(User).findOne({
        where: {
          userId: opts.sender.userId,
        },
        cache: true,
      });


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
        if (ranks.enabled && !_.isNull(rank.current)) {
          message[idx] = typeof rank.current === 'string' ? rank.current : rank.current.rank;
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
          message[idx] = user.points + ' ' + await points.getPointsName(user.points);
        } else {
          message.splice(idx, 1);
        }
      }

      if (message.includes('$messages')) {
        const idx = message.indexOf('$messages');
        message[idx] = user.messages + ' ' + getLocalizedName(user.messages, 'core.messages');
      }

      if (message.includes('$tips')) {
        const idx = message.indexOf('$tips');
        const tips = user.tips;
        let tipAmount = 0;
        for (const t of tips) {
          tipAmount += currency.exchange(Number(t.amount), t.currency, currency.mainCurrency);
        }
        message[idx] = `${Number(tipAmount).toFixed(2)}${currency.symbol(currency.mainCurrency)}`;
      }

      if (message.includes('$bits')) {
        const idx = message.indexOf('$bits');
        const bits = user.bits;
        const bitAmount = bits.map(o => Number(o.amount)).reduce((a, b) => a + b, 0);
        message[idx] = `${bitAmount} ${getLocalizedName(bitAmount, 'core.bits')}`;
      }

      if (message.includes('$role')) {
        const idx = message.indexOf('$role');
        message[idx] = null;
        const permId = await permissions.getUserHighestPermission(opts.sender.userId);
        if (permId) {
          const pItem = await permissions.get(permId);
          if (pItem) {
            message[idx] = pItem.name;
          }
        }
      }

      const response = message.filter(o => o !== null).join(this.formatSeparator);
      if (returnOnly) {
        return response;
      } else {
        return [{ response, sender: opts.sender, attr: opts.attr }];
      }
    } catch (e) {
      error(e.stack);
      return [];
    }
  }

  @command('!stats')
  @default_permission(null)
  async showStats(opts: CommandOptions) {
    try {
      const username = new Expects(opts.parameters).username().toArray()[0].toLowerCase();
      const user = await getRepository(User).findOne({ where: { username: username.toLowerCase() }});

      if (!user) {
        throw Error(`User ${username} not found.`);
      }

      const response = await this.showMe({
        ...opts,
        sender: {
          ...opts.sender,
          username,
          userId: user.userId,
        },
      }, true);
      if (typeof response === 'string') {
        return [
          { response: response.replace('$sender', '$touser'), sender: opts.sender, attr: { ...opts.attr, param: username } },
        ];
      }
    } catch (e) {
      if (e.message.includes('<username>')) {
        return this.showMe(opts); // fallback to me without param
      } else {
        error(e.stack);
        return [];
      }
    }

  }
}

export default new UserInfo();

import _ from 'lodash';
import moment from 'moment';

import { dateDiff, getLocalizedName, prepare, sendMessage } from '../commons';
import { command, settings, ui } from '../decorators';
import { onMessage } from '../decorators/on';
import System from './_interface';
import { debug, error } from '../helpers/log';
import { getRepository } from 'typeorm';
import { User } from '../database/entity/user';
import permissions from '../permissions';
import users from '../users';
import api from '../api';
import { translate } from '../translate';
import translateLib from '../translate';

/*
 * !me
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
    let username;
    const parsed = opts.parameters.match(/([^@]\S*)/g);

    if (_.isNil(parsed)) {
      username = opts.sender.username;
    } else {
      username = parsed[0].toLowerCase();
    }

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
    let username;
    const parsed = opts.parameters.match(/([^@]\S*)/g);

    if (_.isNil(parsed)) {
      username = opts.sender.username;
    } else {
      username = parsed[0].toLowerCase();
    }

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
  protected async age(opts: CommandOptions) {
    let username;
    const parsed = opts.parameters.match(/([^@]\S*)/g);

    if (_.isNil(parsed)) {
      username = opts.sender.username;
    } else {
      username = parsed[0].toLowerCase();
    }

    const user = await getRepository(User).findOne({ username });
    if (!user || user.createdAt === 0) {
      sendMessage(prepare('age.failed', { username }), opts.sender, opts.attr);
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
      const parsed = opts.parameters.match(/^([\S]+)$/);
      if (parsed === null) {
        throw new Error();
      }

      const user = await getRepository(User).findOne({ username: parsed[0] });
      if (!user || user.seenAt === 0) {
        sendMessage(translate('lastseen.success.never').replace(/\$username/g, parsed[0]), opts.sender, opts.attr);
      } else {
        moment.locale(translateLib.lang);
        sendMessage(translate('lastseen.success.time')
          .replace(/\$username/g, parsed[0])
          .replace(/\$when/g, moment(user.seenAt).format(this.lastSeenFormat)), opts.sender);
      }
    } catch (e) {
      sendMessage(translate('lastseen.failed.parse'), opts.sender, opts.attr);
    }
  }

  @command('!watched')
  protected async watched(opts: CommandOptions) {
    try {
      const parsed = opts.parameters.match(/^([\S]+)$/);

      let id = opts.sender.userId;
      let username = opts.sender.username;

      if (parsed) {
        username = parsed[0].toLowerCase();
        id = await users.getIdByName(username);
      }
      const time = id ? Number((await users.getWatchedOf(id) / (60 * 60 * 1000))).toFixed(1) : 0;
      sendMessage(prepare('watched.success.time', { time: String(time), username }), opts.sender, opts.attr);
    } catch (e) {
      sendMessage(translate('watched.failed.parse'), opts.sender, opts.attr);
    }
  }

  @command('!me')
  protected async showMe(opts: CommandOptions) {
    try {
      const message: (string | null)[] = [];
      const user = await getRepository(User).findOne({
        relations: ['bits', 'tips'],
        where: {
          userId: opts.sender.userId,
        },
        cache: true,
      });

      if (!user) {
        return;
      }

      // build message
      for (const i of this.order) {
        if (!this._formatDisabled.includes(i)) {
          message.push(i);
        }
      }

      if (message.includes('$rank')) {
        const idx = message.indexOf('$rank');
        const rank = await global.systems.ranks.get(await getRepository(User).findOne({ userId: opts.sender.userId }));
        if (global.systems.ranks.enabled && !_.isNull(rank)) {
          message[idx] = rank;
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
        if (global.systems.points.enabled) {
          message[idx] = user.points + ' ' + await global.systems.points.getPointsName(user.points);
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
        const currency = global.currency.mainCurrency;
        let tipAmount = 0;
        for (const t of tips) {
          tipAmount += global.currency.exchange(Number(t.amount), t.currency, currency);
        }
        message[idx] = `${Number(tipAmount).toFixed(2)}${global.currency.symbol(currency)}`;
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
      sendMessage(message.filter(o => o !== null).join(this.formatSeparator), opts.sender, opts.attr);
    } catch (e) {
      error(e.stack);
    }
  }

  @onMessage()
  public async onMessage(opts: onEventMessage) {
    if (!_.isNil(opts.sender) && !_.isNil(opts.sender.userId) && !_.isNil(opts.sender.username)) {
      await getRepository(User).update({
        userId: opts.sender.userId,
      }, {
        seenAt: Date.now(),
        isSubscriber: typeof opts.sender !== 'undefined',
      });
    }
  }
}

export default UserInfo;
export { UserInfo };

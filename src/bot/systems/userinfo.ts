import _ from 'lodash';
import moment from 'moment';

import { dateDiff, getLocalizedName, prepare, sendMessage } from '../commons';
import { debug } from '../debug';
import { command, settings, ui } from '../decorators';
import { onMessage } from '../decorators/on';
import System from './_interface';

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
    toggleOnIcon: 'fa-eye',
    toggleOffIcon: 'fa-eye-slash',
  })
  order: string[] = ['$sender', '$rank', '$watched', '$points', '$messages', '$tips', '$bits'];

  @settings('me')
  _formatDisabled: string[] = [];

  @settings('me')
  formatSeparator: string = ' | ';

  @command('!followage')
  protected async followage(opts: CommandOptions) {
    let username;
    const parsed = opts.parameters.match(/([^@]\S*)/g);

    if (_.isNil(parsed)) {
      username = opts.sender.username;
    } else {
      username = parsed[0].toLowerCase();
    }

    const isFollowerUpdate = await global.api.isFollowerUpdate({
      id: await global.users.getIdByName(username),
    });
    debug('userinfo.followage', JSON.stringify(isFollowerUpdate));

    const user = await global.users.getByName(username);
    if (_.isNil(user) || _.isNil(user.time) || _.isNil(user.time.follow) || _.isNil(user.is.follower) || !user.is.follower) {
      sendMessage(prepare('followage.' + (opts.sender.username === username.toLowerCase() ? 'successSameUsername' : 'success') + '.never', { username }), opts.sender, opts.attr);
    } else {
      const units: string[] = ['years', 'months', 'days', 'hours', 'minutes'];
      const diff = dateDiff(new Date(user.time.follow).getTime(), Date.now());

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

    const user = await global.users.getByName(username);
    const subCumulativeMonths = _.get(user, 'stats.subCumulativeMonths', undefined);
    const subStreak = _.get(user, 'stats.subStreak', undefined);
    const localePath = 'subage.' + (opts.sender.username === username.toLowerCase() ? 'successSameUsername' : 'success') + '.';

    if (_.isNil(user) || _.isNil(user.time) || _.isNil(user.time.subscribed_at) || _.isNil(user.is.subscriber) || !user.is.subscriber) {
      sendMessage(prepare(localePath + (subCumulativeMonths ? 'notNow' : 'never'), {
        username,
        subCumulativeMonths,
        subCumulativeMonthsName: getLocalizedName(subCumulativeMonths || 0, 'core.months'),
      }), opts.sender);
    } else {
      const units: string[] = ['years', 'months', 'days', 'hours', 'minutes'];
      const diff = dateDiff(new Date(user.time.subscribed_at).getTime(), Date.now());
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

    const user = await global.users.getByName(username);
    if (_.isNil(user) || _.isNil(user.time) || _.isNil(user.time.created_at)) {
      sendMessage(prepare('age.failed', { username }), opts.sender, opts.attr);
    } else {
      const units: string[] = ['years', 'months', 'days', 'hours', 'minutes'];
      const diff = dateDiff(new Date(user.time.created_at).getTime(), Date.now());
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

      const user = await global.users.getByName(parsed[0]);
      if (_.isNil(user) || _.isNil(user.time) || _.isNil(user.time.message)) {
        sendMessage(global.translate('lastseen.success.never').replace(/\$username/g, parsed[0]), opts.sender, opts.attr);
      } else {
        moment.locale(global.lib.translate.lang);
        sendMessage(global.translate('lastseen.success.time')
          .replace(/\$username/g, parsed[0])
          .replace(/\$when/g, moment(user.time.message).format('L') + ' ' + moment(user.time.message).format('LTS')), opts.sender);
      }
    } catch (e) {
      sendMessage(global.translate('lastseen.failed.parse'), opts.sender, opts.attr);
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
        id = await global.users.getIdByName(username);
      }
      const time = id ? Number((await global.users.getWatchedOf(id) / (60 * 60 * 1000))).toFixed(1) : 0;
      sendMessage(prepare('watched.success.time', { time: String(time), username }), opts.sender, opts.attr);
    } catch (e) {
      sendMessage(global.translate('watched.failed.parse'), opts.sender, opts.attr);
    }
  }

  @command('!me')
  protected async showMe(opts: CommandOptions) {
    try {
      const message: string[] = [];

      // build message
      for (const i of this.order) {
        if (!this._formatDisabled.includes(i)) {
          message.push(i);
        }
      }

      if (message.includes('$rank')) {
        const idx = message.indexOf('$rank');
        const rank = await global.systems.ranks.get(opts.sender.username);
        if (await global.systems.ranks.isEnabled() && !_.isNull(rank)) {
          message[idx] = rank;
        } else {
          message.splice(idx, 1);
        }
      }

      if (message.includes('$watched')) {
        const watched = await global.users.getWatchedOf(opts.sender.userId);
        const idx = message.indexOf('$watched');
        message[idx] = (watched / 1000 / 60 / 60).toFixed(1) + 'h';
      }

      if (message.includes('$points')) {
        const idx = message.indexOf('$points');
        if (await global.systems.points.isEnabled()) {
          const userPoints = await global.systems.points.getPointsOf(opts.sender.userId);
          message[idx] = userPoints + ' ' + await global.systems.points.getPointsName(userPoints);
        } else {
          message.splice(idx, 1);
        }
      }

      if (message.includes('$messages')) {
        const msgCount = await global.users.getMessagesOf(opts.sender.userId);
        const idx = message.indexOf('$messages');
        message[idx] = msgCount + ' ' + getLocalizedName(msgCount, 'core.messages');
      }

      if (message.includes('$tips')) {
        const idx = message.indexOf('$tips');
        const tips = await global.db.engine.find('users.tips', { id: opts.sender.userId });
        const currency = global.currency.mainCurrency;
        let tipAmount = 0;
        for (const t of tips) {
          tipAmount += global.currency.exchange(Number(t.amount), t.currency, currency);
        }
        message[idx] = `${Number(tipAmount).toFixed(2)}${global.currency.symbol(currency)}`;
      }

      if (message.includes('$bits')) {
        const idx = message.indexOf('$bits');
        const bits = await global.db.engine.find('users.bits', { id: opts.sender.userId });
        let bitAmount = bits.map(o => Number(o.amount)).reduce((a, b) => a + b, 0);
        message[idx] = `${bitAmount} ${getLocalizedName(bitAmount, 'core.bits')}`;
      }
      sendMessage(message.join(this.formatSeparator), opts.sender, opts.attr);
    } catch (e) {
      global.log.error(e.stack);
    }
  }

  @onMessage()
  public onMessage(opts: onEventMessage) {
    if (!_.isNil(opts.sender) && !_.isNil(opts.sender.userId) && !_.isNil(opts.sender.username)) {
      global.users.setById(opts.sender.userId, {
        username: opts.sender.username,
        time: { message: new Date().getTime() },
        is: { subscriber: typeof opts.sender.badges.subscriber !== 'undefined' },
      }, true);
      global.db.engine.update('users.online', { username: opts.sender.username }, { username: opts.sender.username });
    }
  }
}

export default UserInfo;
export { UserInfo };

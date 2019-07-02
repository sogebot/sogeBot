import _ from 'lodash';
import moment from 'moment-timezone';

import { getChannel, getIgnoreList, getLocalizedName, isIgnored, sendMessage } from '../commons';
import { command, default_permission } from '../decorators';
import { permission } from '../permissions';
import System from './_interface';

enum TYPE {
  TIME,
  TIPS,
  POINTS,
  MESSAGES,
  FOLLOWAGE,
  SUBAGE,
  BITS,
  GIFTS,
  SUBMONTHS,
}

const __DEBUG__ =
  (process.env.DEBUG && process.env.DEBUG.includes('systems.*')) ||
  (process.env.DEBUG && process.env.DEBUG.includes('systems.top')) ||
  (process.env.DEBUG && process.env.DEBUG.includes('systems.top.*'));

/*
 * !top time
 * !top tips
 * !top points
 * !top messages
 * !top followage
 * !top subage
 * !top submonths
 * !top bits
 * !top gifts
 */

class Top extends System {
  @command('!top time')
  @default_permission(permission.CASTERS)
  public time(opts) {
    opts.parameters = TYPE.TIME;
    this.showTop(opts);
  }

  @command('!top tips')
  @default_permission(permission.CASTERS)
  public tips(opts) {
    opts.parameters = TYPE.TIPS;
    this.showTop(opts);
  }

  @command('!top points')
  @default_permission(permission.CASTERS)
  public points(opts) {
    opts.parameters = TYPE.POINTS;
    this.showTop(opts);
  }

  @command('!top messages')
  @default_permission(permission.CASTERS)
  public messages(opts) {
    opts.parameters = TYPE.MESSAGES;
    this.showTop(opts);
  }

  @command('!top followage')
  @default_permission(permission.CASTERS)
  public followage(opts) {
    opts.parameters = TYPE.FOLLOWAGE;
    this.showTop(opts);
  }

  @command('!top subage')
  @default_permission(permission.CASTERS)
  public subage(opts) {
    opts.parameters = TYPE.SUBAGE;
    this.showTop(opts);
  }

  @command('!top submonths')
  @default_permission(permission.CASTERS)
  public submonths(opts) {
    opts.parameters = TYPE.SUBMONTHS;
    this.showTop(opts);
  }

  @command('!top bits')
  @default_permission(permission.CASTERS)
  public bits(opts) {
    opts.parameters = TYPE.BITS;
    this.showTop(opts);
  }

  @command('!top gifts')
  @default_permission(permission.CASTERS)
  public gifts(opts) {
    opts.parameters = TYPE.GIFTS;
    this.showTop(opts);
  }

  private async showTop(opts) {
    let sorted: {username: string; value: number}[] = [];
    let message;
    let i = 0;
    const type = opts.parameters;

    // count ignored users
    const _total = 10 + getIgnoreList().length + 2; // 2 for bot and broadcaster

    moment.locale(global.lib.translate.lang);

    switch (type) {
      case TYPE.TIME:
        sorted = [];
        for (const user of (await global.db.engine.find('users.watched', { _sort: 'watched', _sum: 'watched', _total, _group: 'id' }))) {
          sorted.push({ username: await global.users.getNameById(user._id), value: user.watched });
        }
        message = global.translate('systems.top.time').replace(/\$amount/g, 10);
        break;
      case TYPE.TIPS:
        const users = {};
        const tips = await global.db.engine.find('users.tips');

        message = global.translate('systems.top.tips').replace(/\$amount/g, 10);
        for (const tip of tips) {
          const username = await global.users.getNameById(tip.id);
          if (_.isNil(users[username])) {
            users[username] = { username, value: 0 };
          }
          users[username].value += global.currency.exchange(Number(tip.amount), tip.currency, global.currency.mainCurrency);
        }
        sorted = _.orderBy(users, 'value', 'desc');
        break;
      case TYPE.POINTS:
        if (!global.systems.points.isEnabled()) {
          return;
        }

        sorted = [];
        for (const user of (await global.db.engine.find('users.points', { _sort: 'points', _sum: 'points', _total, _group: 'id' }))) {
          sorted.push({ username: await global.users.getNameById(user._id), value: user.points });
        }
        message = global.translate('systems.top.points').replace(/\$amount/g, 10);
        break;
      case TYPE.MESSAGES:
        sorted = [];
        for (const user of (await global.db.engine.find('users.messages', { _sort: 'messages', _sum: 'messages', _total, _group: 'id' }))) {
          sorted.push({ username: await global.users.getNameById(user._id), value: user.messages });
        }
        message = global.translate('systems.top.messages').replace(/\$amount/g, 10);
        break;
      case TYPE.FOLLOWAGE:
        sorted = [];
        for (const user of (await global.db.engine.find('users', { is: { follower: true }, _sort: '-time.follow', _total }))) {
          sorted.push({ username: user.username, value: user.time.follow });
        }
        message = global.translate('systems.top.followage').replace(/\$amount/g, 10);
        break;
      case TYPE.SUBAGE:
        sorted = [];
        for (const user of (await global.db.engine.find('users', { is: { subscriber: true }, _sort: '-time.subscribed_at', _total }))) {
          sorted.push({ username: user.username, value: user.time.subscribed_at });
        }
        message = global.translate('systems.top.subage').replace(/\$amount/g, 10);
        break;
      case TYPE.BITS:
        sorted = [];
        for (const user of (await global.db.engine.find('users.bits', { _sort: 'amount', _sum: 'amount', _total, _group: 'id' }))) {
          sorted.push({ username: await global.users.getNameById(user._id), value: user.amount });
        }
        message = global.translate('systems.top.bits').replace(/\$amount/g, 10);
        break;
      case TYPE.GIFTS:
        sorted = [];
        for (const user of (await global.db.engine.find('users', { _sort: 'custom.subgiftCount', _total }))) {
          sorted.push({ username: user.username, value: user.custom.subgiftCount });
        }
        message = global.translate('systems.top.gifts').replace(/\$amount/g, 10);
        break;
      case TYPE.SUBMONTHS:
        sorted = [];
        for (const user of (await global.db.engine.find('users', { _sort: 'stats.subCumulativeMonths', _total }))) {
          sorted.push({ username: user.username, value: user.stats.subCumulativeMonths });
        }
        message = global.translate('systems.top.submonths').replace(/\$amount/g, 10);
        break;
    }

    if (sorted.length > 0) {
      // remove ignored users
      const ignored: string[] = [];
      for (const user of sorted) {
        if (isIgnored({ username: user.username })) {
          ignored.push(user.username);
        }
      }

      _.remove(sorted, (o) => _.includes(ignored, o.username));
      // remove broadcaster and bot accounts
      _.remove(sorted, (o) => _.includes([getChannel(), global.oauth.botUsername.toLowerCase()], o.username));
      sorted = _.chunk(sorted, 10)[0];

      for (const user of sorted) {
        message += (i + 1) + '. ' + (global.tmi.showWithAt ? '@' : '') + (user.username || 'unknown') + ' - ';
        switch (type) {
          case TYPE.TIME:
            message += (user.value / 1000 / 60 / 60).toFixed(1) + 'h';
            break;
          case TYPE.SUBMONTHS:
            message += [user.value, getLocalizedName(user.value, 'core.months')].join(' ');
            break;
          case TYPE.TIPS:
            message += Number(user.value).toFixed(2) + global.currency.symbol(global.currency.mainCurrency);
            break;
          case TYPE.POINTS:
            message += user.value + ' ' + await global.systems.points.getPointsName(user.value);
            break;
          case TYPE.MESSAGES:
          case TYPE.BITS:
          case TYPE.GIFTS:
            message += String(user.value);
            break;
          case TYPE.FOLLOWAGE:
          case TYPE.SUBAGE:
            message += `${moment.utc(user.value).format('L')} (${moment.utc(user.value).fromNow()})`;
            break;
        }
        if (i + 1 < 10 && !_.isNil(sorted[i + 1])) {
          message += ', ';
        }
        i++;
      }
    } else {
      message += 'no data available';
    }
    if (__DEBUG__) {
      global.log.debug(message);
    }
    sendMessage(message, opts.sender, opts.attr);
  }
}

export default Top;
export { Top };

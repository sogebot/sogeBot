'use strict';

// 3rdparty libraries
import * as _ from 'lodash';
import * as moment from 'moment-timezone';

// bot libraries
import constants from '../constants';
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
 * !top bits
 * !top gifts
 */

class Top extends System {
  [x: string]: any; // TODO: remove after interface ported to TS

  constructor() {
    const options: InterfaceSettings = {
      settings: {
        commands: [
          { name: '!top time', permission: constants.OWNER_ONLY },
          { name: '!top tips', permission: constants.OWNER_ONLY },
          { name: '!top points', permission: constants.OWNER_ONLY },
          { name: '!top messages', permission: constants.OWNER_ONLY },
          { name: '!top followage', permission: constants.OWNER_ONLY },
          { name: '!top subage', permission: constants.OWNER_ONLY },
          { name: '!top bits', permission: constants.OWNER_ONLY },
          { name: '!top gifts', permission: constants.OWNER_ONLY },
        ],
      },
    };

    super(options);
  }

  public time(opts) {
    opts.parameters = TYPE.TIME;
    this.showTop(opts);
  }

  public tips(opts) {
    opts.parameters = TYPE.TIPS;
    this.showTop(opts);
  }

  public points(opts) {
    opts.parameters = TYPE.POINTS;
    this.showTop(opts);
  }

  public messages(opts) {
    opts.parameters = TYPE.MESSAGES;
    this.showTop(opts);
  }

  public followage(opts) {
    opts.parameters = TYPE.FOLLOWAGE;
    this.showTop(opts);
  }

  public subage(opts) {
    opts.parameters = TYPE.SUBAGE;
    this.showTop(opts);
  }

  public bits(opts) {
    opts.parameters = TYPE.BITS;
    this.showTop(opts);
  }

  public gifts(opts) {
    opts.parameters = TYPE.GIFTS;
    this.showTop(opts);
  }

  private async showTop(opts) {
    let sorted: Array<{username: string, value: number}> = [];
    let message;
    let i = 0;
    const type = opts.parameters;

    // count ignored users
    const _total = 10 + global.commons.getIgnoreList().length + 2; // 2 for bot and broadcaster

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
          users[username].value += global.currency.exchange(tip.amount, tip.currency, global.currency.settings.currency.mainCurrency);
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
    }

    if (sorted.length > 0) {
      // remove ignored users
      const ignored: string[] = [];
      for (const user of sorted) {
        if (await global.commons.isIgnored(user.username)) {
          ignored.push(user.username);
        }
      }

      _.remove(sorted, (o) => _.includes(ignored, o.username));
      // remove broadcaster and bot accounts
      _.remove(sorted, (o) => _.includes([global.commons.getChannel(), global.oauth.settings.bot.username.toLowerCase()], o.username));
      sorted = _.chunk(sorted, 10)[0];

      for (const user of sorted) {
        message += (i + 1) + '. ' + (global.users.settings.users.showWithAt ? '@' : '') + (user.username || 'unknown') + ' - ';
        switch (type) {
          case TYPE.TIME:
            message += (user.value / 1000 / 60 / 60).toFixed(1) + 'h';
            break;
          case TYPE.TIPS:
            message += user.value.toFixed(2) + global.currency.symbol(global.currency.settings.currency.mainCurrency);
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
    global.commons.sendMessage(message, opts.sender);
  }
}

module.exports = new Top();

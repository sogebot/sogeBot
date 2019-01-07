'use strict';

// 3rdparty libraries
import * as _ from 'lodash';
import * as moment from 'moment-timezone';

// bot libraries
import constants from '../constants';
import Expects from '../expects.js';
import System from './_interface';

enum TYPE {
  TIME,
  TIPS,
  POINTS,
  MESSAGES,
  FOLLOWAGE,
  BITS,
  GIFTS,
}

enum ERROR {
}

/*
 * !top time
 * !top tips
 * !top points
 * !top messages
 * !top followage
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
          { name: '!top bits', permission: constants.OWNER_ONLY },
          { name: '!top gifts', permission: constants.OWNER_ONLY },
        ],
      },
    };

    super(options);
  }

  public topTime(opts) {
    opts.parameters = TYPE.TIME;
    this.showTop(opts);
  }

  public topTips(opts) {
    opts.parameters = TYPE.TIPS;
    this.showTop(opts);
  }

  public topPoints(opts) {
    opts.parameters = TYPE.POINTS;
    this.showTop(opts);
  }

  public topMessages(opts) {
    opts.parameters = TYPE.MESSAGES;
    this.showTop(opts);
  }

  public topFollowage(opts) {
    opts.parameters = TYPE.FOLLOWAGE;
    this.showTop(opts);
  }

  public topBits(opts) {
    opts.parameters = TYPE.BITS;
    this.showTop(opts);
  }

  public topGifts(opts) {
    opts.parameters = TYPE.GIFTS;
    this.showTop(opts);
  }

  private async showTop(opts) {
    let sorted;
    let i = 0;
    const type = opts.parameters;

    // count ignored users
    const _total = 10 + global.commons.getIgnoreList().length + 2; // 2 for bot and broadcaster

    switch (type) {
      case TYPE.TIME:
      case TYPE.TIPS:
      case TYPE.POINTS:
      case TYPE.MESSAGES:
      case TYPE.FOLLOWAGE:
      case TYPE.BITS:
      case TYPE.GIFTS:
        break;
    }
/*
    if (type === TYPE.POINTS && await global.systems.points.isEnabled()) {
      sorted = [];
      for (let user of (await global.db.engine.find('users.points', { _sort: 'points', _sum: 'points', _total, _group: 'id' }))) {
        sorted.push({ username: await global.users.getNameById(user._id), points: user.points });
      }
      message = global.translate('top.listPoints').replace(/\$amount/g, 10);
    } else if (type === TYPE.TIME) {
      sorted = [];
      for (let user of (await global.db.engine.find('users.watched', { _sort: 'watched', _sum: 'watched', _total, _group: 'id' }))) {
        sorted.push({ username: await global.users.getNameById(user._id), watched: user.watched });
      }
      message = global.translate('top.listWatched').replace(/\$amount/g, 10);
    } else if (type === 'tips') {
      let users = {};
      message = global.translate('top.listTips').replace(/\$amount/g, 10);
      let tips = await global.db.engine.find('users.tips');
      for (let tip of tips) {
        const username = await global.users.getNameById(tip.id);
        if (_.isNil(users[username])) users[username] = { username: username, amount: 0 };
        users[username].amount += global.currency.exchange(tip.amount, tip.currency, global.currency.settings.currency.mainCurrency);
      }
      sorted = _.orderBy(users, 'amount', 'desc');
    } else if (type === 'messages') {
      sorted = [];
      for (let user of (await global.db.engine.find('users.messages', { _sort: 'messages', _sum: 'messages', _total, _group: 'id' }))) {
        sorted.push({ username: await global.users.getNameById(user._id), messages: user.messages });
      }
      message = global.translate('top.listMessages').replace(/\$amount/g, 10);
    } else if (type === 'followage') {
      sorted = [];
      for (let user of (await global.db.engine.find('users', { _sort: '-time.follow', _total }))) {
        sorted.push({ username: user.username, followage: user.time.follow });
      }
      message = global.translate('top.listFollowage').replace(/\$amount/g, 10);
    }

    if (sorted.length > 0) {
      // remove ignored users
      let ignored = [];
      for (let user of sorted) {
        if (await global.commons.isIgnored(user.username)) ignored.push(user.username);
      }
      _.remove(sorted, (o) => _.includes(ignored, o.username));

      // remove broadcaster and bot accounts
      _.remove(sorted, o => _.includes([global.commons.getChannel(), global.oauth.settings.bot.username.toLowerCase()], o.username));

      sorted = _.chunk(sorted, 10)[0];

      moment.locale(global.lib.translate.lang);
      for (let user of sorted) {
        message += (i + 1) + '. ' + (await global.configuration.getValue('atUsername') ? '@' : '') + (user.username || 'unknown') + ' - ';
        if (type === 'time') message += (user.watched / 1000 / 60 / 60).toFixed(1) + 'h';
        else if (type === 'tips') message += user.amount.toFixed(2) + global.currency.symbol(global.currency.settings.currency.mainCurrency);
        else if (type === 'points') {
          let points = user.points;
          message += points + ' ' + await global.systems.points.getPointsName(user.points);
        } else if (type === 'messages') message += user.messages;
        else if (type === 'followage') {
          message += `${moment(user.followage).format('L')} (${moment(user.followage).fromNow()})`;
        }
        if (i + 1 < 10 && !_.isNil(sorted[i + 1])) message += ', ';
        i++;
      }
    } else {
      message += 'no data available';
    }
    global.commons.sendMessage(message, opts.sender);
    */
  }
}

module.exports = new Top();

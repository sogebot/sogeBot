'use strict';

// 3rdparty libraries
import * as _ from 'lodash';
import * as moment from 'moment-timezone';

// bot libraries
import constants from '../constants';
import System from './_interface';

const __DEBUG__ =
  (process.env.DEBUG && process.env.DEBUG.includes('systems.*')) ||
  (process.env.DEBUG && process.env.DEBUG.includes('systems.userinfo')) ||
  (process.env.DEBUG && process.env.DEBUG.includes('systems.userinfo.*'));

/*
 * !me
 */

class UserInfo extends System {
  [x: string]: any; // TODO: remove after interface ported to TS

  constructor() {
    const options: InterfaceSettings = {
      settings: {
        me: {
          format: '$sender $rank $watched $points $messages $tips',
          formatSeparator: '|',
        },
        commands: [
          { name: '!me', fnc: 'showMe', permission: constants.VIEWERS },
          { name: '!lastseen', fnc: 'lastseen', permission: constants.VIEWERS },
          { name: '!watched', fnc: 'watched', permission: constants.VIEWERS },
          { name: '!followage', fnc: 'followage', permission: constants.VIEWERS },
          { name: '!subage', fnc: 'subage', permission: constants.VIEWERS },
          { name: '!age', fnc: 'age', permission: constants.VIEWERS },
        ],
      },
      on: {
        message: (e) => this.onMessage(e),
      },
    };
    super(options);
  }

  private onMessage(opts: onEventMessage) {
    if (!_.isNil(opts.sender) && !_.isNil(opts.sender.userId) && !_.isNil(opts.sender.username)) {
      global.users.setById(opts.sender.userId, {
        username: opts.sender.username,
        time: { message: new Date().getTime() },
        is: { subscriber: opts.sender.isSubscriber || opts.sender.isTurboSubscriber },
      }, true);
      global.db.engine.update('users.online', { username: opts.sender.username }, { username: opts.sender.username });
    }
    return true;
  }

  private async followage (opts: CommandOptions) {
    let username
    let parsed = opts.parameters.match(/([^@]\S*)/g)

    if (_.isNil(parsed)) username = opts.sender.username
    else username = parsed[0].toLowerCase()

    const user = await global.users.getByName(username)
    if (_.isNil(user) || _.isNil(user.time) || _.isNil(user.time.follow) || _.isNil(user.is.follower) || !user.is.follower) {
      let message = await global.commons.prepare('followage.success.never', { username: username })
      global.commons.sendMessage(message, opts.sender)
    } else {
      let diff = moment.preciseDiff(moment(user.time.follow).valueOf(), moment().valueOf(), true)
      let output = []
      if (diff.years) output.push(diff.years + ' ' + global.commons.getLocalizedName(diff.years, 'core.years'))
      if (diff.months) output.push(diff.months + ' ' + global.commons.getLocalizedName(diff.months, 'core.months'))
      if (diff.days) output.push(diff.days + ' ' + global.commons.getLocalizedName(diff.days, 'core.days'))
      if (diff.hours) output.push(diff.hours + ' ' + global.commons.getLocalizedName(diff.hours, 'core.hours'))
      if (diff.minutes) output.push(diff.minutes + ' ' + global.commons.getLocalizedName(diff.minutes, 'core.minutes'))
      if (output.length === 0) output.push(0 + ' ' + global.commons.getLocalizedName(0, 'core.minutes'))

      let message = await global.commons.prepare('followage.success.time', {
        username: username,
        diff: output.join(', ')
      })
      global.commons.sendMessage(message, opts.sender)
    }
  }

  private async subage (opts) {
    let username
    let parsed = opts.parameters.match(/([^@]\S*)/g)

    if (_.isNil(parsed)) username = opts.sender.username
    else username = parsed[0].toLowerCase()

    const user = await global.users.getByName(username)
    if (_.isNil(user) || _.isNil(user.time) || _.isNil(user.time.subscribed_at) || _.isNil(user.is.subscriber) || !user.is.subscriber) {
      let message = await global.commons.prepare('subage.success.never', { username: username })
      global.commons.sendMessage(message, opts.sender)
    } else {
      let diff = moment.preciseDiff(moment(user.time.subscribed_at).valueOf(), moment().valueOf(), true)
      let output = []
      if (diff.years) output.push(diff.years + ' ' + global.commons.getLocalizedName(diff.years, 'core.years'))
      if (diff.months) output.push(diff.months + ' ' + global.commons.getLocalizedName(diff.months, 'core.months'))
      if (diff.days) output.push(diff.days + ' ' + global.commons.getLocalizedName(diff.days, 'core.days'))
      if (diff.hours) output.push(diff.hours + ' ' + global.commons.getLocalizedName(diff.hours, 'core.hours'))
      if (diff.minutes) output.push(diff.minutes + ' ' + global.commons.getLocalizedName(diff.minutes, 'core.minutes'))
      if (output.length === 0) output.push(0 + ' ' + global.commons.getLocalizedName(0, 'core.minutes'))

      let message = await global.commons.prepare('subage.success.time', {
        username: username,
        diff: output.join(', ')
      })
      global.commons.sendMessage(message, opts.sender)
    }
  }

  private async age (opts) {
    let username
    let parsed = opts.parameters.match(/([^@]\S*)/g)

    if (_.isNil(parsed)) username = opts.sender.username
    else username = parsed[0].toLowerCase()

    const user = await global.users.getByName(username)
    if (_.isNil(user) || _.isNil(user.time) || _.isNil(user.time.created_at)) {
      let message = await global.commons.prepare('age.failed', { username: username })
      global.commons.sendMessage(message, opts.sender)
    } else {
      let diff = moment.preciseDiff(moment(user.time.created_at).valueOf(), moment().valueOf(), true)
      let output = []
      if (diff.years) output.push(diff.years + ' ' + global.commons.getLocalizedName(diff.years, 'core.years'))
      if (diff.months) output.push(diff.months + ' ' + global.commons.getLocalizedName(diff.months, 'core.months'))
      if (diff.days) output.push(diff.days + ' ' + global.commons.getLocalizedName(diff.days, 'core.days'))
      if (diff.hours) output.push(diff.hours + ' ' + global.commons.getLocalizedName(diff.hours, 'core.hours'))
      let message = await global.commons.prepare(!_.isNil(parsed) ? 'age.success.withUsername' : 'age.success.withoutUsername', {
        username: username,
        diff: output.join(', ')
      })
      global.commons.sendMessage(message, opts.sender)
    }
  }

  private async lastseen (opts) {
    try {
      var parsed = opts.parameters.match(/^([\S]+)$/)
      const user = await global.users.getByName(parsed[0])
      if (_.isNil(user) || _.isNil(user.time) || _.isNil(user.time.message)) {
        global.commons.sendMessage(global.translate('lastseen.success.never').replace(/\$username/g, parsed[0]), opts.sender)
      } else {
        global.commons.sendMessage(global.translate('lastseen.success.time')
          .replace(/\$username/g, parsed[0])
          .replace(/\$when/g, moment.unix(user.time.message / 1000).format('DD-MM-YYYY HH:mm:ss')), opts.sender)
      }
    } catch (e) {
      global.commons.sendMessage(global.translate('lastseen.failed.parse'), opts.sender)
    }
  }

  private async watched (opts) {
    try {
      const parsed = opts.parameters.match(/^([\S]+)$/)

      let id = opts.sender.userId
      let username = opts.sender.username

      if (parsed) {
        username = parsed[0].toLowerCase()
        id = await global.users.getIdByName(username)
      }

      const time = id ? Number((await global.users.getWatchedOf(id) / (60 * 60 * 1000))).toFixed(1) : 0

      let m = await global.commons.prepare('watched.success.time', { time, username })
      global.commons.sendMessage(m, opts.sender)
    } catch (e) {
      global.commons.sendMessage(global.translate('watched.failed.parse'), opts.sender)
    }
  }

  private async showMe (opts: Object) {
    try {
      var message = ['$sender']

      // rank
      var rank = await global.systems.ranks.get(opts.sender.username)
      if (await global.systems.ranks.isEnabled() && !_.isNull(rank)) message.push(rank)

      // watchTime
      var watched = await global.users.getWatchedOf(opts.sender.userId)
      message.push((watched / 1000 / 60 / 60).toFixed(1) + 'h')

      // points
      if (await global.systems.points.isEnabled()) {
        let userPoints = await global.systems.points.getPointsOf(opts.sender.userId)
        message.push(userPoints + ' ' + await global.systems.points.getPointsName(userPoints))
      }

      // message count
      var messages = await global.users.getMessagesOf(opts.sender.userId)
      message.push(messages + ' ' + global.commons.getLocalizedName(messages, 'core.messages'))

      // tips
      const tips = await global.db.engine.find('users.tips', { id: opts.sender.userId })
      const currency = global.currency.settings.currency.mainCurrency
      let tipAmount = 0
      for (let t of tips) {
        tipAmount += global.currency.exchange(t.amount, t.currency, currency)
      }
      message.push(`${Number(tipAmount).toFixed(2)}${global.currency.symbol(currency)}`)

      global.commons.sendMessage(message.join(' | '), opts.sender)
    } catch (e) {
      global.log.error(e.stack)
    }
  }
}

module.exports = new UserInfo();

'use strict'

const constants = require('./constants')
const moment = require('moment')
const _ = require('lodash')
const debug = require('debug')
const cluster = require('cluster')
require('moment-precise-range-plugin')

const config = require('../config.json')

class Twitch {
  constructor () {
    if (require('cluster').isMaster) {
      global.panel.addWidget('twitch', 'widget-title-monitor', 'fab fa-twitch')

      global.panel.registerSockets({
        self: this,
        expose: ['sendTwitchVideo'],
        finally: null
      })
    }
  }

  commands () {
    const commands = [
      {this: this, command: '!uptime', fnc: this.uptime, permission: constants.VIEWERS},
      {this: this, command: '!time', fnc: this.time, permission: constants.VIEWERS},
      {this: this, command: '!lastseen', fnc: this.lastseen, permission: constants.VIEWERS},
      {this: this, command: '!watched', fnc: this.watched, permission: constants.VIEWERS},
      {this: this, command: '!followage', fnc: this.followage, permission: constants.VIEWERS},
      {this: this, command: '!subage', fnc: this.subage, permission: constants.VIEWERS},
      {this: this, command: '!followers', fnc: this.followers, permission: constants.VIEWERS},
      {this: this, command: '!subs', fnc: this.subs, permission: constants.VIEWERS},
      {this: this, command: '!age', fnc: this.age, permission: constants.VIEWERS},
      {this: this, command: '!me', fnc: this.showMe, permission: constants.VIEWERS},
      {this: this, command: '!top time', fnc: this.showTopTime, permission: constants.OWNER_ONLY},
      {this: this, command: '!top tips', fnc: this.showTopTips, permission: constants.OWNER_ONLY},
      {this: this, command: '!top messages', fnc: this.showTopMessages, permission: constants.OWNER_ONLY},
      {this: this, command: '!title', fnc: this.setTitle, permission: constants.OWNER_ONLY},
      {this: this, command: '!game', fnc: this.setGame, permission: constants.OWNER_ONLY}
    ]
    if (global.commons.isSystemEnabled('points')) commands.push({this: this, command: '!top points', fnc: this.showTopPoints, permission: constants.OWNER_ONLY})
    return commands
  }

  parsers () {
    return [
      {this: this, name: 'lastseen', fnc: this.lastseenUpdate, permission: constants.VIEWERS, priority: constants.LOWEST}
    ]
  }

  sendTwitchVideo (self, socket) {
    socket.emit('twitchVideo', config.settings.broadcaster_username.toLowerCase())
  }

  async uptime (self, sender) {
    const when = await global.cache.when()
    const time = global.commons.getTime(await global.cache.isOnline() ? when.online : when.offline, true)
    global.commons.sendMessage(global.translate(await global.cache.isOnline() ? 'uptime.online' : 'uptime.offline')
      .replace(/\$days/g, time.days)
      .replace(/\$hours/g, time.hours)
      .replace(/\$minutes/g, time.minutes)
      .replace(/\$seconds/g, time.seconds), sender)
  }

  async time (self, sender) {
    let message = await global.commons.prepare('time', { time: moment().format('LTS') })
    debug(message); global.commons.sendMessage(message, sender)
  }

  async lastseenUpdate (self, sender, text) {
    if (!_.isNull(sender)) {
      global.users.set(sender.username, {
        time: { message: new Date().getTime() },
        is: { subscriber: !_.isNil(sender.subscriber) ? sender.subscriber : false }
      }, true)
      global.db.engine.update('users.online', { username: sender.username }, { username: sender.username })
    }
    return true
  }

  async followage (self, sender, text) {
    let username
    let parsed = text.match(/([^@]\S*)/g)

    if (_.isNil(parsed)) username = sender.username
    else username = parsed[0].toLowerCase()

    const user = await global.users.get(username)
    if (_.isNil(user) || _.isNil(user.time) || _.isNil(user.time.follow) || _.isNil(user.is.follower) || !user.is.follower) {
      let message = await global.commons.prepare('followage.success.never', { username: username })
      debug(message); global.commons.sendMessage(message, sender)
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
      debug(message); global.commons.sendMessage(message, sender)
    }
  }

  async followers (self, sender) {
    const d = debug('twitch:followers')
    let events = await global.db.engine.find('widgetsEventList')
    const onlineViewers = await global.db.engine.find('users.online')

    let onlineFollowers = []
    for (let viewer of onlineViewers) {
      let user = await global.db.engine.find('users', { username: viewer.username, is: { follower: true } })
      if (!_.isEmpty(user)) onlineFollowers.push(user.username)
    }

    events = _.filter(_.orderBy(events, 'timestamp', 'desc'), (o) => { return o.event === 'follow' })
    moment.locale(await global.configuration.getValue('lang'))

    let lastFollowAgo = ''
    let lastFollowUsername = 'n/a'
    let onlineFollowersCount = _.size(_.filter(onlineFollowers, (o) => o !== config.settings.broadcaster_username && o !== config.settings.bot_username)) // except bot and user
    if (events.length > 0) {
      lastFollowUsername = events[0].username
      lastFollowAgo = moment(events[0].timestamp).fromNow()
    }

    let message = await global.commons.prepare('followers', {
      lastFollowAgo: lastFollowAgo,
      lastFollowUsername: lastFollowUsername,
      onlineFollowersCount: onlineFollowersCount
    })
    d(message); global.commons.sendMessage(message, sender)
  }

  async subs (self, sender) {
    const d = debug('twitch:subs')
    let events = await global.db.engine.find('widgetsEventList')
    const onlineViewers = await global.db.engine.find('users.online')

    let onlineSubscribers = []
    for (let viewer of onlineViewers) {
      let user = await global.db.engine.find('users', { username: viewer.username, is: { subscriber: true } })
      if (!_.isEmpty(user)) onlineSubscribers.push(user.username)
    }

    events = _.filter(_.orderBy(events, 'timestamp', 'desc'), (o) => { return o.event === 'sub' || o.event === 'resub' || o.event === 'subgift' })
    moment.locale(await global.configuration.getValue('lang'))

    let lastSubAgo = ''
    let lastSubUsername = 'n/a'
    let onlineSubCount = _.size(_.filter(onlineSubscribers, (o) => o !== config.settings.broadcaster_username && o !== config.settings.bot_username)) // except bot and user
    if (events.length > 0) {
      lastSubUsername = events[0].username
      lastSubAgo = moment(events[0].timestamp).fromNow()
    }

    let message = await global.commons.prepare('subs', {
      lastSubAgo: lastSubAgo,
      lastSubUsername: lastSubUsername,
      onlineSubCount: onlineSubCount
    })
    d(message); global.commons.sendMessage(message, sender)
  }

  async subage (self, sender, text) {
    let username
    let parsed = text.match(/([^@]\S*)/g)

    if (_.isNil(parsed)) username = sender.username
    else username = parsed[0].toLowerCase()

    const user = await global.users.get(username)
    if (_.isNil(user) || _.isNil(user.time) || _.isNil(user.time.subscribed_at) || _.isNil(user.is.subscriber) || !user.is.subscriber) {
      let message = await global.commons.prepare('subage.success.never', { username: username })
      debug(message); global.commons.sendMessage(message, sender)
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
      debug(message); global.commons.sendMessage(message, sender)
    }
  }

  async age (self, sender, text) {
    let username
    let parsed = text.match(/([^@]\S*)/g)

    if (_.isNil(parsed)) username = sender.username
    else username = parsed[0].toLowerCase()

    const user = await global.users.get(username)
    if (_.isNil(user) || _.isNil(user.time) || _.isNil(user.time.created_at)) {
      let message = await global.commons.prepare('age.failed', { username: username })
      debug(message); global.commons.sendMessage(message, sender)
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
      debug(message); global.commons.sendMessage(message, sender)
    }
  }

  async lastseen (self, sender, text) {
    try {
      var parsed = text.match(/^([\S]+)$/)
      const user = await global.users.get(parsed[0])
      if (_.isNil(user) || _.isNil(user.time) || _.isNil(user.time.message)) {
        global.commons.sendMessage(global.translate('lastseen.success.never').replace(/\$username/g, parsed[0]), sender)
      } else {
        global.commons.sendMessage(global.translate('lastseen.success.time')
          .replace(/\$username/g, parsed[0])
          .replace(/\$when/g, moment.unix(user.time.message / 1000).format('DD-MM-YYYY HH:mm:ss')), sender)
      }
    } catch (e) {
      global.commons.sendMessage(global.translate('lastseen.failed.parse'), sender)
    }
  }

  async watched (self, sender, text) {
    try {
      let watched, parsed
      parsed = text.match(/^([\S]+)$/)
      const user = await global.users.get(text.trim() < 1 ? sender.username : parsed[0])
      watched = parseInt(!_.isNil(user) && !_.isNil(user.time) && !_.isNil(user.time.watched) ? user.time.watched : 0) / 1000 / 60 / 60

      let m = await global.commons.prepare('watched.success.time', {
        time: watched.toFixed(1),
        username: user.username
      })
      debug(m); global.commons.sendMessage(m, sender)
    } catch (e) {
      global.commons.sendMessage(global.translate('watched.failed.parse'), sender)
    }
  }

  async showMe (self, sender, text) {
    try {
      const user = await global.users.get(sender.username)
      var message = ['$sender']

      // rank
      var rank = await global.systems.ranks.get(user)
      if (global.commons.isSystemEnabled('ranks') && !_.isNull(rank)) message.push(rank)

      // watchTime
      var watchTime = _.isFinite(parseInt(user.time.watched, 10)) && _.isNumber(parseInt(user.time.watched, 10)) ? user.time.watched : 0
      message.push((watchTime / 1000 / 60 / 60).toFixed(1) + 'h')

      // points
      if (global.commons.isSystemEnabled('points')) message.push(user.points + ' ' + await global.systems.points.getPointsName(user.points))

      // message count
      var messages = !_.isUndefined(user.stats.messages) ? user.stats.messages : 0
      message.push(messages + ' ' + global.commons.getLocalizedName(messages, 'core.messages'))

      global.commons.sendMessage(message.join(' | '), sender)
    } catch (e) {
      global.log.error(e.stack)
    }
  }

  showTopMessages (self, sender, text) {
    self.showTop(self, sender, 'messages')
  }

  showTopTips (self, sender, text) {
    self.showTop(self, sender, 'tips')
  }

  showTopPoints (self, sender, text) {
    self.showTop(self, sender, 'points')
  }

  showTopTime (self, sender, text) {
    self.showTop(self, sender, 'time')
  }

  async showTop (self, sender, text) {
    let sorted, message
    let type = text.trim().match(/^(time|points|messages|tips)$/)
    let i = 0

    if (_.isNil(type)) type = 'time'
    else type = type[1]

    let users = await global.users.getAll()
    if (type === 'points' && global.commons.isSystemEnabled('points')) {
      message = global.translate('top.listPoints').replace(/\$amount/g, 10)
      sorted = _.orderBy(_.filter(users, function (o) { return !_.isNil(o.points) && !global.commons.isOwner(o.username) && o.username !== config.settings.bot_username }), 'points', 'desc')
    } else if (type === 'time') {
      message = global.translate('top.listWatched').replace(/\$amount/g, 10)
      sorted = _.orderBy(_.filter(users, function (o) { return !_.isNil(o.time) && !_.isNil(o.time.watched) && !global.commons.isOwner(o.username) && o.username !== config.settings.bot_username }), 'time.watched', 'desc')
    } else if (type === 'tips') {
      sorted = {}
      message = global.translate('top.listTips').replace(/\$amount/g, 10)
      let tips = await global.db.engine.find('users.tips')
      for (let tip of tips) {
        if (_.isNil(sorted[tip.username])) sorted[tip.username] = { username: tip.username, amount: 0 }
        sorted[tip.username].amount += global.currency.exchange(tip.amount, tip.currency, await global.configuration.getValue('currency'))
      }
      sorted = _.orderBy(sorted, 'amount', 'desc')
    } else {
      message = global.translate('top.listMessages').replace(/\$amount/g, 10)
      sorted = _.orderBy(_.filter(users, function (o) { return !_.isNil(o.stats) && !_.isNil(o.stats.messages) && !global.commons.isOwner(o.username) && o.username !== config.settings.bot_username }), 'stats.messages', 'desc')
    }

    // remove ignored users
    if (sorted.length > 0) {
      let ignored = []
      for (let user of sorted) {
        let ignoredUser = await global.db.engine.findOne('users_ignorelist', { username: user.username })
        if (!_.isEmpty(ignoredUser)) ignored.push(user.username)
      }
      _.remove(sorted, (o) => _.includes(ignored, o.username))
    }

    sorted = _.chunk(sorted, 10)[0]
    for (let user of sorted) {
      message += (i + 1) + '. ' + (await global.configuration.getValue('atUsername') ? '@' : '') + user.username + ' - '
      if (type === 'time') message += (user.time.watched / 1000 / 60 / 60).toFixed(1) + 'h'
      else if (type === 'tips') message += user.amount.toFixed(2) + global.currency.symbol(await global.configuration.getValue('currency'))
      else if (type === 'points') message += user.points + ' ' + await global.systems.points.getPointsName(user.points)
      else message += user.stats.messages
      if (i + 1 < 10 && !_.isNil(sorted[i + 1])) message += ', '
      i++
    }
    global.commons.sendMessage(message, sender)
  }

  setTitle (self, sender, text) {
    if (text.trim().length === 0) {
      global.commons.sendMessage(global.translate('title.current')
        .replace(/\$title/g, self.current.status), sender)
      return
    }
    if (cluster.isMaster) global.api.setTitleAndGame(self, sender, { title: text })
    else process.send({ type: 'call', ns: 'api', fnc: 'setTitleAndGame', args: { 0: sender, 1: { title: text } } })
  }

  setGame (self, sender, text) {
    if (text.trim().length === 0) {
      global.commons.sendMessage(global.translate('game.current')
        .replace(/\$game/g, self.current.game), sender)
      return
    }
    if (cluster.isMaster) global.api.setTitleAndGame(self, sender, { game: text })
    else process.send({ type: 'call', ns: 'api', fnc: 'setTitleAndGame', args: { 0: sender, 1: { game: text } } })
  }
}

module.exports = Twitch

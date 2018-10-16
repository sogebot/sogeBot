'use strict'

const constants = require('./constants')
const moment = require('moment-timezone')
const _ = require('lodash')
const cluster = require('cluster')
require('moment-precise-range-plugin')

const config = require('@config')
config.timezone = config.timezone === 'system' || _.isNil(config.timezone) ? moment.tz.guess() : config.timezone

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
      { this: this, id: '!uptime', command: '!uptime', fnc: this.uptime, permission: constants.VIEWERS },
      { this: this, id: '!time', command: '!time', fnc: this.time, permission: constants.VIEWERS },
      { this: this, id: '!lastseen', command: '!lastseen', fnc: this.lastseen, permission: constants.VIEWERS },
      { this: this, id: '!watched', command: '!watched', fnc: this.watched, permission: constants.VIEWERS },
      { this: this, id: '!followage', command: '!followage', fnc: this.followage, permission: constants.VIEWERS },
      { this: this, id: '!subage', command: '!subage', fnc: this.subage, permission: constants.VIEWERS },
      { this: this, id: '!followers', command: '!followers', fnc: this.followers, permission: constants.VIEWERS },
      { this: this, id: '!subs', command: '!subs', fnc: this.subs, permission: constants.VIEWERS },
      { this: this, id: '!age', command: '!age', fnc: this.age, permission: constants.VIEWERS },
      { this: this, id: '!top time', command: '!top time', fnc: this.showTopTime, permission: constants.OWNER_ONLY },
      { this: this, id: '!top tips', command: '!top tips', fnc: this.showTopTips, permission: constants.OWNER_ONLY },
      { this: this, id: '!top points', command: '!top points', fnc: this.showTopPoints, permission: constants.OWNER_ONLY },
      { this: this, id: '!top messages', command: '!top messages', fnc: this.showTopMessages, permission: constants.OWNER_ONLY },
      { this: this, id: '!top followage', command: '!top followage', fnc: this.showTopFollowAge, permission: constants.OWNER_ONLY },
      { this: this, id: '!title', command: '!title', fnc: this.getTitle, permission: constants.VIEWERS },
      { this: this, id: '!title set', command: '!title set', fnc: this.setTitle, permission: constants.OWNER_ONLY },
      { this: this, id: '!game', command: '!game', fnc: this.getGame, permission: constants.VIEWERS },
      { this: this, id: '!game set', command: '!game set', fnc: this.setGame, permission: constants.OWNER_ONLY }
    ]
    return commands
  }

  parsers () {
    return [
      { this: this, name: 'lastseen', fnc: this.lastseenUpdate, permission: constants.VIEWERS, priority: constants.LOWEST }
    ]
  }

  async sendTwitchVideo (self, socket) {
    socket.emit('twitchVideo', (await global.oauth.settings.broadcaster.username).toLowerCase())
  }

  async uptime (opts) {
    const when = await global.cache.when()
    const time = global.commons.getTime(await global.cache.isOnline() ? when.online : when.offline, true)
    global.commons.sendMessage(global.translate(await global.cache.isOnline() ? 'uptime.online' : 'uptime.offline')
      .replace(/\$days/g, time.days)
      .replace(/\$hours/g, time.hours)
      .replace(/\$minutes/g, time.minutes)
      .replace(/\$seconds/g, time.seconds), opts.sender)
  }

  async time (opts) {
    let message = await global.commons.prepare('time', { time: moment().tz(config.timezone).format('LTS') })
    global.commons.sendMessage(message, opts.sender)
  }

  async lastseenUpdate (opts) {
    if (!_.isNil(opts.sender) && !_.isNil(opts.sender.userId) && !_.isNil(opts.sender.username)) {
      global.users.setById(opts.sender.userId, {
        username: opts.sender.username,
        time: { message: new Date().getTime() },
        is: { subscriber: opts.sender.isSubscriber || opts.sender.isTurboSubscriber }
      }, true)
      global.db.engine.update('users.online', { username: opts.sender.username }, { username: opts.sender.username })
    }
    return true
  }

  async followage (opts) {
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

  async followers (opts) {
    let events = await global.db.engine.find('widgetsEventList')
    const onlineViewers = (await global.db.engine.find('users.online')).map((o) => o.username)
    const followers = (await global.db.engine.find('users', { is: { follower: true } })).map((o) => o.username)

    let onlineFollowers = _.intersection(onlineViewers, followers)
    events = _.filter(_.orderBy(events, 'timestamp', 'desc'), (o) => { return o.event === 'follow' })
    moment.locale(await global.configuration.getValue('lang'))

    let lastFollowAgo = ''
    let lastFollowUsername = 'n/a'
    let onlineFollowersCount = _.size(_.filter(onlineFollowers, (o) => o !== global.oauth.settings.bot.username.toLowerCase() && o !== global.commons.getBroadcaster().toLowerCase())) // except bot and user
    if (events.length > 0) {
      lastFollowUsername = events[0].username
      lastFollowAgo = moment(events[0].timestamp).fromNow()
    }

    let message = await global.commons.prepare('followers', {
      lastFollowAgo: lastFollowAgo,
      lastFollowUsername: lastFollowUsername,
      onlineFollowersCount: onlineFollowersCount
    })
    global.commons.sendMessage(message, opts.sender)
  }

  async subs (opts) {
    let events = await global.db.engine.find('widgetsEventList')
    const onlineViewers = (await global.db.engine.find('users.online')).map((o) => o.username)
    const subscribers = (await global.db.engine.find('users', { is: { subscriber: true } })).map((o) => o.username)

    let onlineSubscribers = _.intersection(onlineViewers, subscribers)
    events = _.filter(_.orderBy(events, 'timestamp', 'desc'), (o) => { return o.event === 'sub' || o.event === 'resub' || o.event === 'subgift' })
    moment.locale(await global.configuration.getValue('lang'))

    let lastSubAgo = ''
    let lastSubUsername = 'n/a'
    let onlineSubCount = _.size(_.filter(onlineSubscribers, (o) => o !== global.commons.getBroadcaster().toLowerCase() && o !== global.oauth.settings.bot.username.toLowerCase())) // except bot and user
    if (events.length > 0) {
      lastSubUsername = events[0].username
      lastSubAgo = moment(events[0].timestamp).fromNow()
    }

    let message = await global.commons.prepare('subs', {
      lastSubAgo: lastSubAgo,
      lastSubUsername: lastSubUsername,
      onlineSubCount: onlineSubCount
    })
    global.commons.sendMessage(message, opts.sender)
  }

  async subage (opts) {
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

  async age (opts) {
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

  async lastseen (opts) {
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

  async watched (opts) {
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

  showTopFollowAge (opts) {
    opts.parameters = 'followage'
    this.showTop(opts)
  }

  showTopMessages (opts) {
    opts.parameters = 'messages'
    this.showTop(opts)
  }

  showTopTips (opts) {
    opts.parameters = 'tips'
    this.showTop(opts)
  }

  showTopPoints (opts) {
    opts.parameters = 'points'
    this.showTop(opts)
  }

  showTopTime (opts) {
    opts.parameters = 'time'
    this.showTop(opts)
  }

  async showTop (opts) {
    let sorted, message
    let type = opts.parameters.match(/^(time|points|messages|tips|followage)$/)
    let i = 0

    if (_.isNil(type)) type = 'time'
    else type = type[1]

    // count ignored users
    let _total = 10 + global.commons.getIgnoreList().length + 2 // 2 for bot and broadcaster
    if (type === 'points' && await global.systems.points.isEnabled()) {
      sorted = []
      for (let user of (await global.db.engine.find('users.points', { _sort: 'points', _sum: 'points', _total, _group: 'id' }))) {
        sorted.push({ username: await global.users.getNameById(user._id), points: user.points })
      }
      message = global.translate('top.listPoints').replace(/\$amount/g, 10)
    } else if (type === 'time') {
      sorted = []
      for (let user of (await global.db.engine.find('users.watched', { _sort: 'watched', _sum: 'watched', _total, _group: 'id' }))) {
        sorted.push({ username: await global.users.getNameById(user._id), watched: user.watched })
      }
      message = global.translate('top.listWatched').replace(/\$amount/g, 10)
    } else if (type === 'tips') {
      let users = {}
      message = global.translate('top.listTips').replace(/\$amount/g, 10)
      let tips = await global.db.engine.find('users.tips')
      for (let tip of tips) {
        const username = await global.users.getNameById(tip.id)
        if (_.isNil(users[username])) users[username] = { username: username, amount: 0 }
        users[username].amount += global.currency.exchange(tip.amount, tip.currency, await global.configuration.getValue('currency'))
      }
      sorted = _.orderBy(users, 'amount', 'desc')
    } else if (type === 'messages') {
      sorted = []
      for (let user of (await global.db.engine.find('users.messages', { _sort: 'messages', _sum: 'messages', _total, _group: 'id' }))) {
        sorted.push({ username: await global.users.getNameById(user._id), messages: user.messages })
      }
      message = global.translate('top.listMessages').replace(/\$amount/g, 10)
    } else if (type === 'followage') {
      sorted = []
      for (let user of (await global.db.engine.find('users', { _sort: '-time.follow', _total }))) {
        sorted.push({ username: user.username, followage: user.time.follow })
      }
      message = global.translate('top.listFollowage').replace(/\$amount/g, 10)
    }

    if (sorted.length > 0) {
      // remove ignored users
      let ignored = []
      for (let user of sorted) {
        if (await global.commons.isIgnored(user.username)) ignored.push(user.username)
      }
      _.remove(sorted, (o) => _.includes(ignored, o.username))

      // remove broadcaster and bot accounts
      _.remove(sorted, o => _.includes([global.commons.getBroadcaster().toLowerCase(), global.oauth.settings.bot.username.toLowerCase()], o.username))

      sorted = _.chunk(sorted, 10)[0]

      moment.locale(global.lib.translate.lang)
      for (let user of sorted) {
        message += (i + 1) + '. ' + (await global.configuration.getValue('atUsername') ? '@' : '') + (user.username || 'unknown') + ' - '
        if (type === 'time') message += (user.watched / 1000 / 60 / 60).toFixed(1) + 'h'
        else if (type === 'tips') message += user.amount.toFixed(2) + global.currency.symbol(await global.configuration.getValue('currency'))
        else if (type === 'points') {
          let points = user.points
          message += points + ' ' + await global.systems.points.getPointsName(user.points)
        } else if (type === 'messages') message += user.messages
        else if (type === 'followage') {
          message += `${moment(user.followage).format('L')} (${moment(user.followage).fromNow()})`
        }
        if (i + 1 < 10 && !_.isNil(sorted[i + 1])) message += ', '
        i++
      }
    } else {
      message += 'no data available'
    }
    console.log(message)
    global.commons.sendMessage(message, opts.sender)
  }

  async getTitle (opts) {
    global.commons.sendMessage(global.translate('title.current')
      .replace(/\$title/g, _.get(await global.db.engine.findOne('api.current', { key: 'title' }), 'value', 'n/a')), opts.sender)
  }

  async setTitle (opts) {
    if (opts.parameters.length === 0) {
      global.commons.sendMessage(global.translate('title.current')
        .replace(/\$title/g, _.get(await global.db.engine.findOne('api.current', { key: 'title' }), 'value', 'n/a')), opts.sender)
      return
    }
    if (cluster.isMaster) global.api.setTitleAndGame(opts.sender, { title: opts.parameters })
    else if (process.send) process.send({ type: 'call', ns: 'api', fnc: 'setTitleAndGame', args: [opts.sender, { title: opts.parameters }] })
  }

  async getGame (opts) {
    global.commons.sendMessage(global.translate('game.current')
      .replace(/\$game/g, _.get(await global.db.engine.findOne('api.current', { key: 'game' }), 'value', 'n/a')), opts.sender)
  }

  async setGame (opts) {
    if (opts.parameters.length === 0) {
      global.commons.sendMessage(global.translate('game.current')
        .replace(/\$game/g, _.get(await global.db.engine.findOne('api.current', { key: 'game' }), 'value', 'n/a')), opts.sender)
      return
    }
    if (cluster.isMaster) global.api.setTitleAndGame(opts.sender, { game: opts.parameters })
    else if (process.send) process.send({ type: 'call', ns: 'api', fnc: 'setTitleAndGame', args: [opts.sender, { game: opts.parameters }] })
  }
}

module.exports = Twitch

'use strict'

const constants = require('./constants')
const moment = require('moment-timezone')
const _ = require('lodash')
const {
  isMainThread
} = require('worker_threads');

require('moment-precise-range-plugin')

const config = require('@config')
config.timezone = config.timezone === 'system' || _.isNil(config.timezone) ? moment.tz.guess() : config.timezone

class Twitch {
  constructor () {
    if (isMainThread) {
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
      { this: this, id: '!followers', command: '!followers', fnc: this.followers, permission: constants.VIEWERS },
      { this: this, id: '!subs', command: '!subs', fnc: this.subs, permission: constants.VIEWERS },
      { this: this, id: '!title', command: '!title', fnc: this.getTitle, permission: constants.VIEWERS },
      { this: this, id: '!title set', command: '!title set', fnc: this.setTitle, permission: constants.OWNER_ONLY },
      { this: this, id: '!game', command: '!game', fnc: this.getGame, permission: constants.VIEWERS },
      { this: this, id: '!game set', command: '!game set', fnc: this.setGame, permission: constants.OWNER_ONLY }
    ]
    return commands
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

  async followers (opts) {
    let events = await global.db.engine.find('widgetsEventList')
    const onlineViewers = await global.users.getAllOnlineUsernames()
    const followers = (await global.db.engine.find('users', { is: { follower: true } })).map((o) => o.username)

    let onlineFollowers = _.intersection(onlineViewers, followers)
    events = _.filter(_.orderBy(events, 'timestamp', 'desc'), (o) => { return o.event === 'follow' })
    moment.locale(await global.configuration.getValue('lang'))

    let lastFollowAgo = ''
    let lastFollowUsername = 'n/a'
    let onlineFollowersCount = _.size(_.filter(onlineFollowers, (o) => o !== global.oauth.settings.bot.username.toLowerCase() && o !== global.commons.getChannel())) // except bot and user
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
    const onlineViewers = await global.users.getAllOnlineUsernames()
    const subscribers = (await global.db.engine.find('users', { is: { subscriber: true } })).map((o) => o.username)

    let onlineSubscribers = _.intersection(onlineViewers, subscribers)
    events = _.filter(_.orderBy(events, 'timestamp', 'desc'), (o) => { return o.event === 'sub' || o.event === 'resub' || o.event === 'subgift' })
    moment.locale(await global.configuration.getValue('lang'))

    let lastSubAgo = ''
    let lastSubUsername = 'n/a'
    let onlineSubCount = _.size(_.filter(onlineSubscribers, (o) => o !== global.commons.getChannel() && o !== global.oauth.settings.bot.username.toLowerCase())) // except bot and user
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
    if (isMainThread) global.api.setTitleAndGame(opts.sender, { title: opts.parameters })
    else global.workers.sendToMaster({ type: 'call', ns: 'api', fnc: 'setTitleAndGame', args: [opts.sender, { title: opts.parameters }] })
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
    if (isMainThread) {
      const games = await global.api.sendGameFromTwitch (global.api, null, opts.parameters)
      global.api.setTitleAndGame(opts.sender, { game: games[0] })
    }
    else global.workers.sendToMaster({ type: 'call', ns: 'twitch', fnc: 'setGame', args: [opts] })
  }
}

module.exports = Twitch

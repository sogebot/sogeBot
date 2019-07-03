'use strict'

const moment = require('moment-timezone')
const _ = require('lodash')
const {
  isMainThread
} = require('worker_threads');
const {
  getTime, sendMessage, prepare, getChannel
} = require('./commons');
import { command, default_permission, settings } from './decorators';
import { permission } from './permissions'
import Core from './_interface';

require('moment-precise-range-plugin')

const config = require('@config')
config.timezone = config.timezone === 'system' || _.isNil(config.timezone) ? moment.tz.guess() : config.timezone

class Twitch extends Core {
  @settings('general')
  isTitleForced = false;

  constructor () {
    super()

    if (isMainThread) {
      global.panel.addWidget('twitch', 'widget-title-monitor', 'fab fa-twitch')

      global.panel.registerSockets({
        self: this,
        expose: ['sendTwitchVideo'],
        finally: null
      })
    }
  }

  async sendTwitchVideo (self, socket) {
    socket.emit('twitchVideo', (await global.oauth.broadcasterUsername).toLowerCase())
  }

  @command('!uptime')
  async uptime (opts) {
    const when = await global.cache.when()
    const time = getTime(await global.cache.isOnline() ? when.online : when.offline, true)
    sendMessage(global.translate(await global.cache.isOnline() ? 'uptime.online' : 'uptime.offline')
      .replace(/\$days/g, time.days)
      .replace(/\$hours/g, time.hours)
      .replace(/\$minutes/g, time.minutes)
      .replace(/\$seconds/g, time.seconds), opts.sender)
  }

  @command('!time')
  async time (opts) {
    let message = await prepare('time', { time: moment().tz(config.timezone).format('LTS') })
    sendMessage(message, opts.sender)
  }

  @command('!followers')
  async followers (opts) {
    let events = await global.db.engine.find('widgetsEventList')
    const onlineViewers = await global.users.getAllOnlineUsernames()
    const followers = (await global.db.engine.find('users', { is: { follower: true } })).map((o) => o.username)

    let onlineFollowers = _.intersection(onlineViewers, followers)
    events = _.filter(_.orderBy(events, 'timestamp', 'desc'), (o) => { return o.event === 'follow' })
    moment.locale(global.general.lang)

    let lastFollowAgo = ''
    let lastFollowUsername = 'n/a'
    let onlineFollowersCount = _.size(_.filter(onlineFollowers, (o) => o !== global.oauth.botUsername.toLowerCase() && o !== getChannel())) // except bot and user
    if (events.length > 0) {
      lastFollowUsername = events[0].username
      lastFollowAgo = moment(events[0].timestamp).fromNow()
    }

    let message = await prepare('followers', {
      lastFollowAgo: lastFollowAgo,
      lastFollowUsername: lastFollowUsername,
      onlineFollowersCount: onlineFollowersCount
    })
    sendMessage(message, opts.sender)
  }

  @command('!subs')
  async subs (opts) {
    let events = await global.db.engine.find('widgetsEventList')
    const onlineViewers = await global.users.getAllOnlineUsernames()
    const subscribers = (await global.db.engine.find('users', { is: { subscriber: true } })).map((o) => o.username)

    let onlineSubscribers = _.intersection(onlineViewers, subscribers)
    events = _.filter(_.orderBy(events, 'timestamp', 'desc'), (o) => { return o.event === 'sub' || o.event === 'resub' || o.event === 'subgift' })
    moment.locale(global.general.lang)

    let lastSubAgo = ''
    let lastSubUsername = 'n/a'
    let onlineSubCount = _.size(_.filter(onlineSubscribers, (o) => o !== getChannel() && o !== global.oauth.botUsername.toLowerCase())) // except bot and user
    if (events.length > 0) {
      lastSubUsername = events[0].username
      lastSubAgo = moment(events[0].timestamp).fromNow()
    }

    let message = await prepare('subs', {
      lastSubAgo: lastSubAgo,
      lastSubUsername: lastSubUsername,
      onlineSubCount: onlineSubCount
    })
    sendMessage(message, opts.sender)
  }

  @command('!title')
  async getTitle (opts) {
    sendMessage(global.translate('title.current')
      .replace(/\$title/g, _.get(await global.db.engine.findOne('api.current', { key: 'title' }), 'value', 'n/a')), opts.sender)
  }

  @command('!title set')
  @default_permission(permission.CASTERS)
  async setTitle (opts) {
    if (opts.parameters.length === 0) {
      sendMessage(global.translate('title.current')
        .replace(/\$title/g, _.get(await global.db.engine.findOne('api.current', { key: 'title' }), 'value', 'n/a')), opts.sender)
      return
    }
    if (isMainThread) global.api.setTitleAndGame(opts.sender, { title: opts.parameters })
    else global.workers.sendToMaster({ type: 'call', ns: 'api', fnc: 'setTitleAndGame', args: [opts.sender, { title: opts.parameters }] })
  }

  @command('!game')
  async getGame (opts) {
    sendMessage(global.translate('game.current')
      .replace(/\$game/g, _.get(await global.db.engine.findOne('api.current', { key: 'game' }), 'value', 'n/a')), opts.sender)
  }

  @command('!game set')
  @default_permission(permission.CASTERS)
  async setGame (opts) {
    if (opts.parameters.length === 0) {
      sendMessage(global.translate('game.current')
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

import moment from 'moment-timezone';
require('moment-precise-range-plugin')

import { isMainThread } from 'worker_threads';
import { filter, orderBy, size, intersection, isNil } from 'lodash';

import { getTime, sendMessage, prepare, getChannel } from './commons';
import { command, default_permission, settings } from './decorators';
import { permission } from './permissions'
import Core from './_interface';


const config = require('@config')
config.timezone = config.timezone === 'system' || isNil(config.timezone) ? moment.tz.guess() : config.timezone

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
    const time = <any>getTime(global.api.streamStatusChangeSince, true)
    sendMessage(global.translate(global.api.isStreamOnline ? 'uptime.online' : 'uptime.offline')
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

    let onlineFollowers = intersection(onlineViewers, followers)
    events = filter(orderBy(events, 'timestamp', 'desc'), (o) => { return o.event === 'follow' })
    moment.locale(global.general.lang)

    let lastFollowAgo = ''
    let lastFollowUsername = 'n/a'
    let onlineFollowersCount = size(filter(onlineFollowers, (o) => o !== global.oauth.botUsername.toLowerCase() && o !== getChannel())) // except bot and user
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

    let onlineSubscribers = intersection(onlineViewers, subscribers)
    events = filter(orderBy(events, 'timestamp', 'desc'), (o) => { return o.event === 'sub' || o.event === 'resub' || o.event === 'subgift' })
    moment.locale(global.general.lang)

    let lastSubAgo = ''
    let lastSubUsername = 'n/a'
    let onlineSubCount = size(filter(onlineSubscribers, (o) => o !== getChannel() && o !== global.oauth.botUsername.toLowerCase())) // except bot and user
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
      .replace(/\$title/g, global.api.stats.currentTitle || 'n/a'), opts.sender)
  }

  @command('!title set')
  @default_permission(permission.CASTERS)
  async setTitle (opts) {
    if (opts.parameters.length === 0) {
      sendMessage(global.translate('title.current')
        .replace(/\$title/g, global.api.stats.currentTitle || 'n/a'), opts.sender)
      return
    }
    if (isMainThread) global.api.setTitleAndGame(opts.sender, { title: opts.parameters })
    else global.workers.sendToMaster({ type: 'call', ns: 'api', fnc: 'setTitleAndGame', args: [opts.sender, { title: opts.parameters }] })
  }

  @command('!game')
  async getGame (opts) {
    sendMessage(global.translate('game.current')
      .replace(/\$game/g, global.api.stats.currentGame || 'n/a'), opts.sender)
  }

  @command('!game set')
  @default_permission(permission.CASTERS)
  async setGame (opts) {
    if (opts.parameters.length === 0) {
      sendMessage(global.translate('game.current')
        .replace(/\$game/g, global.api.stats.currentGame || 'n/a'), opts.sender)
      return
    }
    if (isMainThread) {
      const games = await global.api.sendGameFromTwitch (global.api, null, opts.parameters)
      if (Array.isArray(games) && games.length > 0) {
        global.api.setTitleAndGame(opts.sender, { game: games[0] })
      }
    }
    else global.workers.sendToMaster({ type: 'call', ns: 'twitch', fnc: 'setGame', args: [opts] })
  }
}

export default Twitch;
export { Twitch };

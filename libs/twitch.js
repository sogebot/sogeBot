'use strict'

const constants = require('./constants')
const moment = require('moment')
const snekfetch = require('snekfetch')
const _ = require('lodash')
const debug = require('debug')
require('moment-precise-range-plugin')

const config = require('../config.json')

class Twitch {
  constructor () {
    this.isOnline = false

    this.remainingAPICalls = 30
    this.refreshAPICalls = _.now() / 1000

    this.maxViewers = 0
    this.chatMessagesAtStart = global.parser.linesParsed
    this.maxRetries = 3
    this.curRetries = 0
    this.newChatters = 0
    this.streamType = 'live'

    this.retries = {
      cooldown: 30000,
      getCurrentStreamData: 0,
      getChannelDataOldAPI: 0
    }

    this.current = {
      viewers: 0,
      views: 0,
      followers: 0,
      hosts: 0,
      subscribers: 0,
      bits: 0,
      rawStatus: '',
      status: '',
      game: ''
    }

    this._loadCachedStatusAndGame()

    this.updateWatchTime()
    this.getCurrentStreamData()
    this.getLatest100Followers(true)
    this.updateChannelViews()
    this.getChannelHosts()

    this.getChannelSubscribersOldAPI() // remove this after twitch add total subscribers
    this.getChannelFollowersOldAPI() // remove this after twitch add total followers
    this.getChannelDataOldAPI() // remove this after twitch game and status for new API

    global.parser.register(this, '!uptime', this.uptime, constants.VIEWERS)
    global.parser.register(this, '!time', this.time, constants.VIEWERS)
    global.parser.register(this, '!lastseen', this.lastseen, constants.VIEWERS)
    global.parser.register(this, '!watched', this.watched, constants.VIEWERS)
    global.parser.register(this, '!followage', this.followage, constants.VIEWERS)
    global.parser.register(this, '!subage', this.subage, constants.VIEWERS)
    global.parser.register(this, '!followers', this.followers, constants.VIEWERS)
    global.parser.register(this, '!subs', this.subs, constants.VIEWERS)
    global.parser.register(this, '!age', this.age, constants.VIEWERS)
    global.parser.register(this, '!me', this.showMe, constants.VIEWERS)
    global.parser.register(this, '!top time', this.showTopTime, constants.OWNER_ONLY)
    if (global.commons.isSystemEnabled('points')) global.parser.register(this, '!top points', this.showTopPoints, constants.OWNER_ONLY)
    global.parser.register(this, '!top messages', this.showTopMessages, constants.OWNER_ONLY)
    global.parser.register(this, '!title', this.setTitle, constants.OWNER_ONLY)
    global.parser.register(this, '!game', this.setGame, constants.OWNER_ONLY)

    global.parser.registerParser(this, 'lastseen', this.lastseenUpdate, constants.VIEWERS)

    global.configuration.register('sendWithMe', 'core.settings.sendWithMe', 'bool', false)

    global.panel.addWidget('twitch', 'widget-title-monitor', 'fab fa-twitch')

    global.panel.registerSockets({
      self: this,
      expose: ['sendStreamData', 'sendTwitchVideo'],
      finally: null
    })
  }

  // attribute
  async when (data) {
    if (data) {
      // setter
      await global.db.engine.update('cache.when', { upsert: true }, {
        online: _.get(data, 'online', null),
        offline: _.get(data, 'offline', null)
      })
      return {
        online: _.get(data, 'online', null),
        offline: _.get(data, 'offline', null)
      }
    } else {
      // getter
      let cache = await global.db.engine.findOne('cache.when')
      return {
        online: _.get(cache, 'online', null),
        offline: _.get(cache, 'offline', null)
      }
    }
  }

  // attribute
  async gameCache (value) {
    if (value) {
      // setter
      await global.db.engine.update('cache.game', { upsert: true }, {
        value: value
      })
      return value
    } else {
      // getter
      let cache = await global.db.engine.findOne('cache.game')
      return _.get(cache, 'value', '')
    }
  }

  // attribute
  async rawStatus (value) {
    if (value) {
      // setter
      await global.db.engine.update('cache.status', { upsert: true }, {
        value: value
      })
      return value
    } else {
      // getter
      let cache = await global.db.engine.findOne('cache.status')
      return _.get(cache, 'value', '')
    }
  }

  async _loadCachedStatusAndGame () {
    [this.current.rawStatus, this.current.game] = await Promise.all([this.rawStatus(), this.gameCache()])
  }

  async gamesTitles (data) {
    if (data) {
      // setter

      // re-save full object - NeDB issue with $set on object workaround - NeDB is not deleting missing keys
      let fullCacheObj = await global.db.engine.findOne('cache')
      fullCacheObj['games_and_titles'] = data

      await global.db.engine.remove('cache', {})
      await global.db.engine.insert('cache', fullCacheObj)

      return data
    } else {
      // getter
      let cache = await global.db.engine.findOne('cache')
      return _.get(cache, 'games_and_titles', {})
    }
  }

  async getChannelSubscribersOldAPI () {
    const d = debug('twitch:getChannelSubscribersOldAPI')
    if (_.isNil(_.get(config, 'settings.broadcaster_oauth', '').match(/oauth:[\w]*/))) {
      return
    }

    if (_.isNil(global.channelId)) {
      setTimeout(() => this.getChannelSubscribersOldAPI(), 1000)
      return
    }

    var request
    const url = `https://api.twitch.tv/kraken/channels/${global.channelId}/subscriptions?limit=100`
    try {
      request = await snekfetch.get(url)
        .set('Accept', 'application/vnd.twitchtv.v5+json')
        .set('Authorization', 'OAuth ' + config.settings.broadcaster_oauth.split(':')[1])
        .set('Client-ID', config.settings.client_id)
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'getChannelSubscribersOldAPI', api: 'kraken', endpoint: url, code: request.status })
    } catch (e) {
      if (e.message === '422 Unprocessable Entity') {
        global.log.warning('Broadcaster is not affiliate/partner, will not check subs')
        this.current.subscribers = 0
        // caster is not affiliate or partner, don't do calls again
      } else if (e.message === '403 Forbidden') {
        global.log.warning('Broadcaster have not correct oauth, will not check subs')
        this.current.subscribers = 0
      } else {
        setTimeout(() => this.getChannelSubscribersOldAPI(), 60000)
        global.log.error(`API: ${url} - ${e.status} ${_.get(e, 'body.message', e.message)}`)
        global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'getChannelSubscribersOldAPI', api: 'kraken', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}` })
      }
      return
    }
    d(`Current subscribers count: ${request.body._total}`)
    this.current.subscribers = request.body._total - 1 // remove broadcaster itself

    const subscribers = _.map(request.body.subscriptions, 'user')

    // set subscribers
    for (let subscriber of subscribers) {
      if (subscriber.name === config.settings.broadcaster_username || subscriber.name === config.settings.bot_username) continue
      await global.users.set(subscriber.name, { is: { subscriber: true } })
    }

    setTimeout(() => this.getChannelSubscribersOldAPI(), 30000)
  }

  async getChannelFollowersOldAPI () {
    const d = debug('twitch:getChannelFollowersOldAPI')
    if (_.isNil(global.channelId)) {
      setTimeout(() => this.getChannelFollowersOldAPI(), 1000)
      return
    }

    var request
    const url = `https://api.twitch.tv/kraken/channels/${global.channelId}/follows?limit=100`
    try {
      request = await snekfetch.get(url)
        .set('Accept', 'application/vnd.twitchtv.v5+json')
        .set('Client-ID', config.settings.client_id)
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'getChannelFollowersOldAPI', api: 'kraken', endpoint: url, code: request.status })
    } catch (e) {
      setTimeout(() => this.getChannelFollowersOldAPI(), 60000)
      global.log.error(`API: ${url} - ${e.status} ${_.get(e, 'body.message', e.message)}`)
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'getChannelFollowersOldAPI', api: 'kraken', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}` })
      return
    }
    d(`Current followers count: ${request.body._total}`)
    this.current.followers = request.body._total

    setTimeout(() => this.getChannelFollowersOldAPI(), 30000)
  }

  async getChannelDataOldAPI () {
    const d = debug('twitch:getChannelDataOldAPI')
    if (_.isNil(global.channelId)) {
      setTimeout(() => this.getChannelDataOldAPI(), 1000)
      return
    }

    var request
    const url = `https://api.twitch.tv/kraken/channels/${global.channelId}`
    try {
      request = await snekfetch.get(url)
        .set('Accept', 'application/vnd.twitchtv.v5+json')
        .set('Client-ID', config.settings.client_id)
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'getChannelDataOldAPI', api: 'kraken', endpoint: url, code: request.status })
    } catch (e) {
      setTimeout(() => this.getChannelDataOldAPI(), 60000)
      global.log.error(`API: ${url} - ${e.status} ${_.get(e, 'body.message', e.message)}`)
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'getChannelDataOldAPI', api: 'kraken', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}` })
      return
    }

    if (!this.current.gameOrTitleChangedManually) {
      // Just polling update
      d(`Current game: ${request.body.game}, Current Status: ${request.body.status}`)

      this.current.rawStatus = await this.rawStatus()
      let status = await this.parseTitle()
      if (request.body.status !== status) {
        // check if status is same as updated status
        if (this.retries.getChannelDataOldAPI >= 5) {
          this.retries.getChannelDataOldAPI = 0
          this.current.rawStatus = request.body.status
        } else {
          this.retries.getChannelDataOldAPI++
          setTimeout(() => this.getChannelDataOldAPI(), this.retries.cooldown)
          return
        }
      } else {
        this.retries.getChannelDataOldAPI = 0
      }

      this.current.game = request.body.game
      this.current.status = request.body.status

      await Promise.all([this.gameCache(this.current.game), this.rawStatus(this.current.rawStatus)])
    } else {
      this.current.gameOrTitleChangedManually = false
    }

    setTimeout(() => this.getChannelDataOldAPI(), 30000)
  }

  async getChannelHosts () {
    const d = debug('twitch:getChannelHosts')
    if (_.isNil(global.channelId)) {
      setTimeout(() => this.getChannelHosts(), 1000)
      return
    }

    var request
    const url = `http://tmi.twitch.tv/hosts?include_logins=1&target=${global.channelId}`
    try {
      request = await snekfetch.get(url)
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'getChannelHosts', api: 'tmi', endpoint: url, code: request.status })
    } catch (e) {
      setTimeout(() => this.getChannelHosts(), 30000)
      global.log.error(`API: ${url} - ${e.status} ${_.get(e, 'body.message', e.message)}`)
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'getChannelHosts', api: 'tmi', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}` })
      return
    }
    d('Current host count: %s, Hosts: %s', request.body.hosts.length, _.map(request.body.hosts, 'host_login').join(', '))
    this.current.hosts = request.body.hosts.length

    // save hosts list
    let toAwait = []
    for (let host of _.map(request.body.hosts, 'host_login')) {
      toAwait.push(global.db.engine.update('cache.hosts', { username: host }, { username: host }))
    }
    await Promise.all(toAwait)
    setTimeout(() => this.getChannelHosts(), 30000)
  }

  async updateChannelViews () {
    const d = debug('twitch:updateChannelViews')
    if (_.isNil(global.channelId) || (this.remainingAPICalls <= 5 && this.refreshAPICalls * 1000 > _.now())) {
      if ((this.remainingAPICalls <= 5 && this.refreshAPICalls > _.now() / 1000)) {
        d('Waiting for rate-limit to refresh')
      }
      setTimeout(() => this.updateChannelViews(), 1000)
      return
    }

    var request
    const url = `https://api.twitch.tv/helix/users/?id=${global.channelId}`
    try {
      request = await snekfetch.get(url)
        .set('Client-ID', config.settings.client_id)
        .set('Authorization', 'Bearer ' + config.settings.bot_oauth.split(':')[1])
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'updateChannelViews', api: 'helix', endpoint: url, code: request.status, remaining: this.remainingAPICalls })
    } catch (e) {
      setTimeout(() => this.updateChannelViews(), 120000)
      global.log.error(`API: ${url} - ${e.status} ${_.get(e, 'body.message', e.message)}`)
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'updateChannelViews', api: 'helix', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}`, remaining: this.remainingAPICalls })
      return
    }

    // save remaining api calls
    this.remainingAPICalls = request.headers['ratelimit-remaining']
    this.refreshAPICalls = request.headers['ratelimit-reset']

    d(request.body.data)
    this.current.views = request.body.data[0].view_count
    setTimeout(() => this.updateChannelViews(), 120000)
  }

  async updateWatchTime () {
    // count watching time when stream is online
    const d = debug('twitch:updateWatchTime')
    d('init')

    if (this.isOnline) {
      let users = await global.users.getAll({ is: { online: true } })

      d(users)
      for (let user of users) {
        // add user as a new chatter in a stream
        if (_.isNil(user.time)) user.time = {}
        if (_.isNil(user.time.watched) || user.time.watched === 0) this.newChatters++
        global.db.engine.increment('users', { username: user.username }, { time: { watched: 60000 } })
      }
      setTimeout(() => global.twitch.updateWatchTime(), 60000)
    } else {
      d('doing nothing, stream offline')
      setTimeout(() => global.twitch.updateWatchTime(), 1000)
    }
  }

  async getLatest100Followers (quiet) {
    const d = debug('twitch:getLatest100Followers')

    // check if everything is properly loaded
    if (_.isNil(global.channelId) || _.isNil(global.overlays)) {
      setTimeout(() => this.getLatest100Followers(quiet), 1000)
      return
    }

    // we are in bounds of safe rate limit, wait until limit is refreshed
    if (this.remainingAPICalls <= 5 && this.refreshAPICalls * 1000 > _.now()) {
      if ((this.remainingAPICalls <= 5 && this.refreshAPICalls > _.now() / 1000)) {
        d('Waiting for rate-limit to refresh')
      }
      setTimeout(() => this.getLatest100Followers(quiet), 1000)
      return
    }

    var request
    const url = `https://api.twitch.tv/helix/users/follows?to_id=${global.channelId}&first=100`
    try {
      request = await snekfetch.get(url)
        .set('Client-ID', config.settings.client_id)
        .set('Authorization', 'Bearer ' + config.settings.bot_oauth.split(':')[1])
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'getLatest100Followers', api: 'helix', endpoint: url, code: request.status, remaining: this.remainingAPICalls })
    } catch (e) {
      if (e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT') { return setTimeout(() => this.getLatest100Followers(false), 1000) }
      global.log.error(`API: ${url} - ${e.status} ${_.get(e, 'body.message', e.message)}`)
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'getLatest100Followers', api: 'helix', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}`, remaining: this.remainingAPICalls })
      setTimeout(() => this.getLatest100Followers(false), 60000)
      return
    }

    // save remaining api calls
    this.remainingAPICalls = request.headers['ratelimit-remaining']
    this.refreshAPICalls = request.headers['ratelimit-reset']

    global.status.API = request.status === 200 ? constants.CONNECTED : constants.DISCONNECTED
    if (request.status === 200 && !_.isNil(request.body.data)) {
      // check if user id is in db, not in db load username from API
      let fidsToLoadFromAPI = []
      let followersUsername = []
      for (let u of request.body.data) {
        let user = await global.db.engine.findOne('users', { id: u.from_id })
        d('Searching id %s in users db: %j', u.from_id, user)
        if (_.isEmpty(user)) fidsToLoadFromAPI.push(u.from_id)
        else followersUsername.push(user.username)
      }
      d('Usernames from db: %j', followersUsername)
      d('IDs to load from API: %j', fidsToLoadFromAPI)

      if (fidsToLoadFromAPI.length > 0) {
        let fids = _.map(fidsToLoadFromAPI, (o) => `id=${o}`)
        let usersFromApi = await snekfetch.get(`https://api.twitch.tv/helix/users?${fids.join('&')}`)
          .set('Client-ID', config.settings.client_id)
          .set('Authorization', 'Bearer ' + config.settings.bot_oauth.split(':')[1])

        // save remaining api calls
        this.remainingAPICalls = usersFromApi.headers['ratelimit-remaining']
        this.refreshAPICalls = usersFromApi.headers['ratelimit-reset']

        global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'getLatest100Followers', api: 'helix', endpoint: `https://api.twitch.tv/helix/users?${fids.join('&')}`, code: request.status, remaining: this.remainingAPICalls })
        for (let follower of usersFromApi.body.data) {
          followersUsername.push(follower.login.toLowerCase())
          d('Saving user %s id %s', follower.login.toLowerCase(), follower.id)
          global.users.set(follower.login.toLowerCase(), {id: follower.id})
        }
      }

      for (let follower of followersUsername) {
        let user = await global.users.get(follower)
        if (!user.is.follower) {
          if (new Date().getTime() - moment(user.time.follow).format('X') * 1000 < 60000 * 60 && !global.webhooks.existsInCache('follow', user.id)) {
            global.webhooks.addIdToCache('follow', user.id)

            global.overlays.eventlist.add({
              type: 'follow',
              username: user.username
            })
            if (!quiet && !global.parser.isBot(user.username)) {
              global.log.follow(user.username)
              global.events.fire('follow', { username: user.username })
            }
          }
          d('Saving user %s: %j', follower, { is: { follower: true }, time: { followCheck: new Date().getTime(), follow: _.now() } })
          global.users.set(follower, { is: { follower: true }, time: { followCheck: new Date().getTime(), follow: _.now() } })
        } else {
          d('Saving user %s: %j', follower, { is: { follower: true }, time: { followCheck: new Date().getTime() } })
          global.users.set(follower, { is: { follower: true }, time: { followCheck: new Date().getTime() } })
        }
      }
    }
    setTimeout(() => this.getLatest100Followers(false), 60000)
  }

  async getGameFromId (gid) {
    const d = debug('twitch:getGameFromId')
    var request
    const url = `https://api.twitch.tv/helix/games?id=${gid}`

    if (gid.toString().trim().length === 0) return '' // return empty game if gid is empty

    let cache = await global.db.engine.findOne('cache', { upsert: true })
    let gids = _.get(cache, 'gidToGame', {})

    d('Cached id for game? %s', !_.isNil(gids[gid]))
    // check if id is cached
    if (!_.isNil(gids[gid])) return gids[gid]

    try {
      request = await snekfetch.get(url)
        .set('Client-ID', config.settings.client_id)
        .set('Authorization', 'Bearer ' + config.settings.bot_oauth.split(':')[1])
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'getGameFromId', api: 'helix', endpoint: url, code: request.status, remaining: this.remainingAPICalls })

      // add id->game to cache
      gids[gid] = request.body.data[0].name
      d('Saving id %s -> %s to cache', gid, request.body.data[0].name)
      global.db.engine.update('cache', { upsert: true }, { gidToGame: gids })
      return request.body.data[0].name
    } catch (e) {
      global.log.warning(`Couldn't find name of game for gid ${gid} - fallback to ${this.current.game}`)
      global.log.error(`API: ${url} - ${e.status} ${_.get(e, 'body.message', e.message)}`)
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'getGameFromId', api: 'helix', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}`, remaining: this.remainingAPICalls })
      return this.current.game
    }
  }

  async getCurrentStreamData () {
    const d = debug('twitch:getCurrentStreamData')

    // if channelId is not set and we are in bounds of safe rate limit, wait until limit is refreshed
    if (_.isNil(global.channelId) || (this.remainingAPICalls <= 5 && this.refreshAPICalls * 1000 > _.now())) {
      if ((this.remainingAPICalls <= 5 && this.refreshAPICalls > _.now() / 1000)) {
        d('Waiting for rate-limit to refresh')
      }
      setTimeout(() => this.getCurrentStreamData(), 1000)
      return
    }

    var request
    const url = `https://api.twitch.tv/helix/streams?user_id=${global.channelId}`
    try {
      request = await snekfetch.get(url)
        .set('Client-ID', config.settings.client_id)
        .set('Authorization', 'Bearer ' + config.settings.bot_oauth.split(':')[1])
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'getCurrentStreamData', api: 'helix', endpoint: url, code: request.status, remaining: this.remainingAPICalls })
    } catch (e) {
      global.log.error(`API: https://api.twitch.tv/helix/streams?user_id=${global.channelId} - ${e.message}`)
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'getCurrentStreamData', api: 'helix', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}`, remaining: this.remainingAPICalls })
      setTimeout(() => this.getCurrentStreamData(), 60000)
      return
    }

    // save remaining api calls
    this.remainingAPICalls = request.headers['ratelimit-remaining']
    this.refreshAPICalls = request.headers['ratelimit-reset']

    d(request.body)
    global.status.API = request.status === 200 ? constants.CONNECTED : constants.DISCONNECTED
    if (request.status === 200 && !_.isNil(request.body.data[0])) {
      // correct status and we've got a data - stream online
      let stream = request.body.data[0]; d(stream)

      if (!this.current.gameOrTitleChangedManually) {
        this.current.rawStatus = await this.rawStatus()
        let status = await this.parseTitle()

        this.current.status = stream.title
        this.current.game = await this.getGameFromId(stream.game_id)

        if (stream.title !== status) {
          // check if status is same as updated status
          if (this.retries.getCurrentStreamData >= 5) {
            this.retries.getCurrentStreamData = 0
            this.current.rawStatus = stream.title
          } else {
            this.retries.getCurrentStreamData++
            setTimeout(() => this.getCurrentStreamData(), 15000)
            return
          }
        } else {
          this.retries.getCurrentStreamData = 0
        }
        await Promise.all([this.gameCache(this.current.game), this.rawStatus(this.current.rawStatus)])
      }

      if (!this.isOnline || this.streamType !== stream.type) {
        this.when({ online: stream.started_at })
        this.chatMessagesAtStart = global.parser.linesParsed
        this.current.viewers = 0
        this.current.bits = 0
        this.maxViewers = 0
        this.newChatters = 0
        this.chatMessagesAtStart = global.parser.linesParsed

        global.db.engine.remove('cache.hosts', {}) // we dont want to have cached hosts on stream start

        if (!global.webhooks.enabled.streams) {
          global.events.fire('stream-started')
          global.events.fire('command-send-x-times', { reset: true })
          global.events.fire('every-x-minutes-of-stream', { reset: true })
        }
      }

      this.curRetries = 0
      this.saveStreamData(stream)
      this.streamType = stream.type
      this.isOnline = true

      global.events.fire('number-of-viewers-is-at-least-x')
      global.events.fire('stream-is-running-x-minutes')
      global.events.fire('every-x-minutes-of-stream')
    } else {
      if (this.isOnline && this.curRetries < this.maxRetries) {
        // retry if it is not just some network / twitch issue
        this.curRetries = this.curRetries + 1
        d('Retry stream offline check, cur: %s, max: %s', this.curRetries, this.maxRetries)
        setTimeout(() => this.getCurrentStreamData(), this.retries.cooldown)
        return
      } else {
        // stream is really offline
        this.curRetries = 0
        this.isOnline = false

        let when = await this.when()
        if (_.isNil(when.offline)) {
          this.when({ offline: moment().format() })
          global.events.fire('stream-stopped')
          global.events.fire('stream-is-running-x-minutes', { reset: true })
          global.events.fire('number-of-viewers-is-at-least-x', { reset: true })
        }
      }
    }

    if (global.webhooks.enabled.streams) {
      setTimeout(() => this.getCurrentStreamData(), 120000)
    } else setTimeout(() => this.getCurrentStreamData(), 60000)
  }

  async saveStreamData (stream) {
    this.current.viewers = stream.viewer_count
    this.maxViewers = this.maxViewers < this.current.viewers ? this.current.viewers : this.maxViewers

    global.stats.save({
      timestamp: new Date().getTime(),
      whenOnline: (await this.when()).online,
      currentViewers: this.current.viewers,
      currentSubscribers: this.current.subscribers,
      currentBits: this.current.bits,
      chatMessages: global.parser.linesParsed - this.chatMessagesAtStart,
      currentFollowers: this.current.followers,
      currentViews: this.current.views,
      maxViewers: this.maxViewers,
      newChatters: this.newChatters,
      currentHosts: this.current.hosts
    })
  }

  async sendStreamData (self, socket) {
    const whenOnline = (await self.when()).online
    var data = {
      uptime: self.getTime(whenOnline, false),
      currentViewers: self.current.viewers,
      currentSubscribers: self.current.subscribers,
      currentBits: self.current.bits,
      chatMessages: self.isOnline ? global.parser.linesParsed - self.chatMessagesAtStart : 0,
      currentFollowers: self.current.followers,
      currentViews: self.current.views,
      maxViewers: self.maxViewers,
      newChatters: self.newChatters,
      game: self.current.game,
      status: self.current.status,
      rawStatus: self.current.rawStatus,
      currentHosts: self.current.hosts
    }
    socket.emit('stats', data)
  }

  sendTwitchVideo (self, socket) {
    socket.emit('twitchVideo', config.settings.broadcaster_username.toLowerCase())
  }

  isOnline () {
    return this.isOnline
  }

  getTime (time, isChat) {
    var now, days, hours, minutes, seconds
    now = _.isNull(time) || !time ? {days: 0, hours: 0, minutes: 0, seconds: 0} : moment().preciseDiff(time, true)
    if (isChat) {
      days = now.days > 0 ? now.days : ''
      hours = now.hours > 0 ? now.hours : ''
      minutes = now.minutes > 0 ? now.minutes : ''
      seconds = now.seconds > 0 ? now.seconds : ''
      return { days: days,
        hours: hours,
        minutes: minutes,
        seconds: seconds }
    } else {
      days = now.days > 0 ? now.days + 'd' : ''
      hours = now.hours >= 0 && now.hours < 10 ? '0' + now.hours + ':' : now.hours + ':'
      minutes = now.minutes >= 0 && now.minutes < 10 ? '0' + now.minutes + ':' : now.minutes + ':'
      seconds = now.seconds >= 0 && now.seconds < 10 ? '0' + now.seconds : now.seconds
      return days + hours + minutes + seconds
    }
  }

  async uptime (self, sender) {
    const when = await self.when()
    const time = self.getTime(self.isOnline ? when.online : when.offline, true)
    global.commons.sendMessage(global.translate(self.isOnline ? 'uptime.online' : 'uptime.offline')
      .replace(/\$days/g, time.days)
      .replace(/\$hours/g, time.hours)
      .replace(/\$minutes/g, time.minutes)
      .replace(/\$seconds/g, time.seconds), sender)
  }

  time (self, sender) {
    let message = global.commons.prepare('time', { time: moment().format('LTS') })
    debug(message); global.commons.sendMessage(message, sender)
  }

  async lastseenUpdate (self, id, sender, text) {
    if (_.isNull(sender)) {
      global.updateQueue(id, true)
      return
    }
    global.users.set(sender.username, {
      time: { message: new Date().getTime() },
      is: { online: true, subscriber: !_.isNil(sender.subscriber) ? sender.subscriber : false }
    }, true)
    global.updateQueue(id, true)
  }

  async followage (self, sender, text) {
    let username
    let parsed = text.match(/([^@]\S*)/g)

    if (_.isNil(parsed)) username = sender.username
    else username = parsed[0].toLowerCase()

    const user = await global.users.get(username)
    if (_.isNil(user) || _.isNil(user.time) || _.isNil(user.time.follow) || _.isNil(user.is.follower) || !user.is.follower) {
      let message = global.commons.prepare('followage.success.never', { username: username })
      debug(message); global.commons.sendMessage(message, sender)
    } else {
      let diff = moment.preciseDiff(user.time.follow, moment(), true)
      let output = []
      if (diff.years) output.push(diff.years + ' ' + global.parser.getLocalizedName(diff.years, 'core.years'))
      if (diff.months) output.push(diff.months + ' ' + global.parser.getLocalizedName(diff.months, 'core.months'))
      if (diff.days) output.push(diff.days + ' ' + global.parser.getLocalizedName(diff.days, 'core.days'))
      if (diff.hours) output.push(diff.hours + ' ' + global.parser.getLocalizedName(diff.hours, 'core.hours'))
      if (diff.minutes) output.push(diff.minutes + ' ' + global.parser.getLocalizedName(diff.minutes, 'core.minutes'))
      if (output.length === 0) output.push(0 + ' ' + global.parser.getLocalizedName(0, 'core.minutes'))

      let message = global.commons.prepare('followage.success.time', {
        username: username,
        diff: output.join(', ')
      })
      debug(message); global.commons.sendMessage(message, sender)
    }
  }

  async followers (self, sender) {
    const d = debug('twitch:followers')
    let [events, users] = await Promise.all([global.db.engine.find('widgetsEventList'), global.users.getAll({ is: { online: true, follower: true } })])

    events = _.filter(_.orderBy(events, 'timestamp', 'desc'), (o) => { return o.event === 'follow' })
    moment.locale(global.configuration.getValue('lang'))

    let lastFollowAgo = ''
    let lastFollowUsername = 'n/a'
    let onlineFollowersCount = _.size(_.filter(users, (o) => o.username !== config.settings.broadcaster_username && o.username !== config.settings.bot_username)) // except bot and user
    if (events.length > 0) {
      lastFollowUsername = events[0].username
      lastFollowAgo = moment(events[0].timestamp).fromNow()
    }

    let message = global.commons.prepare('followers', {
      lastFollowAgo: lastFollowAgo,
      lastFollowUsername: lastFollowUsername,
      onlineFollowersCount: onlineFollowersCount
    })
    d(message); global.commons.sendMessage(message, sender)
  }

  async subs (self, sender) {
    const d = debug('twitch:subs')
    let [events, users] = await Promise.all([global.db.engine.find('widgetsEventList'), global.users.getAll({ is: { online: true, subscriber: true } })])

    events = _.filter(_.orderBy(events, 'timestamp', 'desc'), (o) => { return o.event === 'sub' || o.event === 'resub' || o.event === 'subgift' })
    moment.locale(global.configuration.getValue('lang'))

    let lastSubAgo = ''
    let lastSubUsername = 'n/a'
    let onlineSubCount = _.size(_.filter(users, (o) => o.username !== config.settings.broadcaster_username && o.username !== config.settings.bot_username)) // except bot and user
    if (events.length > 0) {
      lastSubUsername = events[0].username
      lastSubAgo = moment(events[0].timestamp).fromNow()
    }

    let message = global.commons.prepare('subs', {
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
      let message = global.commons.prepare('subage.success.never', { username: username })
      debug(message); global.commons.sendMessage(message, sender)
    } else {
      let diff = moment.preciseDiff(user.time.subscribed_at, moment(), true)
      let output = []
      if (diff.years) output.push(diff.years + ' ' + global.parser.getLocalizedName(diff.years, 'core.years'))
      if (diff.months) output.push(diff.months + ' ' + global.parser.getLocalizedName(diff.months, 'core.months'))
      if (diff.days) output.push(diff.days + ' ' + global.parser.getLocalizedName(diff.days, 'core.days'))
      if (diff.hours) output.push(diff.hours + ' ' + global.parser.getLocalizedName(diff.hours, 'core.hours'))
      if (diff.minutes) output.push(diff.minutes + ' ' + global.parser.getLocalizedName(diff.minutes, 'core.minutes'))
      if (output.length === 0) output.push(0 + ' ' + global.parser.getLocalizedName(0, 'core.minutes'))

      let message = global.commons.prepare('subage.success.time', {
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
      let message = global.commons.prepare('age.failed', { username: username })
      debug(message); global.commons.sendMessage(message, sender)
    } else {
      let diff = moment.preciseDiff(user.time.created_at, moment(), true)
      let output = []
      if (diff.years) output.push(diff.years + ' ' + global.parser.getLocalizedName(diff.years, 'core.years'))
      if (diff.months) output.push(diff.months + ' ' + global.parser.getLocalizedName(diff.months, 'core.months'))
      if (diff.days) output.push(diff.days + ' ' + global.parser.getLocalizedName(diff.days, 'core.days'))
      if (diff.hours) output.push(diff.hours + ' ' + global.parser.getLocalizedName(diff.hours, 'core.hours'))
      let message = global.commons.prepare(!_.isNil(parsed) ? 'age.success.withUsername' : 'age.success.withoutUsername', {
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

      let m = global.commons.prepare('watched.success.time', {
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
      if (global.commons.isSystemEnabled('points')) message.push(user.points + ' ' + global.systems.points.getPointsName(user.points))

      // message count
      var messages = !_.isUndefined(user.stats.messages) ? user.stats.messages : 0
      message.push(messages + ' ' + global.parser.getLocalizedName(messages, 'core.messages'))

      global.commons.sendMessage(message.join(' | '), sender)
    } catch (e) {
      global.log.error(e, { fnc: 'Twitch.prototype.showMe' })
    }
  }

  showTopMessages (self, sender, text) {
    self.showTop(self, sender, 'messages')
  }

  showTopPoints (self, sender, text) {
    self.showTop(self, sender, 'points')
  }

  showTopTime (self, sender, text) {
    self.showTop(self, sender, 'time')
  }

  async showTop (self, sender, text) {
    let sorted, message
    let type = text.trim().match(/^(time|points|messages)$/)
    let i = 0

    if (_.isNil(type)) type = 'time'
    else type = type[1]

    let users = await global.users.getAll()
    if (type === 'points' && global.commons.isSystemEnabled('points')) {
      message = global.translate('top.listPoints').replace(/\$amount/g, 10)
      sorted = _.orderBy(_.filter(users, function (o) { return !_.isNil(o.points) && !global.parser.isOwner(o.username) && o.username !== config.settings.bot_username }), 'points', 'desc')
    } else if (type === 'time') {
      message = global.translate('top.listWatched').replace(/\$amount/g, 10)
      sorted = _.orderBy(_.filter(users, function (o) { return !_.isNil(o.time) && !_.isNil(o.time.watched) && !global.parser.isOwner(o.username) && o.username !== config.settings.bot_username }), 'time.watched', 'desc')
    } else {
      message = global.translate('top.listMessages').replace(/\$amount/g, 10)
      sorted = _.orderBy(_.filter(users, function (o) { return !_.isNil(o.stats) && !_.isNil(o.stats.messages) && !global.parser.isOwner(o.username) && o.username !== config.settings.bot_username }), 'stats.messages', 'desc')
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
      message += (i + 1) + '. ' + (global.configuration.getValue('atUsername') ? '@' : '') + user.username + ' - '
      if (type === 'time') message += (user.time.watched / 1000 / 60 / 60).toFixed(1) + 'h'
      else if (type === 'points') message += user.points + ' ' + global.systems.points.getPointsName(user.points)
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
    self.setTitleAndGame(self, sender, { title: text })
  }

  setGame (self, sender, text) {
    if (text.trim().length === 0) {
      global.commons.sendMessage(global.translate('game.current')
        .replace(/\$game/g, self.current.game), sender)
      return
    }
    self.setTitleAndGame(self, sender, { game: text })
  }

  async deleteUserTwitchGame (self, socket, game) {
    let gamesTitles = await self.gamesTitles(); delete gamesTitles[game]
    await self.gamesTitles(gamesTitles)
    self.sendUserTwitchGamesAndTitles(self, socket)
  }

  async deleteUserTwitchTitle (self, socket, data) {
    let gamesTitles = await self.gamesTitles()
    _.remove(gamesTitles[data.game], function (aTitle) {
      return aTitle === data.title
    })
    await self.gamesTitles(gamesTitles)
    self.sendUserTwitchGamesAndTitles(self, socket)
  }

  async editUserTwitchTitle (self, socket, data) {
    data.new = data.new.trim()

    if (data.new.length === 0) {
      await self.deleteUserTwitchTitle(self, socket, data)
      return
    }

    let gamesTitles = await self.gamesTitles()
    if (_.isEmpty(_.find(gamesTitles[data.game], (v) => v.trim() === data.title.trim()))) {
      gamesTitles[data.game].push(data.new) // also, we need to add game and title to cached property
    } else {
      gamesTitles[data.game][gamesTitles[data.game].indexOf(data.title)] = data.new
    }
    await self.gamesTitles(gamesTitles)
  }

  async sendUserTwitchGamesAndTitles (self, socket) {
    let gamesTitles = await self.gamesTitles()
    socket.emit('sendUserTwitchGamesAndTitles', gamesTitles)
  }

  async updateGameAndTitle (self, socket, data) {
    self.setTitleAndGame(self, null, data)

    data.title = data.title.trim()
    data.game = data.game.trim()

    let gamesTitles = await self.gamesTitles()

    // create game if not in cache
    if (_.isNil(gamesTitles[data.game])) gamesTitles[data.game] = []

    if (_.isEmpty(_.find(gamesTitles[data.game], (v) => v.trim() === data.title))) {
      gamesTitles[data.game].push(data.title) // also, we need to add game and title to cached property
    }

    await self.gamesTitles(gamesTitles)
    self.sendStreamData(self, global.panel.io) // force dashboard update
  }

  async parseTitle (title) {
    if (_.isNil(title)) {
      title = await this.rawStatus()
    }

    const regexp = new RegExp('\\$_[a-zA-Z0-9_]+', 'g')
    const match = title.match(regexp)

    if (!_.isNil(match)) {
      for (let variable of title.match(regexp).map((o) => o.replace('$_', ''))) {
        let variableFromDb = await global.db.engine.findOne('customvars', { key: variable })
        if (_.isNil(variableFromDb.key)) variableFromDb = { key: variable, value: global.translate('webpanel.not-available') }
        title = title.replace(new RegExp(`\\$_${variableFromDb.key}`, 'g'), variableFromDb.value)
      }
    }
    return title
  }

  async setTitleAndGame (self, sender, args) {
    args = _.defaults(args, { title: null }, { game: null })
    const d = debug('twitch:setTitleAndGame')

    if (_.isNil(global.channelId)) {
      setTimeout(() => this.setTitleAndGame(self, sender, args), 1000)
      return
    }

    var request
    var status
    var game
    const url = `https://api.twitch.tv/kraken/channels/${global.channelId}`
    try {
      if (!_.isNil(args.title)) {
        status = args.title
        this.current.rawStatus = await this.rawStatus(args.title) // save raw status to cache, if changing title
      } else this.current.rawStatus = await this.rawStatus() // we are not setting title -> load raw status
      status = await this.parseTitle(this.current.rawStatus)

      if (!_.isNil(args.game)) {
        game = args.game
        await this.gameCache(args.game) // save game to cache, if changing game
      } else game = await this.gameCache() // we are not setting game -> load last game

      request = await snekfetch.put(url, {
        data: {
          channel: {
            game: game,
            status: status
          }
        }
      })
        .set('Accept', 'application/vnd.twitchtv.v5+json')
        .set('Client-ID', config.settings.client_id)
        .set('Authorization', 'OAuth ' + config.settings.bot_oauth.split(':')[1])
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'updateGameAndTitle', api: 'kraken', endpoint: url, code: request.status })
    } catch (e) {
      global.log.error(`API: ${url} - ${e.status} ${_.get(e, 'body.message', e.message)}`)
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'updateGameAndTitle', api: 'kraken', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}` })
      return
    }
    d(request.body)

    global.status.API = request.status === 200 ? constants.CONNECTED : constants.DISCONNECTED
    if (request.status === 200 && !_.isNil(request.body)) {
      const response = request.body
      if (!_.isNil(args.game)) {
        response.game = _.isNil(response.game) ? '' : response.game
        if (response.game.trim() === args.game.trim()) {
          global.commons.sendMessage(global.translate('game.change.success')
            .replace(/\$game/g, response.game), sender)
          global.events.fire('game-changed', { oldGame: self.current.game, game: response.game })
          self.current.game = response.game
        } else {
          global.commons.sendMessage(global.translate('game.change.failed')
            .replace(/\$game/g, self.current.game), sender)
        }
      }

      if (!_.isNull(args.title)) {
        if (response.status.trim() === status.trim()) {
          global.commons.sendMessage(global.translate('title.change.success')
            .replace(/\$title/g, response.status), sender)

          // we changed title outside of bot
          if (response.status !== status) self.current.rawStatus = response.status
          self.current.status = response.status
        } else {
          global.commons.sendMessage(global.translate('title.change.failed')
            .replace(/\$title/g, self.current.status), sender)
        }
      }
      this.current.gameOrTitleChangedManually = true
    }
  }

  async sendGameFromTwitch (self, socket, game) {
    const d = debug('twitch:sendGameFromTwitch')
    const url = `https://api.twitch.tv/kraken/search/games?query=${encodeURIComponent(game)}&type=suggest`

    var request
    try {
      request = await snekfetch.get(url)
        .set('Accept', 'application/vnd.twitchtv.v5+json')
        .set('Client-ID', config.settings.client_id)
        .set('Authorization', 'OAuth ' + config.settings.bot_oauth.split(':')[1])
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'sendGameFromTwitch', api: 'kraken', endpoint: url, code: request.status })
    } catch (e) {
      global.log.error(`API: ${url} - ${e.status} ${_.get(e, 'body.message', e.message)}`)
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'sendGameFromTwitch', api: 'kraken', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}` })
      return
    }
    d(request.body.games)

    if (_.isNull(request.body.games)) {
      socket.emit('sendGameFromTwitch', false)
    } else {
      socket.emit('sendGameFromTwitch', _.map(request.body.games, 'name'))
    }
  }
}

module.exports = Twitch

const debug = require('debug')
const _ = require('lodash')
const config = require('../config.json')
const snekfetch = require('snekfetch')
const constants = require('./constants')
const moment = require('moment')

class API {
  constructor () {
    this.remainingAPICalls = 30
    this.refreshAPICalls = _.now() / 1000
    this.rate_limit_follower_check = []

    this.maxViewers = 0
    this.chatMessagesAtStart = global.linesParsed
    this.maxRetries = 3
    this.curRetries = 0
    this.newChatters = 0
    this.streamType = 'live'

    this.retries = {
      cooldown: 45000,
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
      tips: 0,
      rawStatus: '',
      status: '',
      game: ''
    }

    this._loadCachedStatusAndGame()
    this.getChannelID()
    this.getCurrentStreamData()
    this.getLatest100Followers(true)
    this.updateChannelViews()
    this.getChannelHosts()
    this.updateWatchTime()

    this.getChannelSubscribersOldAPI() // remove this after twitch add total subscribers
    this.getChannelDataOldAPI() // remove this after twitch game and status for new API

    setInterval(async () => {
      // we are in bounds of safe rate limit, wait until limit is refreshed
      if (this.rate_limit_follower_check.length > 0 && !_.isNil(global.overlays)) {
        this.rate_limit_follower_check = _.uniq(this.rate_limit_follower_check)
        this.isFollowerUpdate(this.rate_limit_follower_check.shift())
      }
    }, 500) // run follower ONE request every .5 second
  }

  async _loadCachedStatusAndGame () {
    [this.current.rawStatus, this.current.game] = await Promise.all([global.cache.rawStatus(), global.cache.gameCache()])
    global.db.engine.update('api.current', { key: 'game' }, { value: this.current.game })
  }

  async getChannelID () {
    var request
    const url = `https://api.twitch.tv/kraken/users?login=${config.settings.broadcaster_username}`
    try {
      request = await snekfetch.get(url)
        .set('Accept', 'application/vnd.twitchtv.v5+json')
        .set('Authorization', 'OAuth ' + config.settings.broadcaster_oauth.split(':')[1])
        .set('Client-ID', config.settings.client_id)
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'getChannelID', api: 'kraken', endpoint: url, code: request.status })
    } catch (e) {
      if (e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT') {
        global.log.error(`API: ${url} - ${e.message}`)
        return setTimeout(() => this.getChannelID(), 1000)
      }
      setTimeout(() => this.getChannelID(), 60000)
      global.log.error(`API: ${url} - ${e.status} ${_.get(e, 'body.message', e.message)}`)
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'getChannelID', api: 'kraken', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}` })
      return
    }

    if (_.isNil(request.body.users[0])) {
      global.log.error('Channel ' + config.settings.broadcaster_username + ' not found!')
    } else {
      await global.cache.channelId(request.body.users[0]._id)
      global.log.info('Broadcaster channel ID set to ' + request.body.users[0]._id)
    }
  }

  async getChannelSubscribersOldAPI () {
    const d = debug('api:getChannelSubscribersOldAPI')
    const cid = await global.cache.channelId()

    if (_.isNil(_.get(config, 'settings.broadcaster_oauth', '').match(/oauth:[\w]*/))) {
      return
    }

    if (_.isNil(cid)) {
      setTimeout(() => this.getChannelSubscribersOldAPI(), 1000)
      return
    }

    var request
    const url = `https://api.twitch.tv/kraken/channels/${cid}/subscriptions?limit=100`
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
        global.db.engine.update('api.current', { key: 'subscribers' }, { value: this.current.subscribers })
        // caster is not affiliate or partner, don't do calls again
      } else if (e.message === '403 Forbidden') {
        global.log.warning('Broadcaster have not correct oauth, will not check subs')
        this.current.subscribers = 0
        global.db.engine.update('api.current', { key: 'subscribers' }, { value: this.current.subscribers })
      } else {
        if (e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT') {
          global.log.error(`API: ${url} - ${e.message}`)
          return setTimeout(() => this.getChannelSubscribersOldAPI(), 1000)
        }
        setTimeout(() => this.getChannelSubscribersOldAPI(), 60000)
        global.log.error(`API: ${url} - ${e.status} ${_.get(e, 'body.message', e.message)}`)
        global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'getChannelSubscribersOldAPI', api: 'kraken', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}` })
      }
      return
    }
    d(`Current subscribers count: ${request.body._total}`)
    this.current.subscribers = request.body._total - 1 // remove broadcaster itself
    global.db.engine.update('api.current', { key: 'subscribers' }, { value: this.current.subscribers })

    const subscribers = _.map(request.body.subscriptions, 'user')

    // set subscribers
    for (let subscriber of subscribers) {
      if (subscriber.name === config.settings.broadcaster_username || subscriber.name === config.settings.bot_username) continue
      await global.db.engine.update('users', { username: subscriber.name }, { is: { subscriber: true } })
    }

    setTimeout(() => this.getChannelSubscribersOldAPI(), 30000)
  }

  async getChannelDataOldAPI () {
    const d = debug('api:getChannelDataOldAPI')
    const cid = await global.cache.channelId()

    if (_.isNil(cid)) {
      setTimeout(() => this.getChannelDataOldAPI(), 1000)
      return
    }

    var request
    const url = `https://api.twitch.tv/kraken/channels/${cid}`
    try {
      request = await snekfetch.get(url)
        .set('Accept', 'application/vnd.twitchtv.v5+json')
        .set('Authorization', 'OAuth ' + config.settings.broadcaster_oauth.split(':')[1])
        .set('Client-ID', config.settings.client_id)
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'getChannelDataOldAPI', api: 'kraken', endpoint: url, code: request.status })
    } catch (e) {
      if (e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT') {
        global.log.error(`API: ${url} - ${e.message}`)
        return setTimeout(() => this.getChannelDataOldAPI(), 1000)
      }
      setTimeout(() => this.getChannelDataOldAPI(), 60000)
      global.log.error(`API: ${url} - ${e.status} ${_.get(e, 'body.message', e.message)}`)
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'getChannelDataOldAPI', api: 'kraken', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}` })
      return
    }

    if (!this.current.gameOrTitleChangedManually) {
      // Just polling update
      d(`Current game: ${request.body.game}, Current Status: ${request.body.status}`)

      this.current.rawStatus = await global.cache.rawStatus()
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

      global.db.engine.update('api.current', { key: 'game' }, { value: this.current.game })
      global.db.engine.update('api.current', { key: 'status' }, { value: this.current.status })

      await Promise.all([global.cache.gameCache(this.current.game), global.cache.rawStatus(this.current.rawStatus)])
    } else {
      this.current.gameOrTitleChangedManually = false
    }

    setTimeout(() => this.getChannelDataOldAPI(), 30000)
  }

  async getChannelHosts () {
    const d = debug('api:getChannelHosts')
    const cid = await global.cache.channelId()

    if (_.isNil(cid)) {
      setTimeout(() => this.getChannelHosts(), 1000)
      return
    }

    var request
    const url = `http://tmi.twitch.tv/hosts?include_logins=1&target=${cid}`
    try {
      request = await snekfetch.get(url)
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'getChannelHosts', api: 'tmi', endpoint: url, code: request.status })
    } catch (e) {
      if (e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT') {
        global.log.error(`API: ${url} - ${e.message}`)
        return setTimeout(() => this.getChannelHosts(), 1000)
      }
      setTimeout(() => this.getChannelHosts(), 30000)
      global.log.error(`API: ${url} - ${e.status} ${_.get(e, 'body.message', e.message)}`)
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'getChannelHosts', api: 'tmi', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}` })
      return
    }
    d('Current host count: %s, Hosts: %s', request.body.hosts.length, _.map(request.body.hosts, 'host_login').join(', '))
    this.current.hosts = request.body.hosts.length
    global.db.engine.update('api.current', { key: 'hosts' }, { value: this.current.hosts })

    // save hosts list
    let toAwait = []
    for (let host of _.map(request.body.hosts, 'host_login')) {
      toAwait.push(global.db.engine.update('cache.hosts', { username: host }, { username: host }))
    }
    await Promise.all(toAwait)
    setTimeout(() => this.getChannelHosts(), 30000)
  }

  async updateChannelViews () {
    const d = debug('api:updateChannelViews')
    const cid = await global.cache.channelId()

    if (_.isNil(cid) || (this.remainingAPICalls <= 5 && this.refreshAPICalls * 1000 > _.now())) {
      if ((this.remainingAPICalls <= 5 && this.refreshAPICalls > _.now() / 1000)) {
        d('Waiting for rate-limit to refresh')
      }
      setTimeout(() => this.updateChannelViews(), 1000)
      return
    }

    var request
    const url = `https://api.twitch.tv/helix/users/?id=${cid}`
    try {
      request = await snekfetch.get(url)
        .set('Client-ID', config.settings.client_id)
        .set('Authorization', 'Bearer ' + config.settings.bot_oauth.split(':')[1])
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'updateChannelViews', api: 'helix', endpoint: url, code: request.status, remaining: this.remainingAPICalls })
    } catch (e) {
      if (e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT') {
        global.log.error(`API: ${url} - ${e.message}`)
        return setTimeout(() => this.updateChannelViews(), 1000)
      }
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
    global.db.engine.update('api.current', { key: 'views' }, { value: this.current.views })
    setTimeout(() => this.updateChannelViews(), 120000)
  }

  // TODO: this should be moved to users
  async updateWatchTime () {
    // count watching time when stream is online
    const d = debug('api:updateWatchTime')
    d('init')

    if (await global.cache.isOnline()) {
      let users = await global.users.getAll({ is: { online: true } })

      d(users)
      for (let user of users) {
        // add user as a new chatter in a stream
        if (_.isNil(user.time)) user.time = {}
        if (_.isNil(user.time.watched) || user.time.watched === 0) this.newChatters++
        global.db.engine.increment('users', { username: user.username }, { time: { watched: 60000 } })
      }
      setTimeout(() => this.updateWatchTime(), 60000)
    } else {
      d('doing nothing, stream offline')
      setTimeout(() => this.updateWatchTime(), 1000)
    }
  }

  async getLatest100Followers (quiet) {
    const d = debug('api:getLatest100Followers')
    const cid = await global.cache.channelId()

    // check if everything is properly loaded
    if (_.isNil(cid) || _.isNil(global.overlays)) {
      setTimeout(() => this.getLatest100Followers(quiet), 1000)
      return
    }

    // we are in bounds of safe rate limit, wait until limit is refreshed
    if ((global.api.remainingAPICalls <= 10 && global.api.refreshAPICalls > _.now() / 1000)) {
      d('Waiting for rate-limit to refresh')
      setTimeout(() => this.getLatest100Followers(quiet), 1000)
      return
    }

    var request
    const url = `https://api.twitch.tv/helix/users/follows?to_id=${cid}&first=100`
    try {
      request = await snekfetch.get(url)
        .set('Client-ID', config.settings.client_id)
        .set('Authorization', 'Bearer ' + config.settings.bot_oauth.split(':')[1])
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'getLatest100Followers', api: 'helix', endpoint: url, code: request.status, remaining: this.remainingAPICalls })
    } catch (e) {
      if (e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT') {
        global.log.error(`API: ${url} - ${e.message}`)
        return setTimeout(() => this.getLatest100Followers(quiet), 1000)
      }
      setTimeout(() => this.getLatest100Followers(quiet), 60000)
      global.log.error(`API: ${url} - ${e.status} ${_.get(e, 'body.message', e.message)}`)
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'getLatest100Followers', api: 'helix', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}`, remaining: this.remainingAPICalls })
      return
    }

    // save remaining api calls
    this.remainingAPICalls = request.headers['ratelimit-remaining']
    this.refreshAPICalls = request.headers['ratelimit-reset']

    global.status.API = request.status === 200 ? constants.CONNECTED : constants.DISCONNECTED
    if (request.status === 200 && !_.isNil(request.body.data)) {
      // check if user id is in db, not in db load username from API
      let fTime = []
      let fidsToLoadFromAPI = []
      let followersUsername = []
      for (let u of request.body.data) {
        fTime.push({ id: u.from_id, followed_at: u.followed_at })
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
        let toAwait = []
        for (let follower of usersFromApi.body.data) {
          followersUsername.push(follower.login.toLowerCase())
          d('Saving user %s id %s', follower.login.toLowerCase(), follower.id)
          toAwait.push(global.db.engine.update('users', { username: follower.login.toLowerCase() }, { id: follower.id }))
        }
        await Promise.all(toAwait)
      }

      for (let follower of followersUsername) {
        let user = await global.users.get(follower)
        if (!_.get(user, 'is.follower', false)) {
          if (new Date().getTime() - moment(_.get(user, 'time.follow', 0)).format('X') * 1000 < 60000 * 60 && !global.webhooks.existsInCache('follow', user.id)) {
            global.webhooks.addIdToCache('follow', user.id)

            global.overlays.eventlist.add({
              type: 'follow',
              username: user.username
            })
            if (!quiet && !global.commons.isBot(user.username)) {
              global.log.follow(user.username)
              global.events.fire('follow', { username: user.username })
            }
          }
        }
        d('Saving user %s: %j', follower, { is: { follower: true }, time: { followCheck: new Date().getTime(), follow: parseInt(moment(_.find(fTime, (o) => o.id === user.id).followed_at).format('x')) } })
        global.db.engine.update('users', { username: follower }, { is: { follower: true }, time: { followCheck: new Date().getTime(), follow: parseInt(moment(_.find(fTime, (o) => o.id === user.id).followed_at).format('x')) } })
      }
    }

    d(`Current followers count: ${request.body.total}`)
    this.current.followers = request.body.total
    global.db.engine.update('api.current', { key: 'followers' }, { value: this.current.followers })

    setTimeout(() => this.getLatest100Followers(false), 30000)
  }

  async getGameFromId (gid) {
    const d = debug('api:getGameFromId')
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
    const d = debug('api:getCurrentStreamData')
    const cid = await global.cache.channelId()

    // if channelId is not set and we are in bounds of safe rate limit, wait until limit is refreshed
    if (_.isNil(cid) || (this.remainingAPICalls <= 5 && this.refreshAPICalls * 1000 > _.now())) {
      if ((this.remainingAPICalls <= 5 && this.refreshAPICalls > _.now() / 1000)) {
        d('Waiting for rate-limit to refresh')
      }
      setTimeout(() => this.getCurrentStreamData(), 1000)
      return
    }

    var request
    const url = `https://api.twitch.tv/helix/streams?user_id=${cid}`
    try {
      request = await snekfetch.get(url)
        .set('Client-ID', config.settings.client_id)
        .set('Authorization', 'Bearer ' + config.settings.bot_oauth.split(':')[1])
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'getCurrentStreamData', api: 'helix', endpoint: url, code: request.status, remaining: this.remainingAPICalls })
    } catch (e) {
      if (e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT') {
        global.log.error(`API: ${url} - ${e.message}`)
        return setTimeout(() => this.getCurrentStreamData(), 1000)
      }
      setTimeout(() => this.getCurrentStreamData(), 60000)
      global.log.error(`API: https://api.twitch.tv/helix/streams?user_id=${cid} - ${e.message}`)
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'getCurrentStreamData', api: 'helix', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}`, remaining: this.remainingAPICalls })
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
        this.current.rawStatus = await global.cache.rawStatus()
        let status = await this.parseTitle()

        this.current.status = stream.title
        this.current.game = await this.getGameFromId(stream.game_id)

        global.db.engine.update('api.current', { key: 'status' }, { value: this.current.status })
        global.db.engine.update('api.current', { key: 'game' }, { value: this.current.game })

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
        await Promise.all([global.cache.gameCache(this.current.game), global.cache.rawStatus(this.current.rawStatus)])
      }

      if (!await global.cache.isOnline() || this.streamType !== stream.type) {
        global.cache.when({ online: stream.started_at })
        this.chatMessagesAtStart = global.linesParsed
        this.current.viewers = 0
        this.current.bits = 0
        this.current.tips = 0
        this.maxViewers = 0
        this.newChatters = 0

        global.db.engine.update('api.current', { key: 'viewers' }, { value: this.current.viewers })
        global.db.engine.update('api.current', { key: 'bits' }, { value: this.current.bits })
        global.db.engine.update('api.current', { key: 'tips' }, { value: this.current.tips })

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
      await global.cache.isOnline(true)

      global.events.fire('number-of-viewers-is-at-least-x')
      global.events.fire('stream-is-running-x-minutes')
      global.events.fire('every-x-minutes-of-stream')
    } else {
      if (await global.cache.isOnline() && this.curRetries < this.maxRetries) {
        // retry if it is not just some network / twitch issue
        this.curRetries = this.curRetries + 1
        d('Retry stream offline check, cur: %s, max: %s', this.curRetries, this.maxRetries)
        setTimeout(() => this.getCurrentStreamData(), this.retries.cooldown)
        return
      } else {
        // stream is really offline
        this.curRetries = 0
        await global.cache.isOnline(false)

        let when = await global.cache.when()
        if (_.isNil(when.offline)) {
          global.cache.when({ offline: moment().format() })
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
    global.db.engine.update('api.current', { key: 'viewers' }, { value: this.current.viewers })

    this.maxViewers = this.maxViewers < this.current.viewers ? this.current.viewers : this.maxViewers

    global.stats.save({
      timestamp: new Date().getTime(),
      whenOnline: (await global.cache.when()).online,
      currentViewers: this.current.viewers,
      currentSubscribers: this.current.subscribers,
      currentBits: this.current.bits,
      currentTips: this.current.tips,
      chatMessages: global.linesParsed - this.chatMessagesAtStart,
      currentFollowers: this.current.followers,
      currentViews: this.current.views,
      maxViewers: this.maxViewers,
      newChatters: this.newChatters,
      currentHosts: this.current.hosts
    })
  }

  async parseTitle (title) {
    if (_.isNil(title)) {
      title = await global.cache.rawStatus()
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
    const d = debug('api:setTitleAndGame')
    const cid = await global.cache.channelId()

    if (_.isNil(cid)) {
      setTimeout(() => this.setTitleAndGame(self, sender, args), 10)
      return
    }

    var request
    var status
    var game
    const url = `https://api.twitch.tv/kraken/channels/${cid}`
    try {
      if (!_.isNil(args.title)) {
        this.current.rawStatus = await global.cache.rawStatus(args.title) // save raw status to cache, if changing title
      } else this.current.rawStatus = await global.cache.rawStatus() // we are not setting title -> load raw status
      status = await this.parseTitle(this.current.rawStatus)

      if (!_.isNil(args.game)) {
        game = args.game
        await global.cache.gameCache(args.game) // save game to cache, if changing game
      } else game = await global.cache.gameCache() // we are not setting game -> load last game

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
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'setTitleAndGame', api: 'kraken', endpoint: url, code: request.status })
    } catch (e) {
      global.log.error(`API: ${url} - ${e.status} ${_.get(e, 'body.message', e.message)}`)
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'setTitleAndGame', api: 'kraken', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}` })
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

  async fetchAccountAge (username, id) {
    const d = debug('twitch:fetchAccountAge')
    const url = `https://api.twitch.tv/kraken/users/${id}`

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
    d(request.body)
    global.db.engine.update('users', { username: username }, { created_at: moment(request.body.created_at).format('x') })
  }

  async isFollower (username) {
    let user = await global.users.get(username)
    if (new Date().getTime() - user.time.followCheck >= 1000 * 60 * 30) this.rate_limit_follower_check.push(user)
  }

  async isFollowerUpdate (user) {
    const d = require('debug')('api:isFollowerUpdate')
    const cid = await global.cache.channelId()

    if (_.isNil(user.id)) return // skip check if ID doesn't exist

    if ((global.api.remainingAPICalls <= 10 && global.api.refreshAPICalls > _.now() / 1000)) {
      d('Skip for rate-limit to refresh and re-add user to queue')
      this.rate_limit_follower_check.push(user.username)
      return
    }

    if (user.username === config.settings.broadcaster_username || user.username === config.settings.bot_username) {
      // skip if bot or broadcaster
      d('IsFollowerUpdate SKIP for user %s', user.username)
      return
    }

    const url = `https://api.twitch.tv/helix/users/follows?from_id=${user.id}&to_id=${cid}`
    try {
      d('IsFollowerUpdate check for user %s', user.username)
      var request = await snekfetch.get(url)
        .set('Accept', 'application/vnd.twitchtv.v5+json')
        .set('Authorization', 'Bearer ' + config.settings.bot_oauth.split(':')[1])
        .set('Client-ID', config.settings.client_id)
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'isFollowerUpdate', api: 'helix', endpoint: url, code: request.status, remaining: global.twitch.remainingAPICalls })
      d('Request done: %j', request.body)
    } catch (e) {
      global.log.error(`API: ${url} - ${e.status} ${_.get(e, 'body.message', e.message)}`)
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'isFollowerUpdate', api: 'helix', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}`, remaining: global.twitch.remainingAPICalls })
      return
    }

    global.api.remainingAPICalls = request.headers['ratelimit-remaining']
    global.api.refreshAPICalls = request.headers['ratelimit-reset']

    if (request.body.total === 0) {
      // not a follower
      // if was follower, fire unfollow event
      if (user.is.follower) {
        global.log.unfollow(user.username)
        global.events.fire('unfollow', { username: user.username })
      }
      global.users.set(user.username, { is: { follower: false }, time: { followCheck: new Date().getTime(), follow: 0 } }, user.is.follower)
    } else {
      // is follower
      if (!user.is.follower && new Date().getTime() - moment(request.body.data[0].followed_at).format('x') < 60000 * 60) {
        global.overlays.eventlist.add({
          type: 'follow',
          username: user.username
        })
        global.log.follow(user.username)
        global.events.fire('follow', { username: user.username })
      }
      global.users.set(user.username, { is: { follower: true }, time: { followCheck: new Date().getTime(), follow: parseInt(moment(request.body.data[0].followed_at).format('x'), 10) } }, !user.is.follower)
    }
  }
}

module.exports = API

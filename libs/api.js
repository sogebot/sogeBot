const debug = require('debug')
const _ = require('lodash')
const config = require('../config.json')
const snekfetch = require('snekfetch')
const constants = require('./constants')
const moment = require('moment')
const cluster = require('cluster')
const Timeout = require('./timeout')

const DEBUG_API_CHANNELID = debug('api:getChannelID')
const DEBUG_API_GET_CHANNEL_CHATTERS_UNOFFICIAL_API = debug('api:getChannelChattersUnofficialAPI')
const DEBUG_API_GET_CHANNEL_SUBSCRIBERS_OLD_API = debug('api:getChannelSubscribersOldAPI')
const DEBUG_API_GET_CHANNEL_DATA_OLD_API = debug('api:getChannelDataOldAPI')
const DEBUG_API_UPDATE_CHANNEL_VIEWS = debug('api:updateChannelViews')
const DEBUG_API_GET_LATEST_100_FOLLOWERS = debug('api:getLatest100Followers')
const DEBUG_API_GET_LATEST_100_FOLLOWERS_USERS = debug('api:getLatest100Followers:users')
const DEBUG_API_GET_CURRENT_STREAM_DATA = debug('api:getCurrentStreamData')
const DEBUG_API_SET_TITLE_AND_GAME = debug('api:setTitleAndGame')
const DEBUG_API_IS_FOLLOWER_UPDATE = debug('api:isFollowerUpdate')

class API {
  constructor () {
    if (cluster.isMaster) {
      this.remainingAPICalls = 30
      this.refreshAPICalls = _.now() / 1000
      this.rate_limit_follower_check = []

      this.chatMessagesAtStart = global.linesParsed
      this.maxRetries = 3
      this.curRetries = 0
      this.streamType = 'live'

      this.gameOrTitleChangedManually = false

      this.retries = {
        getCurrentStreamData: 0,
        getChannelDataOldAPI: 0
      }

      setTimeout(() => {
        this._loadCachedStatusAndGame()
        this.getChannelID()
        this.getCurrentStreamData({ interval: true })
        this.getLatest100Followers(true)
        this.updateChannelViews()
        this.getChannelHosts()

        this.getChannelChattersUnofficialAPI({ saveToWidget: false })

        this.getChannelSubscribersOldAPI() // remove this after twitch add total subscribers
        this.getChannelDataOldAPI() // remove this after twitch game and status for new API

        this.intervalFollowerUpdate()
      }, 60000)
    }
  }

  async intervalFollowerUpdate () {
    // we are in bounds of safe rate limit, wait until limit is refreshed
    _.remove(this.rate_limit_follower_check, (o) => {
      const isSkipped = o.username === config.settings.broadcaster_username || o.username === config.settings.bot_username.toLowerCase()
      const userHaveId = !_.isNil(o.id)
      return isSkipped || !userHaveId
    })

    if (this.rate_limit_follower_check.length > 0 && !_.isNil(global.overlays)) {
      this.rate_limit_follower_check = _.uniq(this.rate_limit_follower_check)
      await this.isFollowerUpdate(this.rate_limit_follower_check.shift())
    }

    new Timeout().recursive({ this: this, uid: 'intervalFollowerUpdate', wait: 500, fnc: this.intervalFollowerUpdate })
  }

  async _loadCachedStatusAndGame () {
    global.db.engine.update('api.current', { key: 'game' }, { value: await global.cache.gameCache() })
  }

  async getChannelID () {
    var request
    const url = `https://api.twitch.tv/kraken/users?login=${config.settings.broadcaster_username}`
    let timeout = 60000

    DEBUG_API_CHANNELID(`GET ${url}`)
    try {
      request = await snekfetch.get(url)
        .set('Accept', 'application/vnd.twitchtv.v5+json')
        .set('Authorization', 'OAuth ' + config.settings.bot_oauth.split(':')[1])
        .set('Client-ID', config.settings.client_id)
      global.panel.io.emit('api.stats', { data: request.body.data, timestamp: _.now(), call: 'getChannelID', api: 'kraken', endpoint: url, code: request.status })
    } catch (e) {
      timeout = e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT' ? 1000 : timeout
      global.log.error(`${url} - ${e.message}`)
      global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getChannelID', api: 'kraken', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}` })
      return
    } finally {
      if (timeout === 1000) {
        new Timeout().recursive({ this: this, uid: 'getChannelID', wait: timeout, fnc: this.getChannelID })
      }
    }

    const user = request.body.users[0]
    DEBUG_API_CHANNELID(user)
    if (_.isNil(user)) {
      global.log.error('Channel ' + config.settings.broadcaster_username + ' not found!')
    } else {
      await global.cache.channelId(user._id)
      global.log.info('Broadcaster channel ID set to ' + user._id)
    }
  }

  async getChannelChattersUnofficialAPI (opts) {
    const sendJoinEvent = async function (bulk) {
      for (let user of bulk) {
        await new Promise((resolve) => setTimeout(() => resolve(), 1000))
        global.api.isFollower(user.username)
        global.events.fire('user-joined-channel', { username: user.username })
      }
    }
    const sendPartEvent = async function (bulk) {
      for (let user of bulk) {
        await new Promise((resolve) => setTimeout(() => resolve(), 1000))
        global.events.fire('user-parted-channel', { username: user.username })
      }
    }

    const url = `https://tmi.twitch.tv/group/user/${config.settings.broadcaster_username.toLowerCase()}/chatters`
    const needToWait = _.isNil(global.widgets)
    DEBUG_API_GET_CHANNEL_CHATTERS_UNOFFICIAL_API(`GET ${url}\nwait: ${needToWait}`)
    if (needToWait) {
      new Timeout().recursive({ this: this, uid: 'getChannelChattersUnofficialAPI', wait: 1000, fnc: this.getChannelChattersUnofficialAPI, args: opts })
      return
    }

    let timeout = 60000
    var request
    try {
      request = await snekfetch.get(url)
      global.panel.io.emit('api.stats', { data: request.body.data, timestamp: _.now(), call: 'getChannelChattersUnofficialAPI', api: 'unofficial', endpoint: url, code: request.status })
      opts.saveToWidget = true
    } catch (e) {
      timeout = e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT' ? 1000 : timeout
      global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getChannelChattersUnofficialAPI', api: 'unofficial', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}` })
      new Timeout().recursive({ this: this, uid: 'getChannelChattersUnofficialAPI', wait: timeout, fnc: this.getChannelChattersUnofficialAPI, args: opts })
      return
    }

    const chatters = _.flatMap(request.body.chatters)
    DEBUG_API_GET_CHANNEL_CHATTERS_UNOFFICIAL_API(chatters)

    let bulkInsert = []
    let bulkParted = []
    let allOnlineUsers = (await global.db.engine.find('users.online')).map((o) => o.username)
    let ignoredUsers = (await global.db.engine.find('users_ignorelist')).map((o) => o.username)

    for (let user of allOnlineUsers) {
      if (!_.includes(chatters, user) && !_.includes(ignoredUsers, user)) {
        bulkParted.push({ username: user })
        // user is no longer in channel
        await global.db.engine.remove('users.online', { username: user })
        global.widgets.joinpart.send({ username: user, type: 'part' })
      }
    }

    for (let chatter of chatters) {
      if (!_.includes(allOnlineUsers, chatter) && !_.includes(ignoredUsers, chatter)) {
        bulkInsert.push({ username: chatter })
        global.widgets.joinpart.send({ username: chatter, type: 'join' })
      }
    }

    if (bulkInsert.length > 0) {
      for (let chunk of _.chunk(bulkInsert, 100)) {
        await global.db.engine.insert('users.online', chunk)
      }
    }

    if (opts.saveToWidget) sendPartEvent(bulkParted)
    if (opts.saveToWidget) sendJoinEvent(bulkInsert)

    new Timeout().recursive({ this: this, uid: 'getChannelChattersUnofficialAPI', wait: timeout, fnc: this.getChannelChattersUnofficialAPI, args: opts })
  }

  async getChannelSubscribersOldAPI () {
    const cid = await global.cache.channelId()
    const url = `https://api.twitch.tv/kraken/channels/${cid}/subscriptions?limit=100`
    if (_.isNil(_.get(config, 'settings.broadcaster_oauth', '').match(/oauth:[\w]*/))) {
      return
    }

    const needToWait = _.isNil(cid) || _.isNil(global.overlays)
    DEBUG_API_GET_CHANNEL_SUBSCRIBERS_OLD_API(`GET ${url}\nwait: ${needToWait}`)
    if (needToWait) {
      new Timeout().recursive({ this: this, uid: 'getChannelSubscribersOldAPI', wait: 1000, fnc: this.getChannelSubscribersOldAPI })
      return
    }

    var request
    let timeout = 30000
    try {
      request = await snekfetch.get(url)
        .set('Accept', 'application/vnd.twitchtv.v5+json')
        .set('Authorization', 'OAuth ' + config.settings.broadcaster_oauth.split(':')[1])
        .set('Client-ID', config.settings.client_id)
      global.panel.io.emit('api.stats', { data: request.body.data, timestamp: _.now(), call: 'getChannelSubscribersOldAPI', api: 'kraken', endpoint: url, code: request.status })
    } catch (e) {
      if (e.message === '422 Unprocessable Entity') {
        timeout = 0
        global.log.warning('Broadcaster is not affiliate/partner, will not check subs')
        global.db.engine.update('api.current', { key: 'subscribers' }, { value: 0 })
        // caster is not affiliate or partner, don't do calls again
      } else if (e.message === '403 Forbidden') {
        timeout = 0
        global.log.warning('Broadcaster have not correct oauth, will not check subs')
        global.db.engine.update('api.current', { key: 'subscribers' }, { value: 0 })
      } else {
        timeout = e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT' ? 1000 : timeout
        global.log.error(`${url} - ${e.message}`)
        global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getChannelSubscribersOldAPI', api: 'kraken', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}` })
      }
      return
    } finally {
      console.log(timeout)
      if (timeout !== 0) new Timeout().recursive({ this: this, uid: 'getChannelSubscribersOldAPI', wait: timeout, fnc: this.getChannelSubscribersOldAPI })
    }

    DEBUG_API_GET_CHANNEL_SUBSCRIBERS_OLD_API(`Current subscribers count: ${request.body._total}`)
    await global.db.engine.update('api.current', { key: 'subscribers' }, { value: request.body._total - 1 })

    const subscribers = _.map(request.body.subscriptions, 'user')

    // set subscribers
    for (let subscriber of subscribers) {
      if (subscriber.name === config.settings.broadcaster_username || subscriber.name === config.settings.bot_username.toLowerCase()) continue
      await global.db.engine.update('users', { username: subscriber.name }, { is: { subscriber: true } })
    }
  }

  async getChannelDataOldAPI () {
    const cid = await global.cache.channelId()
    const url = `https://api.twitch.tv/kraken/channels/${cid}`

    const needToWait = _.isNil(cid) || _.isNil(global.overlays)
    DEBUG_API_GET_CHANNEL_DATA_OLD_API(`GET ${url}\nwait: ${needToWait}`)
    if (needToWait) {
      new Timeout().recursive({ this: this, uid: 'getChannelDataOldAPI', wait: 1000, fnc: this.getChannelDataOldAPI })
      return
    }

    var request
    let timeout = 60000
    try {
      request = await snekfetch.get(url)
        .set('Accept', 'application/vnd.twitchtv.v5+json')
        .set('Authorization', 'OAuth ' + config.settings.bot_oauth.split(':')[1])
        .set('Client-ID', config.settings.client_id)
      global.panel.io.emit('api.stats', { data: request.body.data, timestamp: _.now(), call: 'getChannelDataOldAPI', api: 'kraken', endpoint: url, code: request.status })
    } catch (e) {
      timeout = e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT' ? 1000 : timeout
      global.log.error(`${url} - ${e.message}`)
      global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getChannelDataOldAPI', api: 'kraken', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}` })
      return
    } finally {
      new Timeout().recursive({ this: this, uid: 'getChannelDataOldAPI', wait: timeout, fnc: this.getChannelDataOldAPI })
    }

    if (!this.gameOrTitleChangedManually) {
      // Just polling update
      DEBUG_API_GET_CHANNEL_DATA_OLD_API(`Current game: ${request.body.game}, Current Status: ${request.body.status}`)

      let rawStatus = await global.cache.rawStatus()
      let status = await this.parseTitle()
      if (request.body.status !== status) {
        // check if status is same as updated status
        if (this.retries.getChannelDataOldAPI >= 15) {
          this.retries.getChannelDataOldAPI = 0
          await global.cache.rawStatus(request.body.status)
        } else {
          this.retries.getChannelDataOldAPI++
          return
        }
      } else {
        this.retries.getChannelDataOldAPI = 0
      }

      const game = request.body.game
      await global.db.engine.update('api.current', { key: 'game' }, { value: game })
      await global.db.engine.update('api.current', { key: 'status' }, { value: request.body.status })
      await global.cache.gameCache(game)
      await global.cache.rawStatus(rawStatus)
    } else {
      this.gameOrTitleChangedManually = false
    }
  }

  async getChannelHosts () {
    const d = debug('api:getChannelHosts')
    const cid = await global.cache.channelId()

    if (_.isNil(cid)) {
      new Timeout().recursive({ this: this, uid: 'getChannelHosts', wait: 1000, fnc: this.getChannelHosts })
      return
    }

    var request
    const url = `http://tmi.twitch.tv/hosts?include_logins=1&target=${cid}`
    let timeout = 30000
    try {
      request = await snekfetch.get(url)
      global.panel.io.emit('api.stats', { data: request.body.data, timestamp: _.now(), call: 'getChannelHosts', api: 'tmi', endpoint: url, code: request.status })
    } catch (e) {
      timeout = e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT' ? 1000 : timeout
      global.log.error(`${url} - ${e.message}`)
      global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getChannelHosts', api: 'tmi', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}` })
      return
    } finally {
      new Timeout().recursive({ this: this, uid: 'getChannelHosts', wait: timeout, fnc: this.getChannelHosts })
    }

    d('Current host count: %s, Hosts: %s', request.body.hosts.length, _.map(request.body.hosts, 'host_login').join(', '))
    await global.db.engine.update('api.current', { key: 'hosts' }, { value: request.body.hosts.length })

    // save hosts list
    for (let host of _.map(request.body.hosts, 'host_login')) {
      await global.db.engine.update('cache.hosts', { username: host }, { username: host })
    }
  }

  async updateChannelViews () {
    const cid = await global.cache.channelId()
    const url = `https://api.twitch.tv/helix/users/?id=${cid}`

    const needToWait = _.isNil(cid) || _.isNil(global.overlays)
    const notEnoughAPICalls = this.remainingAPICalls <= 10 && this.refreshAPICalls > _.now() / 1000
    DEBUG_API_UPDATE_CHANNEL_VIEWS(`GET ${url}\nwait: ${needToWait}\ncalls: ${this.remainingAPICalls}`)
    if (needToWait || notEnoughAPICalls) {
      if (notEnoughAPICalls) DEBUG_API_UPDATE_CHANNEL_VIEWS('Waiting for rate-limit to refresh')
      new Timeout().recursive({ this: this, uid: 'updateChannelViews', wait: 1000, fnc: this.updateChannelViews })
      return
    }

    var request
    let timeout = 60000
    try {
      request = await snekfetch.get(url)
        .set('Client-ID', config.settings.client_id)
        .set('Authorization', 'Bearer ' + config.settings.bot_oauth.split(':')[1])
      global.panel.io.emit('api.stats', { data: request.body.data, timestamp: _.now(), call: 'updateChannelViews', api: 'helix', endpoint: url, code: request.status, remaining: this.remainingAPICalls })
    } catch (e) {
      timeout = e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT' ? 1000 : timeout
      global.log.error(`${url} - ${e.message}`)
      global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'updateChannelViews', api: 'helix', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}`, remaining: this.remainingAPICalls })
      return
    } finally {
      new Timeout().recursive({ this: this, uid: 'updateChannelViews', wait: timeout, fnc: this.updateChannelViews })
    }

    // save remaining api calls
    this.remainingAPICalls = request.headers['ratelimit-remaining']
    this.refreshAPICalls = request.headers['ratelimit-reset']

    DEBUG_API_UPDATE_CHANNEL_VIEWS(request.body.data)
    await global.db.engine.update('api.current', { key: 'views' }, { value: request.body.data[0].view_count })
  }

  async getLatest100Followers (quiet) {
    const cid = await global.cache.channelId()
    const url = `https://api.twitch.tv/helix/users/follows?to_id=${cid}&first=100`

    const needToWait = _.isNil(cid) || _.isNil(global.overlays)
    const notEnoughAPICalls = this.remainingAPICalls <= 10 && this.refreshAPICalls > _.now() / 1000
    DEBUG_API_GET_LATEST_100_FOLLOWERS(`GET ${url}\nwait: ${needToWait}\ncalls: ${this.remainingAPICalls}`)
    if (needToWait || notEnoughAPICalls) {
      if (notEnoughAPICalls) DEBUG_API_GET_LATEST_100_FOLLOWERS('Waiting for rate-limit to refresh')
      new Timeout().recursive({ this: this, uid: 'getLatest100Followers', wait: 1000, fnc: this.getLatest100Followers })
      return
    }

    var request
    let timeout = 30000
    try {
      request = await snekfetch.get(url)
        .set('Client-ID', config.settings.client_id)
        .set('Authorization', 'Bearer ' + config.settings.bot_oauth.split(':')[1])
      global.panel.io.emit('api.stats', { data: request.body.data, timestamp: _.now(), call: 'getLatest100Followers', api: 'helix', endpoint: url, code: request.status, remaining: this.remainingAPICalls })
      quiet = false
    } catch (e) {
      timeout = e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT' ? 1000 : timeout
      global.log.error(`${url} - ${e.message}`)
      global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getLatest100Followers', api: 'helix', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}`, remaining: this.remainingAPICalls })
      return
    } finally {
      new Timeout().recursive({ this: this, uid: 'getLatest100Followers', wait: timeout, fnc: this.getLatest100Followers })
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
        DEBUG_API_GET_LATEST_100_FOLLOWERS_USERS('Searching id %s in users db: %j', u.from_id, user)
        if (_.isEmpty(user)) fidsToLoadFromAPI.push(u.from_id)
        else followersUsername.push(user.username)
      }
      DEBUG_API_GET_LATEST_100_FOLLOWERS_USERS('Usernames from db: %j', followersUsername)
      DEBUG_API_GET_LATEST_100_FOLLOWERS_USERS('IDs to load from API: %j', fidsToLoadFromAPI)

      if (fidsToLoadFromAPI.length > 0) {
        let fids = _.map(fidsToLoadFromAPI, (o) => `id=${o}`)
        let usersFromApi = await snekfetch.get(`https://api.twitch.tv/helix/users?${fids.join('&')}`)
          .set('Client-ID', config.settings.client_id)
          .set('Authorization', 'Bearer ' + config.settings.bot_oauth.split(':')[1])

        // save remaining api calls
        this.remainingAPICalls = usersFromApi.headers['ratelimit-remaining']
        this.refreshAPICalls = usersFromApi.headers['ratelimit-reset']

        global.panel.io.emit('api.stats', { data: request.body.data, timestamp: _.now(), call: 'getLatest100Followers', api: 'helix', endpoint: `https://api.twitch.tv/helix/users?${fids.join('&')}`, code: request.status, remaining: this.remainingAPICalls })
        for (let follower of usersFromApi.body.data) {
          followersUsername.push(follower.login.toLowerCase())
          DEBUG_API_GET_LATEST_100_FOLLOWERS_USERS('Saving user %s id %s', follower.login.toLowerCase(), follower.id)
          await global.db.engine.update('users', { username: follower.login.toLowerCase() }, { id: follower.id })
        }
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
        try {
          if (!_.isNil(_.find(fTime, (o) => o.id === user.id))) {
            DEBUG_API_GET_LATEST_100_FOLLOWERS_USERS('Saving user %s\n%f', follower, { is: { follower: true }, time: { followCheck: new Date().getTime(), follow: parseInt(moment(_.find(fTime, (o) => o.id === user.id).followed_at).format('x')) } })
            global.db.engine.update('users', { username: follower }, { is: { follower: true }, time: { followCheck: new Date().getTime(), follow: parseInt(moment(_.find(fTime, (o) => o.id === user.id).followed_at).format('x')) } })
          } else {
            DEBUG_API_GET_LATEST_100_FOLLOWERS_USERS('Saving user %s\n%f', follower, { is: { follower: true }, time: { followCheck: new Date().getTime(), follow: parseInt(moment().format('x')) } })
            global.db.engine.update('users', { username: follower }, { is: { follower: true }, time: { followCheck: new Date().getTime(), follow: parseInt(moment().format('x')) } })
          }
        } catch (e) {
          global.log.error(e)
          global.log.error(e.stack)
        }
      }
    }

    DEBUG_API_GET_LATEST_100_FOLLOWERS(`Current followers count: ${request.body.total}`)
    global.db.engine.update('api.current', { key: 'followers' }, { value: request.body.total })
  }

  async getGameFromId (gid) {
    const d = debug('api:getGameFromId')
    var request
    const url = `https://api.twitch.tv/helix/games?id=${gid}`

    if (gid.toString().trim().length === 0 || parseInt(gid, 10) === 0) return '' // return empty game if gid is empty

    let cache = await global.db.engine.findOne('cache', { upsert: true })
    let gids = _.get(cache, 'gidToGame', {})

    d('Cached id for game? %s', !_.isNil(gids[gid]))
    // check if id is cached
    if (!_.isNil(gids[gid])) return gids[gid]

    try {
      request = await snekfetch.get(url)
        .set('Client-ID', config.settings.client_id)
        .set('Authorization', 'Bearer ' + config.settings.bot_oauth.split(':')[1])
      if (cluster.isMaster) global.panel.io.emit('api.stats', { data: request.body.data, timestamp: _.now(), call: 'getGameFromId', api: 'helix', endpoint: url, code: request.status, remaining: this.remainingAPICalls })

      // add id->game to cache
      gids[gid] = request.body.data[0].name
      d('Saving id %s -> %s to cache', gid, request.body.data[0].name)
      await global.db.engine.update('cache', { key: 'gidToGame' }, { gidToGame: gids })
      return request.body.data[0].name
    } catch (e) {
      const game = await global.db.engine.findOne('api.current', { key: 'game' })
      global.log.warning(`Couldn't find name of game for gid ${gid} - fallback to ${game.value}`)
      global.log.error(`API: ${url} - ${e.status} ${_.get(e, 'body.message', e.message)}`)
      if (cluster.isMaster) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getGameFromId', api: 'helix', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}`, remaining: this.remainingAPICalls })
      return game.value
    }
  }

  async getCurrentStreamData (opts) {
    const cid = await global.cache.channelId()
    const url = `https://api.twitch.tv/helix/streams?user_id=${cid}`

    const needToWait = _.isNil(cid) || _.isNil(global.overlays)
    const notEnoughAPICalls = this.remainingAPICalls <= 10 && this.refreshAPICalls > _.now() / 1000
    DEBUG_API_GET_CURRENT_STREAM_DATA(`GET ${url}\nwait: ${needToWait}\ncalls: ${this.remainingAPICalls}`)
    if (needToWait || notEnoughAPICalls) {
      if (notEnoughAPICalls) DEBUG_API_GET_CURRENT_STREAM_DATA('Waiting for rate-limit to refresh')
      new Timeout().recursive({ this: this, uid: 'getCurrentStreamData', wait: 1000, fnc: this.getCurrentStreamData, args: [opts] })
      return
    }

    var request
    let timeout = 15000
    try {
      request = await snekfetch.get(url)
        .set('Client-ID', config.settings.client_id)
        .set('Authorization', 'Bearer ' + config.settings.bot_oauth.split(':')[1])
      global.panel.io.emit('api.stats', { data: request.body.data, timestamp: _.now(), call: 'getCurrentStreamData', api: 'helix', endpoint: url, code: request.status, remaining: this.remainingAPICalls })
    } catch (e) {
      timeout = e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT' ? 1000 : timeout
      global.log.error(`${url} - ${e.message}`)
      global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getCurrentStreamData', api: 'helix', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}`, remaining: this.remainingAPICalls })
      return
    } finally {
      new Timeout().recursive({ this: this, uid: 'getCurrentStreamData', wait: timeout, fnc: this.getCurrentStreamData, args: [opts] })
    }

    // save remaining api calls
    this.remainingAPICalls = request.headers['ratelimit-remaining']
    this.refreshAPICalls = request.headers['ratelimit-reset']

    DEBUG_API_GET_CURRENT_STREAM_DATA(request.body)
    global.status.API = request.status === 200 ? constants.CONNECTED : constants.DISCONNECTED
    if (request.status === 200 && !_.isNil(request.body.data[0])) {
      // correct status and we've got a data - stream online
      let stream = request.body.data[0]; DEBUG_API_GET_CURRENT_STREAM_DATA(stream)

      if (!moment.preciseDiff(moment(stream.started_at), moment((await global.cache.when()).online), true).firstDateWasLater) await global.cache.when({ online: stream.started_at })
      if (!await global.cache.isOnline() || this.streamType !== stream.type) {
        this.chatMessagesAtStart = global.linesParsed

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

      if (!this.gameOrTitleChangedManually) {
        let rawStatus = await global.cache.rawStatus()
        let status = await this.parseTitle()
        const game = await this.getGameFromId(stream.game_id)

        await global.db.engine.update('api.current', { key: 'status' }, { value: stream.title })
        await global.db.engine.update('api.current', { key: 'game' }, { value: game })

        if (stream.title !== status) {
          // check if status is same as updated status
          if (this.retries.getCurrentStreamData >= 15) {
            this.retries.getCurrentStreamData = 0
            rawStatus = stream.title
            await global.cache.rawStatus(rawStatus)
          } else {
            this.retries.getCurrentStreamData++
            return
          }
        } else {
          this.retries.getCurrentStreamData = 0
        }
        await global.cache.gameCache(game)
        await global.cache.rawStatus(rawStatus)
      }
    } else {
      if (await global.cache.isOnline() && this.curRetries < this.maxRetries) {
        // retry if it is not just some network / twitch issue
        this.curRetries = this.curRetries + 1
        DEBUG_API_GET_CURRENT_STREAM_DATA('Retry stream offline check, cur: %s, max: %s', this.curRetries, this.maxRetries)
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

        await global.db.engine.update('api.max', { key: 'viewers' }, { value: 0 })
        await global.db.engine.update('api.new', { key: 'chatters' }, { value: 0 })
        await global.db.engine.update('api.current', { key: 'viewers' }, { value: 0 })
        await global.db.engine.update('api.current', { key: 'bits' }, { value: 0 })
        await global.db.engine.update('api.current', { key: 'tips' }, { value: 0 })

        await global.db.engine.remove('cache.hosts', {}) // we dont want to have cached hosts on stream start
      }
    }
  }

  async saveStreamData (stream) {
    await global.db.engine.update('api.current', { key: 'viewers' }, { value: stream.viewer_count })

    let maxViewers = await global.db.engine.findOne('api.max', { key: 'viewers' })
    if (_.isNil(maxViewers.value) || maxViewers.value < stream.viewer_count) await global.db.engine.update('api.max', { key: 'viewers' }, { value: stream.viewer_count })

    global.stats.save({
      timestamp: new Date().getTime(),
      whenOnline: (await global.cache.when()).online,
      currentViewers: _.get(await global.db.engine.findOne('api.current', { key: 'viewers' }), 'value', 0),
      currentSubscribers: _.get(await global.db.engine.findOne('api.current', { key: 'subscribers' }), 'value', 0),
      currentFollowers: _.get(await global.db.engine.findOne('api.current', { key: 'followers' }), 'value', 0),
      currentBits: _.get(await global.db.engine.findOne('api.current', { key: 'bits' }), 'value', 0),
      currentTips: _.get(await global.db.engine.findOne('api.current', { key: 'tips' }), 'value', 0),
      chatMessages: global.linesParsed - this.chatMessagesAtStart,
      currentViews: _.get(await global.db.engine.findOne('api.current', { key: 'views' }), 'value', 0),
      maxViewers: _.get(await global.db.engine.findOne('api.max', { key: 'viewers' }), 'value', 0),
      newChatters: _.get(await global.db.engine.findOne('api.new', { key: 'chatters' }), 'value', 0),
      currentHosts: _.get(await global.db.engine.findOne('api.current', { key: 'hosts' }), 'value', 0),
      game_id: stream.game_id,
      user_id: stream.user_id,
      type: stream.type,
      language: stream.language,
      title: stream.title,
      thumbnail_url: stream.thumbnail_url
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
    const cid = await global.cache.channelId()
    const url = `https://api.twitch.tv/kraken/channels/${cid}`

    const needToWait = _.isNil(cid) || _.isNil(global.overlays)
    DEBUG_API_SET_TITLE_AND_GAME(`PUT ${url}\nwait: ${needToWait}`)
    if (needToWait) {
      new Timeout().recursive({ this: this, uid: 'setTitleAndGame', wait: 10, fnc: this.setTitleAndGame, args: [self, sender, args] })
      return
    }

    var request
    var status
    var game
    try {
      if (!_.isNil(args.title)) {
        await global.cache.rawStatus(args.title) // save raw status to cache, if changing title
      }
      status = await this.parseTitle(await global.cache.rawStatus())

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
      global.panel.io.emit('api.stats', { data: request.body.data, timestamp: _.now(), call: 'setTitleAndGame', api: 'kraken', endpoint: url, code: request.status })
    } catch (e) {
      global.log.error(`API: ${url} - ${e.status} ${_.get(e, 'body.message', e.message)}`)
      global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'setTitleAndGame', api: 'kraken', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}` })
      return
    }
    DEBUG_API_SET_TITLE_AND_GAME(request.body)

    global.status.API = request.status === 200 ? constants.CONNECTED : constants.DISCONNECTED
    if (request.status === 200 && !_.isNil(request.body)) {
      const response = request.body
      if (!_.isNil(args.game)) {
        response.game = _.isNil(response.game) ? '' : response.game
        if (response.game.trim() === args.game.trim()) {
          global.commons.sendMessage(global.translate('game.change.success')
            .replace(/\$game/g, response.game), sender)
          global.events.fire('game-changed', { oldGame: (await global.db.engine.findOne('api.current', { key: 'game' })).value, game: response.game })
          await global.db.engine.update('api.current', { key: 'game' }, { value: response.game })
        } else {
          global.commons.sendMessage(global.translate('game.change.failed')
            .replace(/\$game/g, (await global.db.engine.findOne('api.current', { key: 'game' })).value), sender)
        }
      }

      if (!_.isNull(args.title)) {
        if (response.status.trim() === status.trim()) {
          global.commons.sendMessage(global.translate('title.change.success')
            .replace(/\$title/g, response.status), sender)

          // we changed title outside of bot
          if (response.status !== status) await global.cache.rawStatus(response.status)
          await global.db.engine.update('api.current', { key: 'status' }, { value: response.status })
        } else {
          global.commons.sendMessage(global.translate('title.change.failed')
            .replace(/\$title/g, (await global.db.engine.findOne('api.current', { key: 'status' })).value), sender)
        }
      }
      this.gameOrTitleChangedManually = true
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
      global.panel.io.emit('api.stats', { data: request.body.data, timestamp: _.now(), call: 'sendGameFromTwitch', api: 'kraken', endpoint: url, code: request.status })
    } catch (e) {
      global.log.error(`API: ${url} - ${e.status} ${_.get(e, 'body.message', e.message)}`)
      global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'sendGameFromTwitch', api: 'kraken', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}` })
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
      global.panel.io.emit('api.stats', { data: request.body, timestamp: _.now(), call: 'fetchAccountAge', api: 'kraken', endpoint: url, code: request.status })
    } catch (e) {
      global.log.error(`API: ${url} - ${e.status} ${_.get(e, 'body.message', e.message)}`)
      global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'fetchAccountAge', api: 'kraken', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}` })
      return
    }
    d(request.body)
    await global.db.engine.update('users', { username: username }, { time: { created_at: request.body.created_at } })
  }

  async isFollower (username) {
    let user = await global.users.get(username)
    if (new Date().getTime() - _.get(user, 'time.followCheck', 0) >= 1000 * 60 * 30) this.rate_limit_follower_check.push(user)
  }

  async isFollowerUpdate (user) {
    const cid = await global.cache.channelId()
    const url = `https://api.twitch.tv/helix/users/follows?from_id=${user.id}&to_id=${cid}`

    const needToWait = _.isNil(cid) || _.isNil(global.overlays)
    const notEnoughAPICalls = this.remainingAPICalls <= 10 && this.refreshAPICalls > _.now() / 1000
    DEBUG_API_IS_FOLLOWER_UPDATE(`GET ${url}\nwait: ${needToWait}\ncalls: ${this.remainingAPICalls}`)
    if (needToWait || notEnoughAPICalls) {
      if (notEnoughAPICalls) DEBUG_API_IS_FOLLOWER_UPDATE('Waiting for rate-limit to refresh')
      new Timeout().recursive({ this: this, uid: 'isFollowerUpdate', wait: 1000, fnc: this.isFollowerUpdate, args: [user] })
      return
    }

    try {
      DEBUG_API_IS_FOLLOWER_UPDATE('IsFollowerUpdate check for user %s', user.username)
      var request = await snekfetch.get(url)
        .set('Accept', 'application/vnd.twitchtv.v5+json')
        .set('Authorization', 'Bearer ' + config.settings.bot_oauth.split(':')[1])
        .set('Client-ID', config.settings.client_id)
      global.panel.io.emit('api.stats', { data: request.body.data, timestamp: _.now(), call: 'isFollowerUpdate', api: 'helix', endpoint: url, code: request.status, remaining: global.twitch.remainingAPICalls })
      DEBUG_API_IS_FOLLOWER_UPDATE('Request done: %j', request.body)
    } catch (e) {
      global.log.error(`API: ${url} - ${e.status} ${_.get(e, 'body.message', e.message)}`)
      global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'isFollowerUpdate', api: 'helix', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}`, remaining: global.twitch.remainingAPICalls })
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

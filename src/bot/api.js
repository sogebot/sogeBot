const _ = require('lodash')
const axios = require('axios')
const querystring = require('querystring')
const moment = require('moment')
const {
  isMainThread
} = require('worker_threads');
const stacktrace = require('stacktrace-parser')
const fs = require('fs')
const chalk = require('chalk')
const constants = require('./constants')

const __DEBUG__ = {
  STREAM: (process.env.DEBUG && process.env.DEBUG.includes('api.stream')),
  CALLS: (process.env.DEBUG && process.env.DEBUG.includes('api.calls')),
  INTERVAL: (process.env.DEBUG && process.env.DEBUG.includes('api.interval'))
}

class API {
  _stream = {
    watchedTime: 0
  }

  constructor () {
    if (isMainThread) {
      global.panel.addMenu({ category: 'logs', name: 'api', id: 'apistats' })

      this.calls = {
        bot: new Proxy({}, {
          get: function (obj, prop) {
            if (typeof obj[prop] === 'undefined') {
              if (prop === 'limit') return 120
              if (prop === 'remaining') return 800
              if (prop === 'refresh') return (_.now() / 1000) + 90
            } else return obj[prop]
          },
          set: function (obj, prop, value) {
            if (Number(value) === Number(obj[prop])) return true

            if (prop === 'remaining' && __DEBUG__.CALLS) {
              global.log.debug(`API: ${prop} changed to ${value} at ${stacktrace.parse((new Error()).stack)[1].methodName}`)
              const remaining = obj.remaining || 'n/a'
              const refresh = obj.refresh || 'n/a'
              const limit = obj.limit || 'n/a'
              fs.appendFileSync('api.bot.csv', `${stacktrace.parse((new Error()).stack)[1].methodName}, ${new Date()}, ${limit}, ${remaining}, ${refresh}\n`)
            }

            value = Number(value)
            obj[prop] = value
            return true
          }
        }),
        broadcaster: new Proxy({}, {
          get: function (obj, prop) {
            if (typeof obj[prop] === 'undefined') {
              if (prop === 'remaining') return 0
              if (prop === 'refresh') return (_.now() / 1000) + 90
            } else return obj[prop]
          },
          set: function (obj, prop, value) {
            if (Number(value) === Number(obj[prop])) return true

            if (prop === 'remaining' && __DEBUG__.CALLS) {
              global.log.debug(`API: ${prop} changed to ${value} at ${stacktrace.parse((new Error()).stack)[1].methodName}`)
              const remaining = obj.remaining || 'n/a'
              const refresh = obj.refresh || 'n/a'
              const limit = obj.limit || 'n/a'
              fs.appendFileSync('api.bot.csv', `${stacktrace.parse((new Error()).stack)[1].methodName}, ${new Date()}, ${limit}, ${remaining}, ${refresh}\n`)
            }

            value = Number(value)
            obj[prop] = value
            return true
          }
        })
      }

      this.timeouts = {}

      this.rate_limit_follower_check = new Set()

      this.chatMessagesAtStart = global.linesParsed
      this.maxRetries = 3
      this.curRetries = 0
      this.streamType = 'live'
      this.streamId = null
      this.streamStartedAt = Date.now()

      this.gameOrTitleChangedManually = false

      this.retries = {
        getCurrentStreamData: 0,
        getChannelDataOldAPI: 0,
        getChannelSubscribers: 0
      }

      this._loadCachedStatusAndGame()

      this.interval('getCurrentStreamData', constants.MINUTE)
      this.interval('updateChannelViews', constants.MINUTE)
      this.interval('getLatest100Followers', constants.MINUTE)
      this.interval('getChannelHosts', constants.MINUTE)
      this.interval('getChannelSubscribers', 2 * constants.MINUTE)
      this.interval('getChannelChattersUnofficialAPI', constants.MINUTE)
      this.interval('getChannelDataOldAPI', constants.MINUTE)
      this.interval('intervalFollowerUpdate', constants.MINUTE)
      this.interval('checkClips', constants.MINUTE)
    } else {
      this.calls = {
        bot: {
          limit: 0,
          remaining: 0,
          refresh: 0
        },
        broadcaster: {
          limit: 0,
          remaining: 0,
          refresh: 0
        }
      }
    }
  }

  async timeoutAfterMs (ms) {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ state: false }), ms)
    })
  }

  async setRateLimit (type, limit, remaining, reset) {
    this.calls[type].limit = limit
    this.calls[type].remaining = remaining
    this.calls[type].reset = reset
  }

  async interval (fnc, interval) {
    setInterval(async () => {
      if (typeof this.timeouts[fnc] === 'undefined') this.timeouts[fnc] = { opts: {}, isRunning: false }

      if (!this.timeouts[fnc].isRunning) {
        this.timeouts[fnc].isRunning = true
        if (__DEBUG__.INTERVAL) global.log.info(chalk.yellow(fnc + '() ') + 'start')
        const value = await Promise.race([
          this[fnc](this.timeouts[fnc].opts),
          this.timeoutAfterMs(10000)
        ])
        if (__DEBUG__.INTERVAL) global.log.info(chalk.yellow(fnc + '() ') + JSON.stringify(value))

        if (value.disable) return
        if (value.state) { // if is ok, update opts and run unlock after a while
          if (typeof value.opts !== 'undefined') this.timeouts[fnc].opts = value.opts
          setTimeout(() => {
            this.timeouts[fnc].isRunning = false
          }, interval)
        } else { // else run next tick
          this.timeouts[fnc].isRunning = false
        }
      }
    }, 1000)
  }

  async intervalFollowerUpdate () {
    if (!isMainThread) throw new Error('API can run only on master')

    for (let username of this.rate_limit_follower_check) {
      const user = await global.users.getByName(username)
      const isSkipped = user.username === global.commons.getBroadcaster || user.username === global.oauth.settings.bot.username
      const userHaveId = !_.isNil(user.id)
      if (new Date().getTime() - _.get(user, 'time.followCheck', 0) <= 1000 * 60 * 60 * 24 || isSkipped || !userHaveId) {
        this.rate_limit_follower_check.delete(user.username)
      }
    }
    if (this.rate_limit_follower_check.size > 0 && !_.isNil(global.overlays)) {
      const user = await global.users.getByName(Array.from(this.rate_limit_follower_check)[0])
      this.rate_limit_follower_check.delete(user.username)
      await this.isFollowerUpdate(user)
    }
    return { state: true }
  }

  async _loadCachedStatusAndGame () {
    global.db.engine.update('api.current', { key: 'game' }, { value: await global.cache.gameCache() })
  }

  async getUsernameFromTwitch (id) {
    const url = `https://api.twitch.tv/helix/users?id=${id}`
    var request
    /*
      {
        "data": [{
          "id": "44322889",
          "login": "dallas",
          "display_name": "dallas",
          "type": "staff",
          "broadcaster_type": "",
          "description": "Just a gamer playing games and chatting. :)",
          "profile_image_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/dallas-profile_image-1a2c906ee2c35f12-300x300.png",
          "offline_image_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/dallas-channel_offline_image-1a2c906ee2c35f12-1920x1080.png",
          "view_count": 191836881,
          "email": "login@provider.com"
        }]
      }
    */

    const token = await global.oauth.settings.bot.accessToken
    const needToWait = token === ''
    const notEnoughAPICalls = global.api.calls.bot.remaining <= 30 && global.api.calls.bot.refresh > _.now() / 1000
    if ((needToWait || notEnoughAPICalls)) {
      return null
    }

    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      })

      // save remaining api calls
      // $FlowFixMe error with flow on request.headers
      this.calls.bot.limit = request.headers['ratelimit-limit']
      // $FlowFixMe error with flow on request.headers
      this.calls.bot.remaining = request.headers['ratelimit-remaining']
      // $FlowFixMe error with flow on request.headers
      this.calls.bot.refresh = request.headers['ratelimit-reset']
      global.workers.sendToAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', request.headers['ratelimit-limit'], request.headers['ratelimit-remaining'], request.headers['ratelimit-reset'] ] })

      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'getUsernameFromTwitch', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining })
      return request.data.data[0].login
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        global.workers.sendToAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', 120, 0, e.response.headers['ratelimit-reset'] ] })
        this.calls.bot.remaining = 0
        this.calls.bot.refresh = e.response.headers['ratelimit-reset']
      }
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getUsernameFromTwitch', api: 'helix', endpoint: url, code: e.response.status, data: e.stack, remaining: this.calls.bot.remaining })
    }
    return null
  }

  async getIdFromTwitch (username, isChannelId = false) {
    const url = `https://api.twitch.tv/helix/users?login=${username}`
    var request
    /*
      {
        "data": [{
          "id": "44322889",
          "login": "dallas",
          "display_name": "dallas",
          "type": "staff",
          "broadcaster_type": "",
          "description": "Just a gamer playing games and chatting. :)",
          "profile_image_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/dallas-profile_image-1a2c906ee2c35f12-300x300.png",
          "offline_image_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/dallas-channel_offline_image-1a2c906ee2c35f12-1920x1080.png",
          "view_count": 191836881,
          "email": "login@provider.com"
        }]
      }
    */

    const token = global.oauth.settings.bot.accessToken
    const needToWait = token === ''
    const notEnoughAPICalls = global.api.calls.bot.remaining <= 30 && global.api.calls.bot.refresh > _.now() / 1000
    if ((needToWait || notEnoughAPICalls) && !isChannelId) {
      return null
    }

    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      })

      // save remaining api calls
      // $FlowFixMe error with flow on request.headers
      this.calls.bot.limit = request.headers['ratelimit-limit']
      // $FlowFixMe error with flow on request.headers
      this.calls.bot.remaining = request.headers['ratelimit-remaining']
      // $FlowFixMe error with flow on request.headers
      this.calls.bot.refresh = request.headers['ratelimit-reset']
      global.workers.sendToAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', request.headers['ratelimit-limit'], request.headers['ratelimit-remaining'], request.headers['ratelimit-reset'] ] })

      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'getIdFromTwitch', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining })

      return request.data.data[0].id
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        global.workers.sendToAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', 120, 0, e.response.headers['ratelimit-reset'] ] })
        this.calls.bot.remaining = 0
        this.calls.bot.refresh = e.response.headers['ratelimit-reset']
        if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getIdFromTwitch', api: 'helix', endpoint: url, code: e.response.status, data: e.stack, remaining: this.calls.bot.remaining })
      } else {
        if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getIdFromTwitch', api: 'helix', endpoint: url, code: 'n/a', data: e.stack, remaining: this.calls.bot.remaining })
      }
    }
    return null
  }

  async getChannelChattersUnofficialAPI (opts) {
    if (!isMainThread) throw new Error('API can run only on master')

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

    const url = `https://tmi.twitch.tv/group/user/${global.commons.getChannel()}/chatters`
    const needToWait = _.isNil(global.widgets)
    if (needToWait) {
      return { state: false, opts }
    }

    var request
    try {
      request = await axios.get(url)
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'getChannelChattersUnofficialAPI', api: 'unofficial', endpoint: url, code: request.status })
      opts.saveToWidget = true
    } catch (e) {
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getChannelChattersUnofficialAPI', api: 'unofficial', endpoint: url, code: e.response.status, data: e.stack })
      return { state: false, opts }
    }

    if (typeof request.data.chatters === 'undefined') {
      return { state: true };
    }

    const chatters = _.flatMap(request.data.chatters)
    this.setModerators(request.data.chatters.moderators);

    let bulkInsert = []
    let bulkParted = []
    let allOnlineUsers = await global.users.getAllOnlineUsernames()
    let ignoredUsers = global.commons.getIgnoreList()

    for (let user of allOnlineUsers) {
      if (!_.includes(chatters, user)) {
        // user is no longer in channel
        await global.db.engine.remove('users.online', { username: user })
        if (!_.includes(ignoredUsers, user)) {
          bulkParted.push({ username: user })
          global.widgets.joinpart.send({ username: user, type: 'part' })
        }
      }
    }

    for (let chatter of chatters) {
      if (_.includes(ignoredUsers, chatter) || global.oauth.settings.bot.username === chatter) {
        // even if online, remove ignored user from collection
        await global.db.engine.remove('users.online', { username: chatter })
      } else if (!_.includes(allOnlineUsers, chatter)) {
        bulkInsert.push({ username: chatter })
        global.widgets.joinpart.send({ username: chatter, type: 'join' })
      }
    }
    // always remove bot from online users
    global.db.engine.remove('users.online', { username: global.oauth.settings.bot.username })

    if (bulkInsert.length > 0) {
      for (let chunk of _.chunk(bulkInsert, 100)) {
        await global.db.engine.insert('users.online', chunk)
      }
    }

    if (opts.saveToWidget) sendPartEvent(bulkParted)
    if (opts.saveToWidget) sendJoinEvent(bulkInsert)

    return { state: true, opts }
  }

  async getChannelSubscribers (opts) {
    if (!isMainThread) throw new Error('API can run only on master')
    opts = opts || {}

    const cid = global.oauth.channelId
    let url = `https://api.twitch.tv/helix/subscriptions?broadcaster_id=${cid}&first=100`
    if (opts.cursor) url += '&after=' + opts.cursor
    if (typeof opts.count === 'undefined') opts.count = -1 // start at -1 because owner is subbed as well


    const token = global.oauth.settings.broadcaster.accessToken
    const needToWait = _.isNil(cid) || cid === '' || _.isNil(global.overlays) || token === ''
    const notEnoughAPICalls = this.calls.bot.remaining <= 30 && this.calls.bot.refresh > _.now() / 1000

    if (needToWait || notEnoughAPICalls) {
      return { state: false }
    }

    var request
    let disable = false
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      })
      this.retries.getChannelSubscribers = 0 // reset retry
      const subscribers = request.data.data

      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { data: subscribers, timestamp: _.now(), call: 'getChannelSubscribers', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining })

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining']
      this.calls.bot.refresh = request.headers['ratelimit-reset']
      this.calls.bot.limit = request.headers['ratelimit-limit']
      global.workers.sendToAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', request.headers['ratelimit-limit'], request.headers['ratelimit-remaining'], request.headers['ratelimit-reset'] ] })

      this.setSubscribers(subscribers.filter(o => {
        return !global.commons.isOwner(o.user_name)  && !global.commons.isBot(o.user_name)
      }))
      if (subscribers.length === 100) {
        // move to next page
        this.getChannelSubscribers({ cursor: request.data.pagination.cursor, count: subscribers.length + opts.count })
      } else {
        await global.db.engine.update('api.current', { key: 'subscribers' }, { value: subscribers.length + opts.count })
      }
    } catch (e) {
      const isChannelPartnerOrAffiliate =
        !(e.message !== '422 Unprocessable Entity' ||
         (e.response.data.status === 400 && e.response.data.message === `${global.commons.getBroadcaster} does not have a subscription program`))
      if (!isChannelPartnerOrAffiliate) {
        if (this.retries.getChannelSubscribers >= 15) {
          disable = true
          global.log.warning('Broadcaster is not affiliate/partner, will not check subs')
          global.db.engine.update('api.current', { key: 'subscribers' }, { value: 0 })
          // caster is not affiliate or partner, don't do calls again
        }
      } else if (e.message === '403 Forbidden') {
        disable = true
        global.log.warning('Broadcaster have not correct oauth, will not check subs')
        global.db.engine.update('api.current', { key: 'subscribers' }, { value: 0 })
      } else {
        global.log.error(`${url} - ${e.message}`)
        if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getChannelSubscribers', api: 'helix', endpoint: url, code: e.response.status, data: e.stack, remaining: this.calls.bot.remaining })
      }
    }
    return { state: true, disable }
  }

  // mods is set of usernames
  async setModerators (mods) {
    const currentModerators = await global.db.engine.find('users', { is: { moderator: true } })

    // check if current moderators are still mods
    for (let user of currentModerators) {
      if (!mods.includes(user.username)) {
        // mod is not mod anymore
        if (!user.id) {
          global.log.warning('users collection data _id ' + user._id + ' might be corrupted - missing id?')
        } else {
          await global.db.engine.update('users', { id: user.id }, { username: user.username, is: { moderator: false } })
        }
      }

      // remove username if parsed
      const idx = mods.indexOf(user.username);
      if (idx > -1) {
        mods.splice(idx, 1);
      }
    }

    // set rest users as mods
    for (let username of mods) {
      if (global.commons.isBot(username)) { global.status.MOD = true; }
      else {
        const id = await global.users.getIdByName(username.toLowerCase(), true)
        if (id) {
          await global.db.engine.update('users', { id }, { is: { moderator: true }, username })
        }
      }
    }
  }

  async setSubscribers (subscribers) {
    const currentSubscribers = await global.db.engine.find('users', { is: { subscriber: true } })

    // check if current subscribers are still subs
    for (let user of currentSubscribers) {
      if (typeof user.lock === 'undefined' || (typeof user.lock !== 'undefined' && !user.lock.subscriber)) {
        if (!subscribers.map((o) => o.user_id).includes(user.id)) {
          // subscriber is not sub anymore -> unsub and set subStreak to 0
          await global.db.engine.update('users', { id: user.id }, {  is: { subscriber: false }, stats: { subStreak: 0 } })
        }
      }

      // remove id if parsed
      subscribers = subscribers.filter((o) => {
        return o.user_id !== user.id
      })
    }

    // set rest users as subs
    for (let user of subscribers) {
      await global.db.engine.update('users', { id: user.user_id }, { username: user.user_name, is: { subscriber: true }, stats: { tier: user.tier / 1000 } })
    }

    // update all subscribed_at
    const subscribersAfter = await global.db.engine.find('users', { is: { subscriber: true } })
    for (let user of subscribersAfter) {
      if (typeof user.time !== 'undefined' && typeof user.time.subscribed_at !== 'undefined') {
        await global.db.engine.update('users', { _id: String(user._id) }, { time: { subscribed_at: new Date(user.time.subscribed_at).getTime() }})
      }
    }
  }

  async getChannelDataOldAPI (opts) {
    if (!isMainThread) throw new Error('API can run only on master')

    const cid = global.oauth.channelId
    const url = `https://api.twitch.tv/kraken/channels/${cid}`

    const token = await global.oauth.settings.bot.accessToken
    const needToWait = _.isNil(cid) || cid === '' || _.isNil(global.overlays) || token === ''
    if (needToWait) {
      return { state: false, opts }
    }

    var request
    try {
      request = await axios.get(url, {
        headers: {
          'Accept': 'application/vnd.twitchtv.v5+json',
          'Authorization': 'OAuth ' + token
        }
      })
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'getChannelDataOldAPI', api: 'kraken', endpoint: url, code: request.status })

      if (!this.gameOrTitleChangedManually) {
        // Just polling update
        let rawStatus = await global.cache.rawStatus()
        let status = await this.parseTitle()

        if (request.data.status !== status && !opts.forceUpdate) {
          // check if status is same as updated status
          if (this.retries.getChannelDataOldAPI >= 15) {
            this.retries.getChannelDataOldAPI = 0
            await global.cache.rawStatus(request.data.status)
          } else {
            this.retries.getChannelDataOldAPI++
            return { state: false, opts }
          }
        } else {
          this.retries.getChannelDataOldAPI = 0
        }

        await global.db.engine.update('api.current', { key: 'game' }, { value: request.data.game })
        await global.db.engine.update('api.current', { key: 'title' }, { value: request.data.status })
        await global.cache.gameCache(request.data.game)
        await global.cache.rawStatus(rawStatus)
      } else {
        this.gameOrTitleChangedManually = false
      }
    } catch (e) {
      global.log.error(`${url} - ${e.message}`)
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getChannelDataOldAPI', api: 'kraken', endpoint: url, code: e.response.status, data: e.stack })
      return { state: false, opts }
    }

    return { state: true, opts }
  }

  async getChannelHosts () {
    if (!isMainThread) throw new Error('API can run only on master')

    const cid = global.oauth.channelId

    if (_.isNil(cid) || cid === '') {
      return { state: false }
    }

    var request
    const url = `http://tmi.twitch.tv/hosts?include_logins=1&target=${cid}`
    try {
      request = await axios.get(url)
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'getChannelHosts', api: 'tmi', endpoint: url, code: request.status })

      await global.db.engine.update('api.current', { key: 'hosts' }, { value: request.data.hosts.length })

      // save hosts list
      for (let host of _.map(request.data.hosts, 'host_login')) {
        await global.db.engine.update('cache.hosts', { username: host }, { username: host })
      }
    } catch (e) {
      global.log.error(`${url} - ${e.message}`)
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getChannelHosts', api: 'tmi', endpoint: url, code: e.response.status, data: e.stack })
      return { state: e.response.status === 500 }
    }
    return { state: true }
  }

  async updateChannelViews () {
    const cid = global.oauth.channelId
    const url = `https://api.twitch.tv/helix/users/?id=${cid}`

    const token = await global.oauth.settings.bot.accessToken
    const needToWait = _.isNil(cid) || cid === '' || _.isNil(global.overlays) || token === ''
    const notEnoughAPICalls = this.calls.bot.remaining <= 30 && this.calls.bot.refresh > _.now() / 1000
    if (needToWait || notEnoughAPICalls) {
      return { state: false }
    }

    var request
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      })
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'updateChannelViews', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining })

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining']
      this.calls.bot.refresh = request.headers['ratelimit-reset']
      this.calls.bot.limit = request.headers['ratelimit-limit']
      global.workers.sendToAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', request.headers['ratelimit-limit'], request.headers['ratelimit-remaining'], request.headers['ratelimit-reset'] ] })

      if (request.data.data.length > 0) await global.db.engine.update('api.current', { key: 'views' }, { value: request.data.data[0].view_count })
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        global.workers.sendToAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', 120, 0, e.response.headers['ratelimit-reset'] ] })
        this.calls.bot.remaining = 0
        this.calls.bot.refresh = e.response.headers['ratelimit-reset']
      }

      global.log.error(`${url} - ${e.message}`)
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'updateChannelViews', api: 'helix', endpoint: url, code: e.response.status, data: e.stack, remaining: this.calls.bot.remaining })
    }
    return { state: true }
  }

  async getLatest100Followers (quiet) {
    const cid = global.oauth.channelId
    const url = `https://api.twitch.tv/helix/users/follows?to_id=${cid}&first=100`
    const token = await global.oauth.settings.bot.accessToken
    const needToWait = _.isNil(cid) || cid === '' || _.isNil(global.overlays) || token === ''
    const notEnoughAPICalls = this.calls.bot.remaining <= 30 && this.calls.bot.refresh > _.now() / 1000

    if (needToWait || notEnoughAPICalls) {
      return { state: false, opts: quiet }
    }

    var request
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      })

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining']
      this.calls.bot.refresh = request.headers['ratelimit-reset']
      this.calls.bot.limit = request.headers['ratelimit-limit']
      global.workers.sendToAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', request.headers['ratelimit-limit'], request.headers['ratelimit-remaining'], request.headers['ratelimit-reset'] ] })

      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'getLatest100Followers', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining })

      if (request.status === 200 && !_.isNil(request.data.data)) {
        // check if user id is in db, not in db load username from API
        for (let f of request.data.data) {
          f.from_name = String(f.from_name).toLowerCase()
          let user = await global.users.getById(f.from_id)
          user.username = f.from_name
          global.db.engine.update('users', { id: f.from_id }, { username: f.from_name })

          if (!_.get(user, 'is.follower', false)) {
            if (new Date().getTime() - new Date(f.followed_at).getTime() < 2 * constants.HOUR) {
              if ((_.get(user, 'time.follow', 0) === 0 || new Date().getTime() - _.get(user, 'time.follow', 0) > 60000 * 60) && !global.webhooks.existsInCache('follow', user.id)) {
                global.webhooks.addIdToCache('follow', user.id)
                global.overlays.eventlist.add({
                  type: 'follow',
                  username: user.username
                })
                if (!quiet && !(await global.commons.isBot(user.username))) {
                  global.log.follow(user.username)
                  global.events.fire('follow', { username: user.username })

                  // go through all systems and trigger on.follow
                  for (let [type, systems] of Object.entries({
                    systems: global.systems,
                    games: global.games,
                    overlays: global.overlays,
                    widgets: global.widgets,
                    integrations: global.integrations
                  })) {
                    for (let [name, system] of Object.entries(systems)) {
                      if (name.startsWith('_') || typeof system.on === 'undefined') continue
                      if (typeof system.on.follow === 'function') {
                        system.on.follow({
                          username: user.username,
                          userId: f.from_id,
                        })
                      }
                    }
                  }
                }
              }
            }
          }
          try {
            const followedAt = user.lock && user.lock.followed_at ? Number(user.time.follow) : new Date(f.followed_at).getTime()
            const isFollower = user.lock && user.lock.follower ? user.is.follower : true
            global.db.engine.update('users', { id: f.from_id }, { username: f.from_name, is: { follower: isFollower }, time: { followCheck: new Date().getTime(), follow: followedAt } })
          } catch (e) {
            global.log.error(e.stack)
          }
        }
      }

      global.db.engine.update('api.current', { key: 'followers' }, { value: request.data.total })
      quiet = false
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        global.workers.sendToAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', 120, 0, e.response.headers['ratelimit-reset'] ] })
        this.calls.bot.remaining = 0
        this.calls.bot.refresh = e.response.headers['ratelimit-reset']
      }

      quiet = e.errno !== 'ECONNREFUSED' && e.errno !== 'ETIMEDOUT'
      global.log.error(`${url} - ${e.message}`)
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getLatest100Followers', api: 'helix', endpoint: url, code: e.response.status, data: e.stack, remaining: this.calls.bot.remaining })
      return { state: false, opts: quiet }
    }
    return { state: true, opts: quiet }
  }

  async getGameFromId (id) {
    var request
    const url = `https://api.twitch.tv/helix/games?id=${id}`

    if (id.toString().trim().length === 0 || parseInt(id, 10) === 0) return '' // return empty game if gid is empty

    let gameFromDb = await global.db.engine.findOne('core.api.games', { id })

    // check if id is cached
    if (!_.isEmpty(gameFromDb)) return gameFromDb.name

    try {
      const token = await global.oauth.settings.bot.accessToken
      if (token === '') throw new Error('token not available')
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      })

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining']
      this.calls.bot.refresh = request.headers['ratelimit-reset']
      this.calls.bot.limit = request.headers['ratelimit-limit']
      global.workers.sendToAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', request.headers['ratelimit-limit'], request.headers['ratelimit-remaining'], request.headers['ratelimit-reset'] ] })

      if (isMainThread) if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'getGameFromId', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining })

      // add id->game to cache
      const name = request.data.data[0].name
      await global.db.engine.insert('core.api.games', { id, name })
      return name
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        global.workers.sendToAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', 120, 0, e.response.headers['ratelimit-reset'] ] })
        this.calls.bot.remaining = 0
        this.calls.bot.refresh = e.response.headers['ratelimit-reset']
      }

      const game = await global.db.engine.findOne('api.current', { key: 'game' })
      global.log.warning(`Couldn't find name of game for gid ${id} - fallback to ${game.value}`)
      global.log.error(`API: ${url} - ${e.stack}`)
      if (isMainThread) if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getGameFromId', api: 'helix', endpoint: url, code: e.response.status, data: e.stack, remaining: this.calls.bot.remaining })
      return game.value
    }
  }

  async getCurrentStreamData (opts) {
    if (!isMainThread) throw new Error('API can run only on master')

    const cid = global.oauth.channelId
    const url = `https://api.twitch.tv/helix/streams?user_id=${cid}`

    const token = await global.oauth.settings.bot.accessToken
    const needToWait = _.isNil(cid) || cid === '' || _.isNil(global.overlays) || token === ''
    const notEnoughAPICalls = this.calls.bot.remaining <= 30 && this.calls.bot.refresh > _.now() / 1000
    if (needToWait || notEnoughAPICalls) {
      return { state: false, opts }
    }

    var request
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      })

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining']
      this.calls.bot.refresh = request.headers['ratelimit-reset']
      this.calls.bot.limit = request.headers['ratelimit-limit']
      global.workers.sendToAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', request.headers['ratelimit-limit'], request.headers['ratelimit-remaining'], request.headers['ratelimit-reset'] ] })

      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'getCurrentStreamData', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining })

      let justStarted = false

      if (__DEBUG__.STREAM) {
        global.log.debug('API: ' + JSON.stringify(request.data))
      }

      if (request.status === 200 && !_.isNil(request.data.data[0])) {
        // correct status and we've got a data - stream online
        let stream = request.data.data[0]

        if (!moment.preciseDiff(moment(stream.started_at), moment((await global.cache.when()).online), true).firstDateWasLater) await global.cache.when({ online: stream.started_at })
        if (!(await global.cache.isOnline()) || this.streamType !== stream.type) {
          this.chatMessagesAtStart = global.linesParsed

          if (!global.webhooks.enabled.streams && Number(this.streamId) !== Number(stream.id)) {
            if (__DEBUG__.STREAM) {
              global.log.debug('API: ' + JSON.stringify(stream))
            }
            global.log.start(
              `id: ${stream.id} | startedAt: ${stream.started_at} | title: ${stream.title} | game: ${await this.getGameFromId(stream.game_id)} | type: ${stream.type} | channel ID: ${cid}`
            )
            global.events.fire('stream-started')
            global.events.fire('command-send-x-times', { reset: true })
            global.events.fire('keyword-send-x-times', { reset: true })
            global.events.fire('every-x-minutes-of-stream', { reset: true })
            justStarted = true

            // go through all systems and trigger on.streamStart
            for (let [type, systems] of Object.entries({
              systems: global.systems,
              games: global.games,
              overlays: global.overlays,
              widgets: global.widgets,
              integrations: global.integrations
            })) {
              for (let [name, system] of Object.entries(systems)) {
                if (name.startsWith('_') || typeof system.on === 'undefined') continue
                if (typeof system.on.streamStart === 'function') {
                  system.on.streamStart()
                }
              }
            }
          }
        }

        // Always keep this updated
        this.streamStartedAt = stream.started_at
        this.streamId = stream.id
        this.streamType = stream.type

        this.curRetries = 0
        this.saveStreamData(stream)
        await global.cache.isOnline(true)

        if (!justStarted) {
          // don't run events on first check
          global.events.fire('number-of-viewers-is-at-least-x')
          global.events.fire('stream-is-running-x-minutes')
          global.events.fire('every-x-minutes-of-stream')
        }

        if (!this.gameOrTitleChangedManually) {
          let rawStatus = await global.cache.rawStatus()
          let status = await this.parseTitle()
          const game = await this.getGameFromId(stream.game_id)

          await global.db.engine.update('api.current', { key: 'title' }, { value: stream.title })
          await global.db.engine.update('api.current', { key: 'game' }, { value: game })

          if (stream.title !== status) {
            // check if status is same as updated status
            if (this.retries.getCurrentStreamData >= 12) {
              this.retries.getCurrentStreamData = 0
              rawStatus = stream.title
              await global.cache.rawStatus(rawStatus)
            } else {
              this.retries.getCurrentStreamData++
              return { state: false, opts }
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
        } else {
          // stream is really offline
          this.curRetries = 0
          await global.cache.isOnline(false)

          let when = await global.cache.when()
          if (_.isNil(when.offline)) {
            if (!_.isNil(when.online)) global.log.stop('')
            this._stream.watchedTime = 0
            global.cache.when({ offline: moment().format() })
            global.events.fire('stream-stopped')
            global.events.fire('stream-is-running-x-minutes', { reset: true })
            global.events.fire('number-of-viewers-is-at-least-x', { reset: true })

            // go through all systems and trigger on.streamEnd
            for (let [type, systems] of Object.entries({
              systems: global.systems,
              games: global.games,
              overlays: global.overlays,
              widgets: global.widgets,
              integrations: global.integrations
            })) {
              for (let [name, system] of Object.entries(systems)) {
                if (name.startsWith('_') || typeof system.on === 'undefined') continue
                if (typeof system.on.streamEnd === 'function') {
                  system.on.streamEnd()
                }
              }
            }
          }

          await global.db.engine.update('api.max', { key: 'viewers' }, { value: 0 })
          await global.db.engine.update('api.new', { key: 'chatters' }, { value: 0 })
          await global.db.engine.update('api.current', { key: 'viewers' }, { value: 0 })
          await global.db.engine.update('api.current', { key: 'bits' }, { value: 0 })
          await global.db.engine.update('api.current', { key: 'tips' }, { value: 0 })

          await global.db.engine.remove('cache.hosts', {}) // we dont want to have cached hosts on stream start
          await global.db.engine.remove('cache.raids', {}) // we dont want to have cached raids on stream start

          this.streamId = null
        }
      }
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        global.workers.sendToAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', 120, 0, e.response.headers['ratelimit-reset'] ] })
        this.calls.bot.remaining = 0
        this.calls.bot.refresh = e.response.headers['ratelimit-reset']
      }

      global.log.error(`${url} - ${e.message}`)
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getCurrentStreamData', api: 'helix', endpoint: url, code: e.response.status, data: e.stack, remaining: this.calls.bot.remaining })
      return { state: false, opts }
    }
    return { state: true, opts }
  }

  async saveStreamData (stream) {
    if (!isMainThread) throw new Error('API can run only on master')
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
      currentWatched: this._stream.watchedTime,
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
      for (let variable of title.match(regexp)) {
        let value
        if (await global.customvariables.isVariableSet(variable)) {
          value = await global.customvariables.getValueOf(variable)
        } else {
          value = global.translate('webpanel.not-available')
        }
        title = title.replace(new RegExp(`\\${variable}`, 'g'), value)
      }
    }
    return title
  }

  async setTitleAndGame (sender, args) {
    if (!isMainThread) throw new Error('API can run only on master')

    args = _.defaults(args, { title: null }, { game: null })
    const cid = global.oauth.channelId
    const url = `https://api.twitch.tv/kraken/channels/${cid}`

    const token = await global.oauth.settings.bot.accessToken
    const needToWait = _.isNil(cid) || cid === '' || _.isNil(global.overlays) || token === ''
    if (needToWait) {
      setTimeout(() => this.setTitleAndGame(sender, args), 1000)
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

      request = await axios({
        method: 'put',
        url,
        data: {
          channel: {
            game: game,
            status: status
          }
        },
        headers: {
          'Accept': 'application/vnd.twitchtv.v5+json',
          'Authorization': 'OAuth ' + token
        }
      })
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'setTitleAndGame', api: 'kraken', endpoint: url, code: request.status })
    } catch (e) {
      global.log.error(`API: ${url} - ${e.message}`)
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'setTitleAndGame', api: 'kraken', endpoint: url, code: e.response.status, data: e.stack })
      return false
    }

    if (request.status === 200 && !_.isNil(request.data)) {
      const response = request.data
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
          await global.db.engine.update('api.current', { key: 'title' }, { value: response.status })
        } else {
          global.commons.sendMessage(global.translate('title.change.failed')
            .replace(/\$title/g, (await global.db.engine.findOne('api.current', { key: 'title' })).value), sender)
        }
      }
      this.gameOrTitleChangedManually = true
      return true;
    }
  }

  async sendGameFromTwitch (self, socket, game) {
    if (!isMainThread) throw new Error('API can run only on master')
    const url = `https://api.twitch.tv/kraken/search/games?query=${encodeURIComponent(game)}&type=suggest`

    const token = await global.oauth.settings.bot.accessToken
    if (token === '') return

    var request
    try {
      request = await axios.get(url, {
        headers: {
          'Accept': 'application/vnd.twitchtv.v5+json',
          'Authorization': 'OAuth ' + token
        }
      })
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'sendGameFromTwitch', api: 'kraken', endpoint: url, code: request.status })
    } catch (e) {
      global.log.error(`API: ${url} - ${e.stack}`)
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'sendGameFromTwitch', api: 'kraken', endpoint: url, code: e.response.status, data: e.stack })
      return
    }

    if (_.isNull(request.data.games)) {
      if (socket) socket.emit('sendGameFromTwitch', false)
      return false
    } else {
      if (socket) socket.emit('sendGameFromTwitch', _.map(request.data.games, 'name'))
      return _.map(request.data.games, 'name')
    }
  }

  async checkClips () {
    if (!isMainThread) throw new Error('API can run only on master')

    const token = global.oauth.settings.bot.accessToken
    if (token === '') {
      return { state: false }
    }

    let notCheckedClips = (await global.db.engine.find('api.clips', { isChecked: false }))

    // remove clips which failed
    for (let clip of _.filter(notCheckedClips, (o) => new Date(o.shouldBeCheckedAt).getTime() < new Date().getTime())) {
      await global.db.engine.remove('api.clips', { _id: String(clip._id) })
    }
    notCheckedClips = _.filter(notCheckedClips, (o) => new Date(o.shouldBeCheckedAt).getTime() >= new Date().getTime())
    const url = `https://api.twitch.tv/helix/clips?id=${notCheckedClips.map((o) => o.clipId).join(',')}`

    if (notCheckedClips.length === 0) { // nothing to do
      return { state: true }
    }

    const notEnoughAPICalls = this.calls.bot.remaining <= 30 && this.calls.bot.refresh > _.now() / 1000
    if (notEnoughAPICalls) {
      return { state: false }
    }

    var request
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      })

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining']
      this.calls.bot.refresh = request.headers['ratelimit-reset']
      this.calls.bot.limit = request.headers['ratelimit-limit']
      global.workers.sendToAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', request.headers['ratelimit-limit'], request.headers['ratelimit-remaining'], request.headers['ratelimit-reset'] ] })

      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'checkClips', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining })

      for (let clip of request.data.data) {
        // clip found in twitch api
        await global.db.engine.update('api.clips', { clipId: clip.id }, { isChecked: true })
      }
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        global.workers.sendToAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', 120, 0, e.response.headers['ratelimit-reset'] ] })
        this.calls.bot.remaining = 0
        this.calls.bot.refresh = e.response.headers['ratelimit-reset']
      }

      global.log.error(`API: ${url} - ${e.stack}`)
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'checkClips', api: 'helix', endpoint: url, code: e.response.status, data: e.stack })
    }
    return { state: true }
  }

  async createClip (opts) {
    if (!isMainThread) throw new Error('API can run only on master')

    if (!(await global.cache.isOnline())) return // do nothing if stream is offline

    const isClipChecked = async function (id) {
      const check = async (resolve, reject) => {
        let clip = await global.db.engine.findOne('api.clips', { clipId: id })
        if (_.isEmpty(clip)) resolve(false)
        else if (clip.isChecked) resolve(true)
        else {
          // not checked yet
          setTimeout(() => check(resolve, reject), 100)
        }
      }
      return new Promise(async (resolve, reject) => check(resolve, reject))
    }

    _.defaults(opts, { hasDelay: true })

    const cid = global.oauth.channelId
    const url = `https://api.twitch.tv/helix/clips?broadcaster_id=${cid}`

    const token = await global.oauth.settings.bot.accessToken
    const needToWait = _.isNil(cid) || cid === '' || _.isNil(global.overlays) || token === ''
    const notEnoughAPICalls = this.calls.bot.remaining <= 30 && this.calls.bot.refresh > _.now() / 1000
    if (needToWait || notEnoughAPICalls) {
      setTimeout(() => this.createClip(opts), 1000)
      return
    }

    var request
    try {
      request = await axios({
        method: 'post',
        url,
        headers: {
          'Authorization': 'Bearer ' + token
        }
      })

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining']
      this.calls.bot.refresh = request.headers['ratelimit-reset']
      this.calls.bot.limit = request.headers['ratelimit-limit']
      global.workers.sendToAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', request.headers['ratelimit-limit'], request.headers['ratelimit-remaining'], request.headers['ratelimit-reset'] ] })

      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'createClip', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining })
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        global.workers.sendToAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', 120, 0, e.response.headers['ratelimit-reset'] ] })
        this.calls.bot.remaining = 0
        this.calls.bot.refresh = e.response.headers['ratelimit-reset']
      }

      global.log.error(`API: ${url} - ${e.stack}`)
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'createClip', api: 'helix', endpoint: url, code: e.response.status, data: e.stack })
      return
    }
    const clipId = request.data.data[0].id
    const timestamp = new Date()
    await global.db.engine.insert('api.clips', { clipId: clipId, isChecked: false, shouldBeCheckedAt: new Date(timestamp.getTime() + 120 * 1000) })
    return (await isClipChecked(clipId)) ? clipId : null
  }

  async fetchAccountAge (username, id) {
    if (!isMainThread) throw new Error('API can run only on master')
    const url = `https://api.twitch.tv/kraken/users/${id}`

    const token = await global.oauth.settings.bot.accessToken
    if (token === '') return

    var request
    try {
      request = await axios.get(url, {
        headers: {
          'Accept': 'application/vnd.twitchtv.v5+json',
          'Authorization': 'OAuth ' + token
        }
      })
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'fetchAccountAge', api: 'kraken', endpoint: url, code: request.status })
    } catch (e) {
      if (e.errno === 'ECONNRESET' || e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT') return // ignore ECONNRESET errors

      let logError
      try {
        logError = e.response.data.status !== 422
      } catch (e) {
        logError = true
      }

      if (logError) {
        global.log.error(`API: ${url} - ${e.stack}`)
        if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'fetchAccountAge', api: 'kraken', endpoint: url, code: e.response.status, data: e.stack })
      }
      return
    }
    await global.db.engine.update('users', { id }, { username: username, time: { created_at: new Date(request.data.created_at).getTime() } })
  }

  async isFollower (username) {
    this.rate_limit_follower_check.add(username)
  }

  async isFollowerUpdate (user) {
    if (!isMainThread) throw new Error('API can run only on master')
    if (!user.id) return
    clearTimeout(this.timeouts['isFollowerUpdate-' + user.id])

    const cid = global.oauth.channelId
    const url = `https://api.twitch.tv/helix/users/follows?from_id=${user.id}&to_id=${cid}`

    const token = await global.oauth.settings.bot.accessToken
    const needToWait = _.isNil(cid) || cid === '' || _.isNil(global.overlays) || token === ''
    const notEnoughAPICalls = this.calls.bot.remaining <= 40 && this.calls.bot.refresh > _.now() / 1000
    if (needToWait || notEnoughAPICalls) {
      this.timeouts['isFollowerUpdate-' + user.id] = setTimeout(() => this.isFollowerUpdate(user), 1000)
      return
    }

    var request
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      })

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining']
      this.calls.bot.refresh = request.headers['ratelimit-reset']
      this.calls.bot.limit = request.headers['ratelimit-limit']
      global.workers.sendToAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', request.headers['ratelimit-limit'], request.headers['ratelimit-remaining'], request.headers['ratelimit-reset'] ] })

      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'isFollowerUpdate', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining })
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        global.workers.sendToAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', 120, 0, e.response.headers['ratelimit-reset'] ] })
        this.calls.bot.remaining = 0
        this.calls.bot.refresh = e.response.headers['ratelimit-reset']
      }

      global.log.error(`API: ${url} - ${e.stack}`)
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'isFollowerUpdate', api: 'helix', endpoint: url, code: e.response.status, data: e.stack, remaining: this.calls.bot.remaining })
      return
    }

    if (request.data.total === 0) {
      // not a follower
      // if was follower, fire unfollow event
      if (user.is.follower) {
        global.log.unfollow(user.username)
        global.events.fire('unfollow', { username: user.username })
      }
      const followedAt = user.lock && user.lock.followed_at ? Number(user.time.follow) : 0
      const isFollower = user.lock && user.lock.follower ? user.is.follower : false
      global.users.setById(user.id, { username: user.username, is: { follower: isFollower }, time: { followCheck: new Date().getTime(), follow: followedAt } }, user.is.follower)
    } else {
      // is follower
      if (!user.is.follower && new Date().getTime() - moment(request.data.data[0].followed_at).format('x') < 60000 * 60) {
        global.overlays.eventlist.add({
          type: 'follow',
          username: user.username
        })
        global.log.follow(user.username)
        global.events.fire('follow', { username: user.username })

        // go through all systems and trigger on.follow
        for (let [type, systems] of Object.entries({
          systems: global.systems,
          games: global.games,
          overlays: global.overlays,
          widgets: global.widgets,
          integrations: global.integrations
        })) {
          for (let [name, system] of Object.entries(systems)) {
            if (name.startsWith('_') || typeof system.on === 'undefined') continue
            if (typeof system.on.follow === 'function') {
              system.on.follow({
                username: user.username,
                userId: user.id,
              })
            }
          }
        }
      }
      const followedAt = user.lock && user.lock.followed_at ? Number(user.time.follow) : parseInt(moment(request.data.data[0].followed_at).format('x'), 10)
      const isFollower = user.lock && user.lock.follower ? user.is.follower : true
      global.users.set(user.username, { id: user.id, is: { follower: isFollower }, time: { followCheck: new Date().getTime(), follow: followedAt } }, !user.is.follower)
    }
  }

  async createMarker () {
    const token = global.oauth.settings.bot.accessToken
    const cid = global.oauth.channelId

    const url = 'https://api.twitch.tv/helix/streams/markers'
    try {
      if (token === '') throw Error('missing bot accessToken')
      if (cid === '') throw Error('channel is not set')

      const request = await axios({
        method: 'post',
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        data: {
          user_id: String(cid),
          description: 'Marked from sogeBot'
        }
      })

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining']
      this.calls.bot.refresh = request.headers['ratelimit-reset']
      this.calls.bot.limit = request.headers['ratelimit-limit']
      global.workers.sendToAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', request.headers['ratelimit-limit'], request.headers['ratelimit-remaining'], request.headers['ratelimit-reset'] ] })

      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'createMarker', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining, data: request.data })
    } catch (e) {
      if (e.errno === 'ECONNRESET' || e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT') return this.createMarker()
      global.log.error(`API: Marker was not created - ${e.message}`)
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'createMarker', api: 'helix', endpoint: url, code: e.response.status, data: e.stack, remaining: this.calls.bot.remaining })
    }
  }

  async getClipById (id) {
    const url = `https://api.twitch.tv/helix/clips/?id=${id}`

    const token = await global.oauth.settings.bot.accessToken
    if (token === '') return null

    var request
    try {
      request = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        }
      })
      global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'getClipById', api: 'kraken', endpoint: url, code: request.status, remaining: this.remainingAPICalls })
      return request.data
    } catch (e) {
      global.log.error(`${url} - ${e.message}`)
      global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getClipById', api: 'kraken', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.statusText)}`, remaining: this.remainingAPICalls })
      return null
    }
  }

  async getTopClips (opts) {
    let url = 'https://api.twitch.tv/helix/clips?broadcaster_id=' + global.oauth.channelId
    const token = global.oauth.settings.bot.accessToken
    try {
      if (token === '') throw Error('No broadcaster access token')
      if (typeof opts === 'undefined' || !opts) throw Error('Missing opts')

      if (opts.period) {
        if (opts.period === 'stream') {
          url += '&' + querystring.stringify({
            started_at: (new Date(this.streamStartedAt)).toISOString(),
            ended_at: (new Date()).toISOString()
          })
        } else {
          if (!opts.days || opts.days < 0) throw Error('Days cannot be < 0')
          url += '&' + querystring.stringify({
            started_at: (new Date((new Date()).setDate(-opts.days))).toISOString(),
            ended_at: (new Date()).toISOString()
          })
        }
      }
      if (opts.first) url += '&first=' + opts.first

      const request = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        }
      })

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining']
      this.calls.bot.refresh = request.headers['ratelimit-reset']
      this.calls.bot.limit = request.headers['ratelimit-limit']
      global.workers.sendToAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', request.headers['ratelimit-limit'], request.headers['ratelimit-remaining'], request.headers['ratelimit-reset'] ] })

      global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'getClipById', api: 'kraken', endpoint: url, code: request.status, remaining: this.remainingAPICalls })
      // get mp4 from thumbnail
      for (let c of request.data.data) {
        c.mp4 = c.thumbnail_url.replace('-preview-480x272.jpg', '.mp4')
        c.game = await this.getGameFromId(c.game_id)
      }
      return request.data.data
    } catch (e) {
      global.log.error(`API: ${url} - ${e.stack}`)
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getTopClips', api: 'helix', endpoint: url, code: e.response.status, data: e.stack })
    }
  }
}

module.exports = API

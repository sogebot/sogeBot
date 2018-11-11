const _ = require('lodash')
const axios = require('axios')
const querystring = require('querystring')
const moment = require('moment')
const cluster = require('cluster')
const stacktrace = require('stacktrace-parser')
const fs = require('fs')

const __DEBUG__ = {
  STREAM: (process.env.DEBUG && process.env.DEBUG.includes('api.stream')),
  CALLS: (process.env.DEBUG && process.env.DEBUG.includes('api.calls'))
}

class API {
  constructor () {
    if (cluster.isMaster) {
      this.calls = {
        bot: new Proxy({}, {
          get: function (obj, prop) {
            if (typeof obj[prop] === 'undefined') {
              if (prop === 'limit') return 120
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
        getChannelSubscribersOldAPI: 0
      }

      this._loadCachedStatusAndGame()

      this.getCurrentStreamData({ interval: true })
      this.getLatest100Followers(true)
      this.updateChannelViews()
      this.getChannelHosts()

      this.getChannelChattersUnofficialAPI({ saveToWidget: false })

      this.getChannelSubscribersOldAPI() // remove this after twitch add total subscribers
      this.getChannelDataOldAPI({ forceUpdate: true }) // remove this after twitch game and status for new API

      this.intervalFollowerUpdate()
      this.checkClips()
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

  async setRateLimit (type, limit, remaining, reset) {
    this.calls[type].limit = limit
    this.calls[type].remaining = remaining
    this.calls[type].reset = reset
  }

  async intervalFollowerUpdate () {
    if (cluster.isWorker) throw new Error('API can run only on master')
    clearTimeout(this.timeouts['intervalFollowerUpdate'])

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
    this.timeouts['intervalFollowerUpdate'] = setTimeout(() => this.intervalFollowerUpdate(), 10000)
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
      global.commons.processAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', request.headers['ratelimit-limit'], request.headers['ratelimit-remaining'], request.headers['ratelimit-reset'] ] })

      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'getUsernameFromTwitch', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining })
      return request.data.data[0].login
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        global.commons.processAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', 120, 0, e.response.headers['ratelimit-reset'] ] })
        this.calls.bot.remaining = 0
        this.calls.bot.refresh = e.response.headers['ratelimit-reset']
      }
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { data: {}, timestamp: _.now(), call: 'getUsernameFromTwitch', api: 'helix', endpoint: url, code: e.stack, remaining: this.calls.bot.remaining })
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

    const token = await global.oauth.settings.bot.accessToken
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
      global.commons.processAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', request.headers['ratelimit-limit'], request.headers['ratelimit-remaining'], request.headers['ratelimit-reset'] ] })

      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'getIdFromTwitch', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining })

      return request.data.data[0].id
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        global.commons.processAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', 120, 0, e.response.headers['ratelimit-reset'] ] })
        this.calls.bot.remaining = 0
        this.calls.bot.refresh = e.response.headers['ratelimit-reset']
      }
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { data: {}, timestamp: _.now(), call: 'getIdFromTwitch', api: 'helix', endpoint: url, code: e.stack, remaining: this.calls.bot.remaining })
    }
    return null
  }

  async getChannelChattersUnofficialAPI (opts) {
    if (cluster.isWorker) throw new Error('API can run only on master')
    clearTimeout(this.timeouts['getChannelChattersUnofficialAPI'])

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

    const url = `https://tmi.twitch.tv/group/user/${global.commons.getBroadcaster().toLowerCase()}/chatters`
    const needToWait = _.isNil(global.widgets)
    if (needToWait) {
      this.timeouts['getChannelChattersUnofficialAPI'] = setTimeout(() => this.getChannelChattersUnofficialAPI(opts), 1000)
      return
    }

    let timeout = 60000
    var request
    try {
      request = await axios.get(url)
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'getChannelChattersUnofficialAPI', api: 'unofficial', endpoint: url, code: request.status })
      opts.saveToWidget = true
    } catch (e) {
      timeout = e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT' ? 10000 : timeout
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getChannelChattersUnofficialAPI', api: 'unofficial', endpoint: url, code: e.stack })
      this.timeouts['getChannelChattersUnofficialAPI'] = setTimeout(() => this.getChannelChattersUnofficialAPI(opts), timeout)
      return
    }

    const chatters = _.flatMap(request.data.chatters)

    let bulkInsert = []
    let bulkParted = []
    let allOnlineUsers = (await global.db.engine.find('users.online')).map((o) => o.username)
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

    this.timeouts['getChannelChattersUnofficialAPI'] = setTimeout(() => this.getChannelChattersUnofficialAPI(opts), timeout)
  }

  async getChannelSubscribersOldAPI () {
    if (cluster.isWorker) throw new Error('API can run only on master')
    clearTimeout(this.timeouts['getChannelSubscribersOldAPI'])

    const cid = global.oauth.channelId
    const url = `https://api.twitch.tv/kraken/channels/${cid}/subscriptions?limit=100`

    const token = await global.oauth.settings.broadcaster.accessToken
    const needToWait = _.isNil(cid) || cid === '' || _.isNil(global.overlays) || token === ''
    if (needToWait) {
      this.timeouts['getChannelSubscribersOldAPI'] = setTimeout(() => this.getChannelSubscribersOldAPI(), 1000)
      return
    }

    var request
    let timeout = 30000
    try {
      request = await axios.get(url, {
        headers: {
          'Accept': 'application/vnd.twitchtv.v5+json',
          'Authorization': 'OAuth ' + token
        }
      })
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'getChannelSubscribersOldAPI', api: 'kraken', endpoint: url, code: request.status })

      this.retries.getChannelSubscribersOldAPI = 0 // reset retry

      await global.db.engine.update('api.current', { key: 'subscribers' }, { value: request.data._total - 1 })

      const subscribers = _.map(request.data.subscriptions, 'user')

      // set subscribers
      for (let subscriber of subscribers) {
        if (subscriber.name === global.commons.getBroadcaster || subscriber.name === global.oauth.settings.bot.username) continue
        await global.db.engine.update('users', { id: subscriber._id }, { username: subscriber.name, is: { subscriber: true } })
      }
    } catch (e) {
      const isChannelPartnerOrAffiliate =
        !(e.message !== '422 Unprocessable Entity' ||
         (e.response.data.status === 400 && e.response.data.message === `${global.commons.getBroadcaster} does not have a subscription program`))
      if (!isChannelPartnerOrAffiliate) {
        if (this.retries.getChannelSubscribersOldAPI >= 15) {
          timeout = 0
          global.log.warning('Broadcaster is not affiliate/partner, will not check subs')
          global.db.engine.update('api.current', { key: 'subscribers' }, { value: 0 })
          // caster is not affiliate or partner, don't do calls again
        } else {
          timeout = 10000
        }
      } else if (e.message === '403 Forbidden') {
        timeout = 0
        global.log.warning('Broadcaster have not correct oauth, will not check subs')
        global.db.engine.update('api.current', { key: 'subscribers' }, { value: 0 })
      } else {
        timeout = e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT' ? 10000 : timeout
        global.log.error(`${url} - ${e.message}`)
        if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getChannelSubscribersOldAPI', api: 'kraken', endpoint: url, code: e.stack })
      }
    }
    if (timeout !== 0) {
      this.timeouts['getChannelSubscribersOldAPI'] = setTimeout(() => this.getChannelSubscribersOldAPI(), timeout)
    }
  }

  async getChannelDataOldAPI (opts) {
    if (cluster.isWorker) throw new Error('API can run only on master')
    clearTimeout(this.timeouts['getChannelDataOldAPI'])

    const cid = global.oauth.channelId
    const url = `https://api.twitch.tv/kraken/channels/${cid}`

    const token = await global.oauth.settings.bot.accessToken
    const needToWait = _.isNil(cid) || cid === '' || _.isNil(global.overlays) || token === ''
    if (needToWait) {
      this.timeouts['getChannelDataOldAPI'] = setTimeout(() => this.getChannelDataOldAPI(opts), 1000)
      return
    }

    var request
    let timeout = 60000
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
            return
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
      timeout = e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT' ? 10000 : timeout
      global.log.error(`${url} - ${e.message}`)
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getChannelDataOldAPI', api: 'kraken', endpoint: url, code: e.stack })
    }
    this.timeouts['getChannelDataOldAPI'] = setTimeout(() => this.getChannelDataOldAPI({ forceUpdate: false }), timeout)
  }

  async getChannelHosts () {
    if (cluster.isWorker) throw new Error('API can run only on master')
    clearTimeout(this.timeouts['getChannelHosts'])

    const cid = global.oauth.channelId

    if (_.isNil(cid) || cid === '') {
      this.timeouts['getChannelHosts'] = setTimeout(() => this.getChannelHosts(), 1000)
      return
    }

    var request
    const url = `http://tmi.twitch.tv/hosts?include_logins=1&target=${cid}`
    let timeout = 30000
    try {
      request = await axios.get(url)
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'getChannelHosts', api: 'tmi', endpoint: url, code: request.status })

      await global.db.engine.update('api.current', { key: 'hosts' }, { value: request.data.hosts.length })

      // save hosts list
      for (let host of _.map(request.data.hosts, 'host_login')) {
        await global.db.engine.update('cache.hosts', { username: host }, { username: host })
      }
    } catch (e) {
      timeout = e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT' ? 10000 : timeout
      global.log.error(`${url} - ${e.message}`)
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getChannelHosts', api: 'tmi', endpoint: url, code: e.stack })
    }
    this.timeouts['getChannelHosts'] = setTimeout(() => this.getChannelHosts(), timeout)
  }

  async updateChannelViews () {
    if (cluster.isWorker) throw new Error('API can run only on master')
    clearTimeout(this.timeouts['updateChannelViews'])
    const cid = global.oauth.channelId
    const url = `https://api.twitch.tv/helix/users/?id=${cid}`

    const token = await global.oauth.settings.bot.accessToken
    const needToWait = _.isNil(cid) || cid === '' || _.isNil(global.overlays) || token === ''
    const notEnoughAPICalls = this.calls.bot.remaining <= 30 && this.calls.bot.refresh > _.now() / 1000
    if (needToWait || notEnoughAPICalls) {
      this.timeouts['updateChannelViews'] = setTimeout(() => this.updateChannelViews(), 1000)
      return
    }

    var request
    let timeout = 60000 * 2
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
      global.commons.processAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', request.headers['ratelimit-limit'], request.headers['ratelimit-remaining'], request.headers['ratelimit-reset'] ] })

      if (request.data.data.length > 0) await global.db.engine.update('api.current', { key: 'views' }, { value: request.data.data[0].view_count })
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        global.commons.processAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', 120, 0, e.response.headers['ratelimit-reset'] ] })
        this.calls.bot.remaining = 0
        this.calls.bot.refresh = e.response.headers['ratelimit-reset']
      }

      timeout = e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT' ? 10000 : timeout
      global.log.error(`${url} - ${e.message}`)
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'updateChannelViews', api: 'helix', endpoint: url, code: e.stack, remaining: this.calls.bot.remaining })
    }
    this.timeouts['updateChannelViews'] = setTimeout(() => this.updateChannelViews(), timeout)
  }

  async getLatest100Followers (quiet) {
    if (cluster.isWorker) throw new Error('API can run only on master')
    clearTimeout(this.timeouts['getLatest100Followers'])

    const cid = global.oauth.channelId
    const url = `https://api.twitch.tv/helix/users/follows?to_id=${cid}&first=100`

    const token = await global.oauth.settings.bot.accessToken
    const needToWait = _.isNil(cid) || cid === '' || _.isNil(global.overlays) || token === ''
    const notEnoughAPICalls = this.calls.bot.remaining <= 30 && this.calls.bot.refresh > _.now() / 1000
    if (needToWait || notEnoughAPICalls) {
      this.timeouts['getLatest100Followers'] = setTimeout(() => this.getLatest100Followers(), 1000)
      return
    }

    var request
    let timeout = 30000
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
      global.commons.processAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', request.headers['ratelimit-limit'], request.headers['ratelimit-remaining'], request.headers['ratelimit-reset'] ] })

      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'getLatest100Followers', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining })

      if (request.status === 200 && !_.isNil(request.data.data)) {
        // check if user id is in db, not in db load username from API
        for (let f of request.data.data) {
          let user = await global.users.getById(f.from_id)
          if (!_.get(user, 'is.follower', false)) {
            if (new Date().getTime() - moment(_.get(user, 'time.follow', 0)).format('X') * 1000 < 60000 * 60 && !global.webhooks.existsInCache('follow', user.id)) {
              global.webhooks.addIdToCache('follow', user.id)

              global.overlays.eventlist.add({
                type: 'follow',
                username: user.username
              })
              if (!quiet && !await global.commons.isBot(user.username)) {
                global.log.follow(user.username)
                global.events.fire('follow', { username: user.username })
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
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        global.commons.processAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', 120, 0, e.response.headers['ratelimit-reset'] ] })
        this.calls.bot.remaining = 0
        this.calls.bot.refresh = e.response.headers['ratelimit-reset']
      }

      timeout = e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT' ? 10000 : timeout
      global.log.error(`${url} - ${e.message}`)
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getLatest100Followers', api: 'helix', endpoint: url, code: e.stack, remaining: this.calls.bot.remaining })
    }
    this.timeouts['getLatest100Followers'] = setTimeout(() => this.getLatest100Followers(timeout === 1000), timeout)
  }

  async getGameFromId (id) {
    if (cluster.isWorker) throw new Error('API can run only on master')
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
      global.commons.processAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', request.headers['ratelimit-limit'], request.headers['ratelimit-remaining'], request.headers['ratelimit-reset'] ] })

      if (cluster.isMaster) if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'getGameFromId', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining })

      // add id->game to cache
      const name = request.data.data[0].name
      await global.db.engine.insert('core.api.games', { id, name })
      return name
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        global.commons.processAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', 120, 0, e.response.headers['ratelimit-reset'] ] })
        this.calls.bot.remaining = 0
        this.calls.bot.refresh = e.response.headers['ratelimit-reset']
      }

      const game = await global.db.engine.findOne('api.current', { key: 'game' })
      global.log.warning(`Couldn't find name of game for gid ${id} - fallback to ${game.value}`)
      global.log.error(`API: ${url} - ${e.stack}`)
      if (cluster.isMaster) if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getGameFromId', api: 'helix', endpoint: url, code: e.stack, remaining: this.calls.bot.remaining })
      return game.value
    }
  }

  async getCurrentStreamData (opts) {
    if (cluster.isWorker) throw new Error('API can run only on master')
    clearTimeout(this.timeouts['getCurrentStreamData'])

    const cid = global.oauth.channelId
    const url = `https://api.twitch.tv/helix/streams?user_id=${cid}`

    const token = await global.oauth.settings.bot.accessToken
    const needToWait = _.isNil(cid) || cid === '' || _.isNil(global.overlays) || token === ''
    const notEnoughAPICalls = this.calls.bot.remaining <= 30 && this.calls.bot.refresh > _.now() / 1000
    if (needToWait || notEnoughAPICalls) {
      this.timeouts['getCurrentStreamData'] = setTimeout(() => this.getCurrentStreamData(opts), 1000)
      return
    }

    var request
    let timeout = 60000
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
      global.commons.processAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', request.headers['ratelimit-limit'], request.headers['ratelimit-remaining'], request.headers['ratelimit-reset'] ] })

      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'getCurrentStreamData', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining })

      let justStarted = false
      global.log.debug('API: ' + JSON.stringify(request.data))
      if (request.status === 200 && !_.isNil(request.data.data[0])) {
        // correct status and we've got a data - stream online
        let stream = request.data.data[0]

        if (!moment.preciseDiff(moment(stream.started_at), moment((await global.cache.when()).online), true).firstDateWasLater) await global.cache.when({ online: stream.started_at })
        if (!await global.cache.isOnline() || this.streamType !== stream.type) {
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
              this.timeouts['getCurrentStreamData'] = setTimeout(() => this.getCurrentStreamData(opts), 10000)
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
        } else {
          // stream is really offline
          this.curRetries = 0
          await global.cache.isOnline(false)

          let when = await global.cache.when()
          if (_.isNil(when.offline)) {
            if (!_.isNil(when.online)) global.log.stop('')
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
          await global.db.engine.remove('cache.raids', {}) // we dont want to have cached raids on stream start

          this.streamId = null
        }
      }
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        global.commons.processAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', 120, 0, e.response.headers['ratelimit-reset'] ] })
        this.calls.bot.remaining = 0
        this.calls.bot.refresh = e.response.headers['ratelimit-reset']
      }

      timeout = e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT' ? 10000 : timeout
      global.log.error(`${url} - ${e.message}`)
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getCurrentStreamData', api: 'helix', endpoint: url, code: e.stack, remaining: this.calls.bot.remaining })
    }
    this.timeouts['getCurrentStreamData'] = setTimeout(() => this.getCurrentStreamData(opts), timeout)
  }

  async saveStreamData (stream) {
    if (cluster.isWorker) throw new Error('API can run only on master')
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
    if (cluster.isWorker) throw new Error('API can run only on master')
    clearTimeout(this.timeouts['setTitleAndGame'])

    args = _.defaults(args, { title: null }, { game: null })
    const cid = global.oauth.channelId
    const url = `https://api.twitch.tv/kraken/channels/${cid}`

    const token = await global.oauth.settings.bot.accessToken
    const needToWait = _.isNil(cid) || cid === '' || _.isNil(global.overlays) || token === ''
    if (needToWait) {
      this.timeouts['setTitleAndGame'] = setTimeout(() => this.setTitleAndGame(sender, args), 1000)
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
      global.log.error(`API: ${url} - ${e.stack}`)
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'setTitleAndGame', api: 'kraken', endpoint: url, code: e.stack })
      return
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
    }
  }

  async sendGameFromTwitch (self, socket, game) {
    if (cluster.isWorker) throw new Error('API can run only on master')
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
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'sendGameFromTwitch', api: 'kraken', endpoint: url, code: e.stack })
      return
    }

    if (_.isNull(request.data.games)) {
      socket.emit('sendGameFromTwitch', false)
    } else {
      socket.emit('sendGameFromTwitch', _.map(request.data.games, 'name'))
    }
  }

  async checkClips () {
    if (cluster.isWorker) throw new Error('API can run only on master')
    clearTimeout(this.timeouts['checkClips'])

    const token = await global.oauth.settings.bot.accessToken
    if (token === '') return

    let notCheckedClips = (await global.db.engine.find('api.clips', { isChecked: false }))

    // remove clips which failed
    for (let clip of _.filter(notCheckedClips, (o) => new Date(o.shouldBeCheckedAt).getTime() < new Date().getTime())) {
      await global.db.engine.remove('api.clips', { _id: String(clip._id) })
    }
    notCheckedClips = _.filter(notCheckedClips, (o) => new Date(o.shouldBeCheckedAt).getTime() >= new Date().getTime())
    const url = `https://api.twitch.tv/helix/clips?id=${notCheckedClips.map((o) => o.clipId).join(',')}`

    if (notCheckedClips.length === 0) { // nothing to do
      this.timeouts['checkClips'] = setTimeout(() => this.checkClips(), 1000)
      return
    }

    const notEnoughAPICalls = this.calls.bot.remaining <= 30 && this.calls.bot.refresh > _.now() / 1000
    if (notEnoughAPICalls) {
      this.timeouts['checkClips'] = setTimeout(() => this.checkClips(), 1000)
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
      global.commons.processAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', request.headers['ratelimit-limit'], request.headers['ratelimit-remaining'], request.headers['ratelimit-reset'] ] })

      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'checkClips', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining })

      for (let clip of request.data.data) {
        // clip found in twitch api
        await global.db.engine.update('api.clips', { clipId: clip.id }, { isChecked: true })
      }
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        global.commons.processAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', 120, 0, e.response.headers['ratelimit-reset'] ] })
        this.calls.bot.remaining = 0
        this.calls.bot.refresh = e.response.headers['ratelimit-reset']
      }

      global.log.error(`API: ${url} - ${e.stack}`)
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'checkClips', api: 'helix', endpoint: url, code: e.stack })
    }
    this.timeouts['checkClips'] = setTimeout(() => this.checkClips(), 1000)
  }

  async createClip (opts) {
    if (cluster.isWorker) throw new Error('API can run only on master')
    clearTimeout(this.timeouts['createClip'])

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
      this.timeouts['createClip'] = setTimeout(() => this.createClip(opts), 1000)
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
      global.commons.processAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', request.headers['ratelimit-limit'], request.headers['ratelimit-remaining'], request.headers['ratelimit-reset'] ] })

      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'createClip', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining })
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        global.commons.processAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', 120, 0, e.response.headers['ratelimit-reset'] ] })
        this.calls.bot.remaining = 0
        this.calls.bot.refresh = e.response.headers['ratelimit-reset']
      }

      global.log.error(`API: ${url} - ${e.stack}`)
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'createClip', api: 'helix', endpoint: url, code: e.stack })
      return
    }
    const clipId = request.data.data[0].id
    const timestamp = new Date()
    await global.db.engine.insert('api.clips', { clipId: clipId, isChecked: false, shouldBeCheckedAt: new Date(timestamp.getTime() + 20 * 1000) })
    return (await isClipChecked(clipId)) ? clipId : null
  }

  async fetchAccountAge (username, id) {
    if (cluster.isWorker) throw new Error('API can run only on master')
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
        if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'fetchAccountAge', api: 'kraken', endpoint: url, code: e.stack })
      }
      return
    }
    await global.db.engine.update('users', { id }, { username: username, time: { created_at: request.data.created_at } })
  }

  async isFollower (username) {
    this.rate_limit_follower_check.add(username)
  }

  async isFollowerUpdate (user) {
    if (cluster.isWorker) throw new Error('API can run only on master')
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
      global.commons.processAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', request.headers['ratelimit-limit'], request.headers['ratelimit-remaining'], request.headers['ratelimit-reset'] ] })

      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'isFollowerUpdate', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining })
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        global.commons.processAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', 120, 0, e.response.headers['ratelimit-reset'] ] })
        this.calls.bot.remaining = 0
        this.calls.bot.refresh = e.response.headers['ratelimit-reset']
      }

      global.log.error(`API: ${url} - ${e.stack}`)
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'isFollowerUpdate', api: 'helix', endpoint: url, code: e.stack, remaining: this.calls.bot.remaining })
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
      global.commons.processAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', request.headers['ratelimit-limit'], request.headers['ratelimit-remaining'], request.headers['ratelimit-reset'] ] })

      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'createMarker', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining, data: request.data })
    } catch (e) {
      if (e.errno === 'ECONNRESET' || e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT') return this.createMarker()
      global.log.error(`API: Marker was not created - ${e.message}`)
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'createMarker', api: 'helix', endpoint: url, code: e.stack, remaining: this.calls.bot.remaining })
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
      global.commons.processAll({ ns: 'api', fnc: 'setRateLimit', args: [ 'bot', request.headers['ratelimit-limit'], request.headers['ratelimit-remaining'], request.headers['ratelimit-reset'] ] })

      global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'getClipById', api: 'kraken', endpoint: url, code: request.status, remaining: this.remainingAPICalls })
      // get mp4 from thumbnail
      for (let c of request.data.data) {
        c.mp4 = c.thumbnail_url.replace('-preview-480x272.jpg', '.mp4')
        c.game = await this.getGameFromId(c.game_id)
      }
      return request.data.data
    } catch (e) {
      global.log.error(`API: ${url} - ${e.stack}`)
      if (global.panel && global.panel.io) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getTopClips', api: 'helix', endpoint: url, code: e.stack })
    }
  }
}

module.exports = API

const debug = require('debug')
const _ = require('lodash')
const config = require('@config')
const axios = require('axios')
const constants = require('./constants')
const moment = require('moment')
const cluster = require('cluster')

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
const DEBUG_API_CREATE_CLIP = debug('api:createClip')
const DEBUG_API_CHECK_CLIPS = debug('api:checkClips')
const DEBUG_API_OAUTH_VALIDATION = debug('api:oauthValidation')

class API {
  constructor () {
    if (cluster.isMaster) {
      this.timeouts = {}

      this.remainingAPICalls = 30
      this.refreshAPICalls = _.now() / 1000
      this.rate_limit_follower_check = new Set()

      this.chatMessagesAtStart = global.linesParsed
      this.maxRetries = 3
      this.curRetries = 0
      this.streamType = 'live'

      this.gameOrTitleChangedManually = false

      this.retries = {
        getCurrentStreamData: 0,
        getChannelDataOldAPI: 0,
        getChannelSubscribersOldAPI: 0
      }

      this._loadCachedStatusAndGame()

      this.oauthValidation('bot')
      this.oauthValidation('broadcaster')

      this.getChannelID()
      this.getCurrentStreamData({ interval: true })
      this.getLatest100Followers(true)
      this.updateChannelViews()
      this.getChannelHosts()

      this.getChannelChattersUnofficialAPI({ saveToWidget: false })

      this.getChannelSubscribersOldAPI() // remove this after twitch add total subscribers
      this.getChannelDataOldAPI({ forceUpdate: true }) // remove this after twitch game and status for new API

      this.intervalFollowerUpdate()
      this.checkClips()
    }
  }

  async oauthValidation (type, quiet = false) {
    clearTimeout(this.timeouts[`oauthValidation-${type}`])

    let request
    let status = true
    const url = 'https://id.twitch.tv/oauth2/validate'
    let timeout = 1000 * 60 * 30 // every 30 minutes

    DEBUG_API_OAUTH_VALIDATION(`Validating ${type} oauth`)
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'OAuth ' + (type === 'bot' ? config.settings.bot_oauth.split(':')[1] : config.settings.broadcaster_oauth.split(':')[1])
        }
      })
      global.status.API = request.status === 200 ? constants.CONNECTED : constants.DISCONNECTED
      global.panel.io.emit('api.stats', { data: request.data.data, timestamp: _.now(), call: `oauthValidation-${type}`, api: 'kraken', endpoint: url, code: request.status })
    } catch (e) {
      status = false
      global.panel.io.emit('api.stats', { timestamp: _.now(), call: `oauthValidation-${type}`, api: 'kraken', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.statusText)}` })
      if (!quiet) global.log.error(`Something went wrong with your ${type} oauth - ${e.response.data.message}`)
    }

    this.timeouts[`oauthValidation-${type}`] = setTimeout(() => this.oauthValidation(type), timeout)
    return status
  }

  async intervalFollowerUpdate () {
    clearTimeout(this.timeouts['intervalFollowerUpdate'])

    for (let username of this.rate_limit_follower_check) {
      const user = await global.users.getByName(username)
      const isSkipped = user.username === config.settings.broadcaster_username || user.username === config.settings.bot_username.toLowerCase()
      const userHaveId = !_.isNil(user.id)
      if (new Date().getTime() - _.get(user, 'time.followCheck', 0) <= 1000 * 60 * 30 || isSkipped || !userHaveId) {
        this.rate_limit_follower_check.delete(user.username)
      }
    }
    if (this.rate_limit_follower_check.size > 0 && !_.isNil(global.overlays)) {
      const user = await global.users.getByName(Array.from(this.rate_limit_follower_check)[0])
      this.rate_limit_follower_check.delete(user.username)
      await this.isFollowerUpdate(user)
    }
    this.timeouts['intervalFollowerUpdate'] = setTimeout(() => this.intervalFollowerUpdate(), 500)
  }

  async _loadCachedStatusAndGame () {
    global.db.engine.update('api.current', { key: 'game' }, { value: await global.cache.gameCache() })
  }

  async getChannelID () {
    clearTimeout(this.timeouts['getChannelID'])

    var request
    const url = `https://api.twitch.tv/kraken/users?login=${config.settings.broadcaster_username}`

    DEBUG_API_CHANNELID(`GET ${url}`)
    try {
      request = await axios.get(url, {
        headers: {
          'Accept': 'application/vnd.twitchtv.v5+json',
          'Authorization': 'OAuth ' + config.settings.bot_oauth.split(':')[1],
          'Client-ID': config.settings.client_id
        }
      })
      global.panel.io.emit('api.stats', { data: request.data.data, timestamp: _.now(), call: 'getChannelID', api: 'kraken', endpoint: url, code: request.status })

      const user = request.data.users[0]
      DEBUG_API_CHANNELID(user)
      if (_.isNil(user)) {
        global.log.error('Channel ' + config.settings.broadcaster_username + ' not found!')
      } else {
        await global.cache.channelId(user._id)
        global.log.info('Broadcaster channel ID set to ' + user._id)
      }
    } catch (e) {
      let timeout = e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT' ? 1000 : 60000
      global.log.error(`${url} - ${e.message}`)
      global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getChannelID', api: 'kraken', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.statusText)}` })

      this.timeouts['getChannelID'] = setTimeout(() => this.getChannelID(), timeout)
    }
  }

  async getChannelChattersUnofficialAPI (opts) {
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

    const url = `https://tmi.twitch.tv/group/user/${config.settings.broadcaster_username.toLowerCase()}/chatters`
    const needToWait = _.isNil(global.widgets)
    DEBUG_API_GET_CHANNEL_CHATTERS_UNOFFICIAL_API(`GET ${url}\nwait: ${needToWait}`)
    if (needToWait) {
      this.timeouts['getChannelChattersUnofficialAPI'] = setTimeout(() => this.getChannelChattersUnofficialAPI(opts), 1000)
      return
    }

    let timeout = 60000
    var request
    try {
      request = await axios.get(url)
      global.panel.io.emit('api.stats', { data: request.data.data, timestamp: _.now(), call: 'getChannelChattersUnofficialAPI', api: 'unofficial', endpoint: url, code: request.status })
      opts.saveToWidget = true
    } catch (e) {
      timeout = e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT' ? 1000 : timeout
      global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getChannelChattersUnofficialAPI', api: 'unofficial', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.statusText)}` })
      this.timeouts['getChannelChattersUnofficialAPI'] = setTimeout(() => this.getChannelChattersUnofficialAPI(opts), timeout)
      return
    }

    const chatters = _.flatMap(request.data.chatters)
    DEBUG_API_GET_CHANNEL_CHATTERS_UNOFFICIAL_API(chatters)

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
      if (_.includes(ignoredUsers, chatter) || config.settings.bot_username.toLowerCase() === chatter) {
        // even if online, remove ignored user from collection
        await global.db.engine.remove('users.online', { username: chatter })
      } else if (!_.includes(allOnlineUsers, chatter)) {
        bulkInsert.push({ username: chatter })
        global.widgets.joinpart.send({ username: chatter, type: 'join' })
      }
    }
    // always remove bot from online users
    global.db.engine.remove('users.online', { username: config.settings.bot_username.toLowerCase() })

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
    clearTimeout(this.timeouts['getChannelSubscribersOldAPI'])

    const cid = await global.cache.channelId()
    const url = `https://api.twitch.tv/kraken/channels/${cid}/subscriptions?limit=100`
    if (_.isNil(_.get(config, 'settings.broadcaster_oauth', '').match(/oauth:[\w]*/))) {
      return
    }

    const needToWait = _.isNil(cid) || _.isNil(global.overlays)
    DEBUG_API_GET_CHANNEL_SUBSCRIBERS_OLD_API(`GET ${url}\nwait: ${needToWait}`)
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
          'Authorization': 'OAuth ' + config.settings.broadcaster_oauth.split(':')[1],
          'Client-ID': config.settings.client_id
        }
      })
      global.panel.io.emit('api.stats', { data: request.data.data, timestamp: _.now(), call: 'getChannelSubscribersOldAPI', api: 'kraken', endpoint: url, code: request.status })

      this.retries.getChannelSubscribersOldAPI = 0 // reset retry

      DEBUG_API_GET_CHANNEL_SUBSCRIBERS_OLD_API(`Current subscribers count: ${request.data._total}`)
      await global.db.engine.update('api.current', { key: 'subscribers' }, { value: request.data._total - 1 })

      const subscribers = _.map(request.data.subscriptions, 'user')

      // set subscribers
      for (let subscriber of subscribers) {
        if (subscriber.name === config.settings.broadcaster_username || subscriber.name === config.settings.bot_username.toLowerCase()) continue
        await global.db.engine.update('users', { id: subscriber._id }, { username: subscriber.name, is: { subscriber: true } })
      }
    } catch (e) {
      const isChannelPartnerOrAffiliate =
        !(e.message !== '422 Unprocessable Entity' ||
         (e.response.data.status === 400 && e.response.data.message === `${config.settings.broadcaster_username} does not have a subscription program`))
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
        timeout = e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT' ? 1000 : timeout
        global.log.error(`${url} - ${e.message}`)
        global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getChannelSubscribersOldAPI', api: 'kraken', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.statusText)}` })
      }
    }
    if (timeout !== 0) {
      this.timeouts['getChannelSubscribersOldAPI'] = setTimeout(() => this.getChannelSubscribersOldAPI(), timeout)
    }
  }

  async getChannelDataOldAPI (opts) {
    clearTimeout(this.timeouts['getChannelDataOldAPI'])

    const cid = await global.cache.channelId()
    const url = `https://api.twitch.tv/kraken/channels/${cid}`

    const needToWait = _.isNil(cid) || _.isNil(global.overlays)
    DEBUG_API_GET_CHANNEL_DATA_OLD_API(`GET ${url}\nwait: ${needToWait}`)
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
          'Authorization': 'OAuth ' + config.settings.bot_oauth.split(':')[1],
          'Client-ID': config.settings.client_id
        }
      })
      global.panel.io.emit('api.stats', { data: request.data.data, timestamp: _.now(), call: 'getChannelDataOldAPI', api: 'kraken', endpoint: url, code: request.status })

      if (!this.gameOrTitleChangedManually) {
        // Just polling update
        DEBUG_API_GET_CHANNEL_DATA_OLD_API(`Current game: ${request.data.game}, Current Status: ${request.data.status}`)

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
        await global.db.engine.update('api.current', { key: 'status' }, { value: request.data.status })
        await global.cache.gameCache(request.data.game)
        await global.cache.rawStatus(rawStatus)
      } else {
        this.gameOrTitleChangedManually = false
      }
    } catch (e) {
      timeout = e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT' ? 1000 : timeout
      global.log.error(`${url} - ${e.message}`)
      global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getChannelDataOldAPI', api: 'kraken', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.statusText)}` })
    }
    this.timeouts['getChannelDataOldAPI'] = setTimeout(() => this.getChannelDataOldAPI({ forceUpdate: false }), timeout)
  }

  async getChannelHosts () {
    clearTimeout(this.timeouts['getChannelHosts'])

    const d = debug('api:getChannelHosts')
    const cid = await global.cache.channelId()

    if (_.isNil(cid)) {
      this.timeouts['getChannelHosts'] = setTimeout(() => this.getChannelHosts(), 1000)
      return
    }

    var request
    const url = `http://tmi.twitch.tv/hosts?include_logins=1&target=${cid}`
    let timeout = 30000
    try {
      request = await axios.get(url)
      global.panel.io.emit('api.stats', { data: request.data.data, timestamp: _.now(), call: 'getChannelHosts', api: 'tmi', endpoint: url, code: request.status })

      d('Current host count: %s, Hosts: %s', request.data.hosts.length, _.map(request.data.hosts, 'host_login').join(', '))
      await global.db.engine.update('api.current', { key: 'hosts' }, { value: request.data.hosts.length })

      // save hosts list
      for (let host of _.map(request.data.hosts, 'host_login')) {
        await global.db.engine.update('cache.hosts', { username: host }, { username: host })
      }
    } catch (e) {
      timeout = e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT' ? 1000 : timeout
      global.log.error(`${url} - ${e.message}`)
      global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getChannelHosts', api: 'tmi', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.statusText)}` })
    }
    this.timeouts['getChannelHosts'] = setTimeout(() => this.getChannelHosts(), timeout)
  }

  async updateChannelViews () {
    clearTimeout(this.timeouts['updateChannelViews'])
    const cid = await global.cache.channelId()
    const url = `https://api.twitch.tv/helix/users/?id=${cid}`

    const needToWait = _.isNil(cid) || _.isNil(global.overlays)
    const notEnoughAPICalls = this.remainingAPICalls <= 10 && this.refreshAPICalls > _.now() / 1000
    DEBUG_API_UPDATE_CHANNEL_VIEWS(`GET ${url}\nwait: ${needToWait}\ncalls: ${this.remainingAPICalls}`)
    if (needToWait || notEnoughAPICalls) {
      if (notEnoughAPICalls) DEBUG_API_UPDATE_CHANNEL_VIEWS('Waiting for rate-limit to refresh')
      this.timeouts['updateChannelViews'] = setTimeout(() => this.updateChannelViews(), 1000)
      return
    }

    var request
    let timeout = 60000
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + config.settings.bot_oauth.split(':')[1],
          'Client-ID': config.settings.client_id
        }
      })
      global.panel.io.emit('api.stats', { data: request.data.data, timestamp: _.now(), call: 'updateChannelViews', api: 'helix', endpoint: url, code: request.status, remaining: this.remainingAPICalls })

      // save remaining api calls
      this.remainingAPICalls = request.headers['ratelimit-remaining']
      this.refreshAPICalls = request.headers['ratelimit-reset']

      DEBUG_API_UPDATE_CHANNEL_VIEWS(request.data.data)
      if (request.data.data.length > 0) await global.db.engine.update('api.current', { key: 'views' }, { value: request.data.data[0].view_count })
    } catch (e) {
      timeout = e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT' ? 1000 : timeout
      global.log.error(`${url} - ${e.message}`)
      global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'updateChannelViews', api: 'helix', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.statusText)}`, remaining: this.remainingAPICalls })
    }
    this.timeouts['updateChannelViews'] = setTimeout(() => this.updateChannelViews(), timeout)
  }

  async getLatest100Followers (quiet) {
    clearTimeout(this.timeouts['getLatest100Followers'])

    const cid = await global.cache.channelId()
    const url = `https://api.twitch.tv/helix/users/follows?to_id=${cid}&first=100`

    const needToWait = _.isNil(cid) || _.isNil(global.overlays)
    const notEnoughAPICalls = this.remainingAPICalls <= 10 && this.refreshAPICalls > _.now() / 1000
    DEBUG_API_GET_LATEST_100_FOLLOWERS(`GET ${url}\nwait: ${needToWait}\ncalls: ${this.remainingAPICalls}`)
    if (needToWait || notEnoughAPICalls) {
      if (notEnoughAPICalls) DEBUG_API_GET_LATEST_100_FOLLOWERS('Waiting for rate-limit to refresh')
      this.timeouts['getLatest100Followers'] = setTimeout(() => this.getLatest100Followers(), 1000)
      return
    }

    var request
    let timeout = 30000
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + config.settings.bot_oauth.split(':')[1],
          'Client-ID': config.settings.client_id
        }
      })
      global.panel.io.emit('api.stats', { data: request.data.data, timestamp: _.now(), call: 'getLatest100Followers', api: 'helix', endpoint: url, code: request.status, remaining: this.remainingAPICalls })

      // save remaining api calls
      this.remainingAPICalls = request.headers['ratelimit-remaining']
      this.refreshAPICalls = request.headers['ratelimit-reset']

      if (request.status === 200 && !_.isNil(request.data.data)) {
        // check if user id is in db, not in db load username from API
        let fTime = []
        let fidsToLoadFromAPI = []
        let followersUsername = []
        for (let u of request.data.data) {
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
          let usersFromApi = await axios.get(`https://api.twitch.tv/helix/users?${fids.join('&')}`, {
            headers: {
              'Authorization': 'Bearer ' + config.settings.bot_oauth.split(':')[1],
              'Client-ID': config.settings.client_id
            }
          })

          // save remaining api calls
          this.remainingAPICalls = usersFromApi.headers['ratelimit-remaining']
          this.refreshAPICalls = usersFromApi.headers['ratelimit-reset']

          global.panel.io.emit('api.stats', { data: request.data.data, timestamp: _.now(), call: 'getLatest100Followers', api: 'helix', endpoint: `https://api.twitch.tv/helix/users?${fids.join('&')}`, code: request.status, remaining: this.remainingAPICalls })
          for (let follower of usersFromApi.data.data) {
            followersUsername.push(follower.login.toLowerCase())
            DEBUG_API_GET_LATEST_100_FOLLOWERS_USERS('Saving user %s id %s', follower.login.toLowerCase(), follower.id)
            await global.db.engine.update('users', { username: follower.login.toLowerCase() }, { id: follower.id })
          }
        }

        for (let follower of followersUsername) {
          let user = await global.users.getByName(follower)
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
              const followedAt = user.lock && user.lock.followed_at ? Number(user.time.follow) : parseInt(moment(_.find(fTime, (o) => o.id === user.id).followed_at).format('x'))
              const isFollower = user.lock && user.lock.follower ? user.is.follower : true
              DEBUG_API_GET_LATEST_100_FOLLOWERS_USERS('Saving user %s\n%f', follower, { is: { follower: true }, time: { followCheck: new Date().getTime(), follow: followedAt } })
              global.db.engine.update('users', { id: user.id }, { is: { follower: isFollower }, time: { followCheck: new Date().getTime(), follow: followedAt } })
            } else {
              const followedAt = user.lock && user.lock.followed_at ? Number(user.time.follow) : parseInt(moment().format('x'))
              const isFollower = user.lock && user.lock.follower ? user.is.follower : true
              DEBUG_API_GET_LATEST_100_FOLLOWERS_USERS('Saving user %s\n%f', follower, { is: { follower: true }, time: { followCheck: new Date().getTime(), follow: followedAt } })
              global.db.engine.update('users', { id: user.id }, { is: { follower: isFollower }, time: { followCheck: new Date().getTime(), follow: followedAt } })
            }
          } catch (e) {
            global.log.error(e)
            global.log.error(e.stack)
          }
        }
      }

      DEBUG_API_GET_LATEST_100_FOLLOWERS(`Current followers count: ${request.data.total}`)
      global.db.engine.update('api.current', { key: 'followers' }, { value: request.data.total })
    } catch (e) {
      timeout = e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT' ? 1000 : timeout
      global.log.error(`${url} - ${e.message}`)
      global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getLatest100Followers', api: 'helix', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.statusText)}`, remaining: this.remainingAPICalls })
    }
    this.timeouts['getLatest100Followers'] = setTimeout(() => this.getLatest100Followers(timeout === 1000), timeout)
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
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + config.settings.bot_oauth.split(':')[1],
          'Client-ID': config.settings.client_id
        }
      })
      if (cluster.isMaster) global.panel.io.emit('api.stats', { data: request.data.data, timestamp: _.now(), call: 'getGameFromId', api: 'helix', endpoint: url, code: request.status, remaining: this.remainingAPICalls })

      // add id->game to cache
      gids[gid] = request.data.data[0].name
      d('Saving id %s -> %s to cache', gid, request.data.data[0].name)
      await global.db.engine.update('cache', { key: 'gidToGame' }, { gidToGame: gids })
      return request.data.data[0].name
    } catch (e) {
      const game = await global.db.engine.findOne('api.current', { key: 'game' })
      global.log.warning(`Couldn't find name of game for gid ${gid} - fallback to ${game.value}`)
      global.log.error(`API: ${url} - ${e.stack}`)
      if (cluster.isMaster) global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getGameFromId', api: 'helix', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.statusText)}`, remaining: this.remainingAPICalls })
      return game.value
    }
  }

  async getCurrentStreamData (opts) {
    clearTimeout(this.timeouts['getCurrentStreamData'])

    const cid = await global.cache.channelId()
    const url = `https://api.twitch.tv/helix/streams?user_id=${cid}`

    const needToWait = _.isNil(cid) || _.isNil(global.overlays)
    const notEnoughAPICalls = this.remainingAPICalls <= 10 && this.refreshAPICalls > _.now() / 1000
    DEBUG_API_GET_CURRENT_STREAM_DATA(`GET ${url}\nwait: ${needToWait}\ncalls: ${this.remainingAPICalls}`)
    if (needToWait || notEnoughAPICalls) {
      if (notEnoughAPICalls) DEBUG_API_GET_CURRENT_STREAM_DATA('Waiting for rate-limit to refresh')
      this.timeouts['getCurrentStreamData'] = setTimeout(() => this.getCurrentStreamData(opts), 1000)
      return
    }

    var request
    let timeout = 15000
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + config.settings.bot_oauth.split(':')[1],
          'Client-ID': config.settings.client_id
        }
      })
      global.panel.io.emit('api.stats', { data: request.data.data, timestamp: _.now(), call: 'getCurrentStreamData', api: 'helix', endpoint: url, code: request.status, remaining: this.remainingAPICalls })

      // save remaining api calls
      this.remainingAPICalls = request.headers['ratelimit-remaining']
      this.refreshAPICalls = request.headers['ratelimit-reset']

      DEBUG_API_GET_CURRENT_STREAM_DATA(request.data)

      let justStarted = false
      if (request.status === 200 && !_.isNil(request.data.data[0])) {
        // correct status and we've got a data - stream online
        let stream = request.data.data[0]; DEBUG_API_GET_CURRENT_STREAM_DATA(stream)

        if (!moment.preciseDiff(moment(stream.started_at), moment((await global.cache.when()).online), true).firstDateWasLater) await global.cache.when({ online: stream.started_at })
        if (!await global.cache.isOnline() || this.streamType !== stream.type) {
          this.chatMessagesAtStart = global.linesParsed

          if (!global.webhooks.enabled.streams) {
            global.log.start(
              `id: ${stream.id} | startedAt: ${stream.started_at} | title: ${stream.title} | game: ${await this.getGameFromId(stream.game_id)} | type: ${stream.type}`
            )
            global.events.fire('stream-started')
            global.events.fire('command-send-x-times', { reset: true })
            global.events.fire('keyword-send-x-times', { reset: true })
            global.events.fire('every-x-minutes-of-stream', { reset: true })
            justStarted = true
          }
        }

        this.curRetries = 0
        this.saveStreamData(stream)
        this.streamType = stream.type
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

          await global.db.engine.update('api.current', { key: 'status' }, { value: stream.title })
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
          DEBUG_API_GET_CURRENT_STREAM_DATA('Retry stream offline check, cur: %s, max: %s', this.curRetries, this.maxRetries)
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
        }
      }
    } catch (e) {
      timeout = e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT' ? 1000 : timeout
      global.log.error(`${url} - ${e.message}`)
      global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getCurrentStreamData', api: 'helix', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.statusText)}`, remaining: this.remainingAPICalls })
    }
    this.timeouts['getCurrentStreamData'] = setTimeout(() => this.getCurrentStreamData(opts), timeout)
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
    clearTimeout(this.timeouts['setTitleAndGame'])

    args = _.defaults(args, { title: null }, { game: null })
    const cid = await global.cache.channelId()
    const url = `https://api.twitch.tv/kraken/channels/${cid}`

    const needToWait = _.isNil(cid) || _.isNil(global.overlays)
    DEBUG_API_SET_TITLE_AND_GAME(`PUT ${url}\nwait: ${needToWait}`)
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
          'Authorization': 'OAuth ' + config.settings.bot_oauth.split(':')[1],
          'Client-ID': config.settings.client_id
        }
      })
      global.panel.io.emit('api.stats', { data: request.data.data, timestamp: _.now(), call: 'setTitleAndGame', api: 'kraken', endpoint: url, code: request.status })
    } catch (e) {
      global.log.error(`API: ${url} - ${e.stack}`)
      global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'setTitleAndGame', api: 'kraken', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.statusText)}` })
      return
    }
    DEBUG_API_SET_TITLE_AND_GAME(request.data)

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
      request = await axios.get(url, {
        headers: {
          'Accept': 'application/vnd.twitchtv.v5+json',
          'Authorization': 'OAuth ' + config.settings.bot_oauth.split(':')[1],
          'Client-ID': config.settings.client_id
        }
      })
      global.panel.io.emit('api.stats', { data: request.data.data, timestamp: _.now(), call: 'sendGameFromTwitch', api: 'kraken', endpoint: url, code: request.status })
    } catch (e) {
      global.log.error(`API: ${url} - ${e.stack}`)
      global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'sendGameFromTwitch', api: 'kraken', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.statusText)}` })
      return
    }
    d(request.data.games)

    if (_.isNull(request.data.games)) {
      socket.emit('sendGameFromTwitch', false)
    } else {
      socket.emit('sendGameFromTwitch', _.map(request.data.games, 'name'))
    }
  }

  async checkClips () {
    clearTimeout(this.timeouts['checkClips'])

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

    const notEnoughAPICalls = this.remainingAPICalls <= 10 && this.refreshAPICalls > _.now() / 1000
    if (notEnoughAPICalls) {
      DEBUG_API_CHECK_CLIPS('Waiting for rate-limit to refresh')
      this.timeouts['checkClips'] = setTimeout(() => this.checkClips(), 1000)
      return
    }

    var request
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + config.settings.bot_oauth.split(':')[1],
          'Client-ID': config.settings.client_id
        }
      })
      global.panel.io.emit('api.stats', { data: request.data.data, timestamp: _.now(), call: 'checkClips', api: 'helix', endpoint: url, code: request.status, remaining: global.twitch.remainingAPICalls })

      for (let clip of request.data.data) {
        // clip found in twitch api
        DEBUG_API_CHECK_CLIPS(`Clip ${clip.id} checked and validated`)
        await global.db.engine.update('api.clips', { clipId: clip.id }, { isChecked: true })
      }
    } catch (e) {
      global.log.error(`API: ${url} - ${e.stack}`)
      global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'checkClips', api: 'helix', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.statusText)}` })
    }
    this.timeouts['checkClips'] = setTimeout(() => this.checkClips(), 1000)
  }

  async createClip (opts) {
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

    const cid = await global.cache.channelId()
    const url = `https://api.twitch.tv/helix/clips?broadcaster_id=${cid}`

    const needToWait = _.isNil(cid) || _.isNil(global.overlays)
    const notEnoughAPICalls = this.remainingAPICalls <= 10 && this.refreshAPICalls > _.now() / 1000
    DEBUG_API_CREATE_CLIP(`GET ${url}\nwait: ${needToWait}\ncalls: ${this.remainingAPICalls}`)
    if (needToWait || notEnoughAPICalls) {
      if (notEnoughAPICalls) DEBUG_API_CREATE_CLIP('Waiting for rate-limit to refresh')
      this.timeouts['createClip'] = setTimeout(() => this.createClip(opts), 1000)
      return
    }

    var request
    try {
      request = await axios({
        method: 'post',
        url,
        headers: {
          'Authorization': 'Bearer ' + config.settings.bot_oauth.split(':')[1],
          'Client-ID': config.settings.client_id
        }
      })
      global.panel.io.emit('api.stats', { data: request.data.data, timestamp: _.now(), call: 'createClip', api: 'helix', endpoint: url, code: request.status, remaining: global.twitch.remainingAPICalls })
    } catch (e) {
      global.log.error(`API: ${url} - ${e.stack}`)
      global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'createClip', api: 'helix', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.statusText)}` })
      return
    }
    const clipId = request.data.data[0].id
    const timestamp = new Date()
    await global.db.engine.insert('api.clips', { clipId: clipId, isChecked: false, shouldBeCheckedAt: new Date(timestamp.getTime() + 20 * 1000) })
    return (await isClipChecked(clipId)) ? clipId : null
  }

  async fetchAccountAge (username, id) {
    const d = debug('twitch:fetchAccountAge')
    const url = `https://api.twitch.tv/kraken/users/${id}`

    var request
    try {
      request = await axios.get(url, {
        headers: {
          'Accept': 'application/vnd.twitchtv.v5+json',
          'Authorization': 'OAuth ' + config.settings.bot_oauth.split(':')[1],
          'Client-ID': config.settings.client_id
        }
      })
      global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'fetchAccountAge', api: 'kraken', endpoint: url, code: request.status })
    } catch (e) {
      if (e.response.data.status !== 422) {
        global.log.error(`API: ${url} - ${e.stack}`)
        global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'fetchAccountAge', api: 'kraken', endpoint: url, code: `${e.response.data.status} ${_.get(e, 'body.message', e.statusText)}` })
      }
      return
    }
    d(request.data)
    await global.db.engine.update('users', { username: username }, { time: { created_at: request.data.created_at } })
  }

  async isFollower (username) {
    this.rate_limit_follower_check.add(username)
  }

  async isFollowerUpdate (user) {
    clearTimeout(this.timeouts['isFollowerUpdate'])

    const cid = await global.cache.channelId()
    const url = `https://api.twitch.tv/helix/users/follows?from_id=${user.id}&to_id=${cid}`

    const needToWait = _.isNil(cid) || _.isNil(global.overlays)
    const notEnoughAPICalls = this.remainingAPICalls <= 10 && this.refreshAPICalls > _.now() / 1000
    DEBUG_API_IS_FOLLOWER_UPDATE(`GET ${url}\nwait: ${needToWait}\ncalls: ${this.remainingAPICalls}`)
    if (needToWait || notEnoughAPICalls) {
      if (notEnoughAPICalls) DEBUG_API_IS_FOLLOWER_UPDATE('Waiting for rate-limit to refresh')
      this.timeouts['isFollowerUpdate'] = setTimeout(() => this.isFollowerUpdate(user), 1000)
      return
    }

    var request
    try {
      DEBUG_API_IS_FOLLOWER_UPDATE('IsFollowerUpdate check for user %s', user.username)
      request = await axios.get(url, {
        headers: {
          'Accept': 'application/vnd.twitchtv.v5+json',
          'Authorization': 'OAuth ' + config.settings.bot_oauth.split(':')[1],
          'Client-ID': config.settings.client_id
        }
      })
      global.panel.io.emit('api.stats', { data: request.data.data, timestamp: _.now(), call: 'isFollowerUpdate', api: 'helix', endpoint: url, code: request.status, remaining: global.twitch.remainingAPICalls })
      DEBUG_API_IS_FOLLOWER_UPDATE('Request done: %j', request.data)
    } catch (e) {
      global.log.error(`API: ${url} - ${e.stack}`)
      global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'isFollowerUpdate', api: 'helix', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.statusText)}`, remaining: global.twitch.remainingAPICalls })
      return
    }

    global.api.remainingAPICalls = request.headers['ratelimit-remaining']
    global.api.refreshAPICalls = request.headers['ratelimit-reset']

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
}

module.exports = API

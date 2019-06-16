const _ = require('lodash')
const axios = require('axios')
const config = require('@config')
const util = require('util');
const { isBot } = require('./commons');

const __DEBUG__ = {
  STREAM: (process.env.DEBUG && process.env.DEBUG.includes('webhooks.stream'))
}

class Webhooks {
  constructor () {
    this.timeouts = {}

    this.enabled = {
      follows: false,
      streams: false
    }
    this.cache = []

    this.unsubscribe('follows').then(() => this.subscribe('follows'))
    this.unsubscribe('streams').then(() => this.subscribe('streams'))

    this.clearCache()
  }

  addIdToCache (type, id) {
    this.cache.push({
      id: id,
      type: type,
      timestamp: _.now()
    })
  }

  clearCache () {
    clearTimeout(this.timeouts['clearCache'])
    this.cache = _.filter(this.cache, (o) => o.timestamp >= _.now() - 600000)
    setTimeout(() => this.clearCache, 600000)
  }

  existsInCache (type, id) {
    return !_.isEmpty(_.find(this.cache, (o) => o.type === type && o.id === id))
  }

  async unsubscribe (type) {
    clearTimeout(this.timeouts[`unsubscribe-${type}`])

    const cid = global.oauth.channelId
    const clientId = await global.oauth.clientId
    if (cid === '' || clientId === '') {
      this.timeouts[`unsubscribe-${type}`] = setTimeout(() => this.subscribe(type), 1000)
      return
    }

    // get proper domain
    let domains = config.panel.domain.split(',').map((o) => o.trim()).filter((o) => o !== 'localhost')
    if (domains.length === 0) return
    let domain = domains[0]

    const mode = 'unsubscribe'
    const callback = `http://${domain}/webhooks/hub`

    switch (type) {
      case 'follows':
        await axios({
          method: 'post',
          url: 'https://api.twitch.tv/helix/webhooks/hub',
          headers: {
            'Client-ID': clientId,
            'Content-Type': 'application/json'
          },
          data: {
            'hub.callback': `${callback}/${type}`,
            'hub.mode': mode,
            'hub.topic': `https://api.twitch.tv/helix/users/follows?first=1&to_id=${cid}`
          }
        })
        break
      case 'streams':
        await axios({
          method: 'post',
          url: 'https://api.twitch.tv/helix/webhooks/hub',
          headers: {
            'Client-ID': clientId,
            'Content-Type': 'application/json'
          },
          data: {
            'hub.callback': `${callback}/${type}`,
            'hub.mode': mode,
            'hub.topic': `https://api.twitch.tv/helix/streams?user_id=${cid}`
          }
        })
        break
    }
  }

  async subscribe (type, quiet) {
    clearTimeout(this.timeouts[`subscribe-${type}`])

    const cid = global.oauth.channelId
    const clientId = await global.oauth.clientId
    if (cid === '' || clientId === '') {
      this.timeouts[`subscribe-${type}`] = setTimeout(() => this.subscribe(type), 1000)
      return
    }

    // get proper domain
    let domains = config.panel.domain.split(',').map((o) => o.trim()).filter((o) => o !== 'localhost')
    if (domains.length === 0) return global.log.warning(`No suitable domain found to use with ${type} webhook ... localhost is not suitable`)
    let domain = domains[0]

    const leaseSeconds = 864000
    const mode = 'subscribe'
    const callback = `http://${domain}/webhooks/hub`

    var res
    switch (type) {
      case 'follows':
        res = await axios({
          method: 'post',
          url: 'https://api.twitch.tv/helix/webhooks/hub',
          headers: {
            'Client-ID': clientId,
            'Content-Type': 'application/json'
          },
          data: {
            'hub.callback': `${callback}/${type}`,
            'hub.mode': mode,
            'hub.topic': `https://api.twitch.tv/helix/users/follows?first=1&to_id=${cid}`,
            'hub.lease_seconds': leaseSeconds
          }
        })
        if (res.status === 202 && res.statusText === 'Accepted') global.log.info('WEBHOOK: follows waiting for challenge')
        else global.log.error('WEBHOOK: follows NOT subscribed')
        break
      case 'streams':
        res = await axios({
          method: 'post',
          url: 'https://api.twitch.tv/helix/webhooks/hub',
          headers: {
            'Client-ID': clientId,
            'Content-Type': 'application/json'
          },
          data: {
            'hub.callback': `${callback}/${type}`,
            'hub.mode': mode,
            'hub.topic': `https://api.twitch.tv/helix/streams?user_id=${cid}`,
            'hub.lease_seconds': leaseSeconds
          }
        })
        if (res.status === 202 && res.statusText === 'Accepted') global.log.info('WEBHOOK: streams waiting for challenge')
        else global.log.error('WEBHOOK: streams NOT subscribed')
        break
      default:
        return // don't resubcribe if subscription is not correct
    }

    // resubscribe after while
    this.timeouts[`subscribe-${type}`] = setTimeout(() => this.subscribe(type), leaseSeconds * 1000)
  }

  async event (aEvent, res) {
    // somehow stream doesn't have a topic
    if (_.get(aEvent, 'topic', null) === `https://api.twitch.tv/helix/users/follows?first=1&to_id=${global.oauth.channelId}`) this.follower(aEvent) // follow
    else if (_.get(!_.isNil(aEvent.data[0]) ? aEvent.data[0] : {}, 'type', null) === 'live') this.stream(aEvent) // streams

    res.sendStatus(200)
  }

  async challenge (req, res) {
    const cid = global.oauth.channelId
    // set webhooks enabled
    switch (req.query['hub.topic']) {
      case `https://api.twitch.tv/helix/users/follows?first=1&to_id=${cid}`:
        global.log.info('WEBHOOK: follows subscribed')
        this.enabled.follows = true
        break
      case `https://api.twitch.tv/helix/streams?user_id=${cid}`:
        global.log.info('WEBHOOK: streams subscribed')
        this.enabled.streams = true
        break
    }
    res.send(req.query['hub.challenge'])
  }

  /*
  {
   "data":
      {
         "from_id":"1336",
         "from_name":"ebi",
         "to_id":"1337",
         "to_name":"oliver0823nagy",
         "followed_at": "2017-08-22T22:55:24Z"
      }
  }
  */
  async follower (aEvent) {
    try {
      const cid = global.oauth.channelId
      const data = aEvent.data
      if (_.isEmpty(cid)) setTimeout(() => this.follower(aEvent), 10) // wait until channelId is set
      if (parseInt(data.to_id, 10) !== parseInt(cid, 10)) return

      if (typeof data.from_name === 'undefined') throw TypeError('Username is undefined')

      // is in webhooks cache
      if (this.existsInCache('follow', data.from_id)) return

      // add to cache
      this.addIdToCache('follow', data.from_id)

      const user = await global.users.getById(data.from_id)

      data.from_name = String(data.from_name).toLowerCase()
      user.username = data.from_name
      global.db.engine.update('users', { id: data.from_id }, { username: data.from_name })

      if (!_.get(user, 'is.follower', false) && (_.get(user, 'time.follow', 0) === 0 || _.now() - _.get(user, 'time.follow', 0) > 60000 * 60)) {
        if (!(await isBot(data.from_name))) {
          global.overlays.eventlist.add({
            type: 'follow',
            username: data.from_name
          })
          global.log.follow(data.from_name)
          global.events.fire('follow', { username: data.from_name, webhooks: true })

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
              if (Array.isArray(system.on.follow)) {
                for (const fnc of system.on.follow) {
                  system[fnc]({
                    username: data.from_name,
                    userId: data.from_id,
                  });
                }
              }
            }
          }
        }
      }

      if (!_.get(user, 'is.follower', false)) {
        global.db.engine.update('users', { id: data.from_id }, { username: data.from_name, time: { followCheck: new Date().getTime() } })
      } else {
        const followedAt = user.lock && user.lock.followed_at ? Number(user.time.follow) : parseInt(_.now(), 10)
        const isFollower = user.lock && user.lock.follower ? user.is.follower : true
        global.db.engine.update('users', { id: data.from_id }, { username: data.from_name, is: { follower: isFollower }, time: { followCheck: new Date().getTime(), follow: followedAt } })
      }
    } catch (e) {
      global.log.error(e.stack)
      global.log.error(util.inspect(aEvent))
    }
  }

  /*
    Example aEvent payload
    {
      "data":
        [{
          "id":"0123456789",
          "user_id":"5678",
          "game_id":"21779",
          "community_ids":[],
          "type":"live",
          "title":"Best Stream Ever",
          "viewer_count":417,
          "started_at":"2017-12-01T10:09:45Z",
          "language":"en",
          "thumbnail_url":"https://link/to/thumbnail.jpg"
        }]
    }
  */
  async stream (aEvent) {
    const cid = global.oauth.channelId
    if (cid === '') setTimeout(() => this.stream(aEvent), 1000) // wait until channelId is set

    // stream is online
    if (aEvent.data.length > 0) {
      let stream = aEvent.data[0]

      if (parseInt(stream.user_id, 10) !== parseInt(cid, 10) || Number(stream.id) === Number(global.api.streamId)) return

      // Always keep this updated
      global.api.streamStartedAt = stream.started_atx
      global.api.streamId = stream.id
      global.api.streamType = stream.type

      await global.db.engine.update('api.current', { key: 'title' }, { value: stream.title })
      await global.db.engine.update('api.current', { key: 'game' }, { value: await global.api.getGameFromId(stream.game_id) })

      if (!(await global.cache.isOnline()) || global.twitch.streamType !== stream.type) {
        if (__DEBUG__.STREAM) {
          global.log.debug('WEBHOOKS: ' + JSON.stringify(aEvent))
        }
        global.log.start(
          `id: ${stream.id} | startedAt: ${stream.started_at} | title: ${stream.title} | game: ${await global.api.getGameFromId(stream.game_id)} | type: ${stream.type} | channel ID: ${cid}`
        )
        global.cache.when({ online: stream.started_at })
        global.api.chatMessagesAtStart = global.linesParsed

        global.events.fire('stream-started')
        global.events.fire('command-send-x-times', { reset: true })
        global.events.fire('keyword-send-x-times', { reset: true })
        global.events.fire('every-x-minutes-of-stream', { reset: true })
      }

      global.api.curRetries = 0
      global.api.saveStreamData(stream)
      global.api.streamType = stream.type
      await global.cache.isOnline(true)
    } else {
      // stream is offline - add curRetry + 1 and call getCurrentStreamData to do retries
      global.api.curRetries = global.api.curRetries + 1
      global.api.getCurrentStreamData(({ interval: false }))
    }
  }
}

module.exports = Webhooks

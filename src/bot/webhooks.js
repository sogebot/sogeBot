const _ = require('lodash')
const axios = require('axios')
const config = require('@config')
const debug = require('debug')('webhooks')

const Timeout = require('./timeout')

class Webhooks {
  constructor () {
    this.timeouts = {}

    this.enabled = {
      follows: false,
      streams: false
    }
    this.cache = []

    this.subscribe('follows')
    this.subscribe('streams')

    this.clearCache()
  }

  addIdToCache (type, id) {
    debug(`Adding to ${type} cache - ${id}`)
    this.cache.push({
      id: id,
      type: type,
      timestamp: _.now()
    })
  }

  clearCache () {
    debug('Clearing cache')
    this.cache = _.filter(this.cache, (o) => o.timestamp >= _.now() - 600000)
    new Timeout().recursive({ uid: 'clearCache', this: this, fnc: this.clearCache, wait: 600000 })
  }

  existsInCache (type, id) {
    debug('Checking if id:%s exists on topic %s - %s', id, type, !_.isEmpty(_.find(this.cache, (o) => o.type === type && o.id === id)))
    return !_.isEmpty(_.find(this.cache, (o) => o.type === type && o.id === id))
  }

  async subscribe (type) {
    const cid = await global.cache.channelId()
    if (_.isNil(cid)) {
      new Timeout().recursive({ uid: 'subscribe', this: this, fnc: this.subscribe, args: [type], wait: 1000 })
      return
    }

    // get proper domain
    let domains = config.panel.domain.split(',').map((o) => o.trim()).filter((o) => o !== 'localhost')
    if (domains.length === 0) return global.log.warning(`No suitable domain found to use with ${type} webhook ... localhost is not suitable`)
    let domain = domains[0]

    const leaseSeconds = 864000
    const mode = 'subscribe'
    const callback = `http://${domain}/webhooks/hub`

    const request = [
      'https://api.twitch.tv/helix/webhooks/hub?',
      `hub.mode=${mode}`,
      `hub.callback=${callback}/${type}`,
      `hub.lease_seconds=${leaseSeconds}`
    ]
    debug('Subscribe request: %s', request.join('$'))

    var res
    switch (type) {
      case 'follows':
        request.push(`hub.topic=https://api.twitch.tv/helix/users/follows?to_id=${cid}`)
        res = await axios({
          method: 'post',
          url: request.join('&'),
          headers: {
            'Client-ID': config.settings.client_id
          }
        })
        debug('Subscribe response: %o', res)
        if (res.status === 202 && res.statusText === 'Accepted') global.log.info('WEBHOOK: follows waiting for challenge')
        else global.log.error('WEBHOOK: follows NOT subscribed')
        break
      case 'streams':
        request.push(`hub.topic=https://api.twitch.tv/helix/streams?user_id=${cid}`)
        res = await axios({
          method: 'post',
          url: request.join('&'),
          headers: {
            'Client-ID': config.settings.client_id
          }
        })
        debug('Subscribe response: %o', res)
        if (res.status === 202 && res.statusText === 'Accepted') global.log.info('WEBHOOK: streams waiting for challenge')
        else global.log.error('WEBHOOK: streams NOT subscribed')
        break
      default:
        return // don't resubcribe if subscription is not correct
    }

    // resubscribe after while
    new Timeout().recursive({ uid: 'subscribe', this: this, fnc: this.subscribe, args: [type], wait: leaseSeconds * 1000 })
  }

  async event (aEvent, res) {
    debug('Event received: %j', aEvent)
    const cid = await global.cache.channelId()

    // somehow stream doesn't have a topic
    if (_.get(aEvent, 'topic', null) === `https://api.twitch.tv/helix/users/follows?to_id=${cid}`) this.follower(aEvent) // follow
    else if (_.get(!_.isNil(aEvent.data[0]) ? aEvent.data[0] : {}, 'type', null) === 'live') this.stream(aEvent) // streams

    res.sendStatus(200)
  }

  async challenge (req, res) {
    const cid = await global.cache.channelId()
    // set webhooks enabled
    switch (req.query['hub.topic']) {
      case `https://api.twitch.tv/helix/users/follows?to_id=${cid}`:
        global.log.info('WEBHOOK: follows subscribed')
        this.enabled.follows = true
        break
      case `https://api.twitch.tv/helix/streams?user_id=${cid}`:
        global.log.info('WEBHOOK: streams subscribed')
        this.enabled.streams = true
        break
    }
    debug('Sending hub.challenge %s to topic %s', req.query['hub.challenge'], req.query['hub.topic'])
    res.send(req.query['hub.challenge'])
  }

  async follower (aEvent) {
    if (_.isEmpty(await global.cache.channelId())) setTimeout(() => this.follower(aEvent), 10) // wait until channelId is set

    debug('Follow event received: %j', aEvent)
    if (parseInt(aEvent.data.to_id, 10) !== parseInt(await global.cache.channelId(), 10)) return debug('This events doesn\'t belong to this channel')

    const fid = aEvent.data.from_id

    // is in webhooks cache
    if (this.existsInCache('follow', aEvent.data.from_id)) return

    // add to cache
    this.addIdToCache('follow', aEvent.data.from_id)

    // check if user exists in db
    let user = await global.db.engine.findOne('users', { id: fid })
    debug(user)
    if (_.isEmpty(user)) {
      debug('user not in db')
      // user doesn't exist - get username from api GET https://api.twitch.tv/helix/users?id=<user ID>
      let userGetFromApi = await axios.get(`https://api.twitch.tv/helix/users?id=${fid}`, {
        headers: {
          'Client-ID': config.settings.client_id,
          'Authorization': 'OAuth ' + config.settings.bot_oauth.split(':')[1]
        }
      })
      debug('user API data" %o', userGetFromApi.data)

      if (!global.commons.isBot(userGetFromApi.data.data[0].login)) {
        global.overlays.eventlist.add({
          type: 'follow',
          username: userGetFromApi.data.data[0].login
        })
        await global.db.engine.update('users', { username: userGetFromApi.data.data[0].login }, { id: fid, username: userGetFromApi.data.data[0].login, is: { follower: true }, time: { followCheck: new Date().getTime(), follow: _.now() } })
        global.log.follow(userGetFromApi.data.data[0].login)
        debug('Firing follow event'); global.events.fire('follow', { username: userGetFromApi.data.data[0].login }) // we can safely fire event as user doesn't exist in db
      }
    } else {
      debug('user in db')
      debug('username: %s, is follower: %s, current time: %s, user time follow: %s', user.username, _.get(user, 'is.follower', false), _.now(), _.get(user, 'time.follow', 0))
      if (!_.get(user, 'is.follower', false) && _.now() - _.get(user, 'time.follow', 0) > 60000 * 60) {
        if (!global.commons.isBot(user.username)) {
          global.overlays.eventlist.add({
            type: 'follow',
            username: user.username
          })
          global.log.follow(user.username)
          debug('Firing follow event'); global.events.fire('follow', { username: user.username, webhooks: true })
        }
      }

      if (!_.get(user, 'is.follower', false)) global.users.set(user.username, { id: fid, time: { followCheck: new Date().getTime() } })
      else global.users.set(user.username, { id: fid, is: { follower: true }, time: { followCheck: new Date().getTime(), follow: _.now() } })
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
    if (_.isEmpty(await global.cache.channelId())) setTimeout(() => this.stream(aEvent), 10) // wait until channelId is set

    debug('Stream event received: %j', aEvent)
    // stream is online
    if (aEvent.data.length > 0) {
      let stream = aEvent.data[0]

      if (parseInt(stream.user_id, 10) !== parseInt(await global.cache.channelId(), 10)) return debug('This events doesn\'t belong to this channel')

      await global.db.engine.update('api.current', { key: 'status' }, { value: stream.title })
      await global.db.engine.update('api.current', { key: 'game' }, { value: await global.api.getGameFromId(stream.game_id) })

      if (!await global.cache.isOnline() || global.twitch.streamType !== stream.type) {
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

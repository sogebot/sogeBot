const _ = require('lodash')
const snekfetch = require('snekfetch')
const moment = require('moment')
const config = require('../config.json')
const debug = require('debug')('webhooks')

class Webhooks {
  constructor () {
    this.enabled = {
      follows: false
    }

    this.subscribe('follows')
  }

  async subscribe (type) {
    if (_.isNil(global.channelId)) {
      setTimeout(() => this.subscribe(type), 1000)
      return
    }

    const leaseSeconds = 864000
    const mode = 'subscribe'
    const callback = `http://${config.panel.domain}/webhooks/hub`

    const request = [
      `https://api.twitch.tv/helix/webhooks/hub?`,
      `hub.mode=${mode}`,
      `hub.topic=https://api.twitch.tv/helix/users/follows?to_id=${global.channelId}`,
      `hub.callback=${callback}`,
      `hub.lease_seconds=${leaseSeconds}`
    ]
    debug('Subscribe request: %s', request.join('$'))

    switch (type) {
      case 'follows':
        let res = await snekfetch.post(request.join('&')).set('Client-ID', config.settings.client_id)
        debug('Subscribe response: %o', res)
        if (res.status === 202 && res.statusText === 'Accepted') global.log.info('WEBHOOK: follows waiting for challenge')
        else global.log.error('WEBHOOK: follows NOT subscribed')
        break
      default:
        return // don't resubcribe if subscription is not correct
    }

    // resubscribe after while
    setTimeout(() => this.subscribe(type), leaseSeconds * 1000)
  }

  async event (aEvent, res) {
    switch (aEvent.topic) {
      case `https://api.twitch.tv/helix/users/follows?to_id=${global.channelId}`:
        this.follower(aEvent)
        break
    }
    res.sendStatus(200)
  }

  async challenge (req, res) {
    // set webhooks enabled
    switch (req.query['hub.topic']) {
      case `https://api.twitch.tv/helix/users/follows?to_id=${global.channelId}`:
        global.log.info('WEBHOOK: follows subscribed')
        this.enabled.follows = true
        break
    }
    res.send(req.query['hub.challenge'])
  }

  async follower (aEvent) {
    const fid = aEvent.data.from_id
    debug('new follower - %s', fid)
    // check if user exists in db
    let user = await global.db.engine.findOne('users', { id: fid })
    if (_.isEmpty(user)) {
      debug('user not in db')
      // user doesn't exist - get username from api GET https://api.twitch.tv/helix/users?id=<user ID>
      let userGetFromApi = await snekfetch.get(`https://api.twitch.tv/helix/users?id=${fid}`)
        .set('Client-ID', config.settings.client_id)
        .set('Authorization', 'OAuth ' + config.settings.bot_oauth.split(':')[1])
      debug('user API data" %o', userGetFromApi.body)
      global.events.fire('follow', { username: userGetFromApi.body.data[0].login }) // we can safely fire event as user doesn't exist in db
      await global.db.engine.insert('users', { id: fid, username: userGetFromApi.body.data[0].login, is: { follower: true }, time: { followCheck: new Date().getTime(), follow: moment().format('X') * 1000 } })
    } else {
      debug('user in db')
      debug('username: %s, is follower: %s, current time: %s, user time follow: %s', user.username, user.is.follower, moment().format('X') * 1000, user.time.follow)
      if (!user.is.follower && moment().format('X') * 1000 - user.time.follow > 60000 * 60) global.events.fire('follow', { username: user.username })

      if (user.is.follower) global.users.set(user.username, {id: fid, time: { followCheck: new Date().getTime() }})
      else global.users.set(user.username, { id: fid, is: { follower: true }, time: { followCheck: new Date().getTime(), follow: moment().format('X') * 1000 } })
    }
  }
}

module.exports = Webhooks

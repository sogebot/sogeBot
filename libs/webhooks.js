const _ = require('lodash')
const req = require('snekfetch')
const config = require('../config.json')
const debug = require('debug')('webhooks')

class Webhooks {
  constructor () {
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
        let res = await req.post(request.join('&')).set('Client-ID', config.settings.client_id)
        debug('Subscribe response: %o', res)
        if (res.status === 202 && res.statusText === 'Accepted') global.log.info('WEBHOOK: follows subscribed')
        else global.log.error('WEBHOOK: follows NOT subscribed')
        break
      default:
        return // don't resubcribe if subscription is not correct
    }

    // resubscribe after while
    setTimeout(() => this.subscribe(type), leaseSeconds * 1000)
  }

  async event (aEvent) {
    console.log(aEvent)
    /*
            // TODO: move to v5 webhooks
        _.each(body.follows, async function (follower) {
          let user = await global.users.get(follower.user.name)
          if (!user.is.follower) {
            if (new Date().getTime() - moment(follower.created_at).format('X') * 1000 < 60000 * 60) global.events.fire('follow', { username: follower.user.name })
          }
          global.users.set(follower.user.name, { id: follower.user._id, is: { follower: true }, time: { followCheck: new Date().getTime(), follow: moment(follower.created_at).format('X') * 1000 } })
        })
        */
  }
}

module.exports = Webhooks

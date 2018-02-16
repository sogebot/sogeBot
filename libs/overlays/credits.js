const debug = require('debug')
const _ = require('lodash')
const config = require('../../config.json')

class Credits {
  constructor () {
    this.sockets()

    global.configuration.register('creditsFollowers', 'core.no-response-bool', 'bool', true)
    global.configuration.register('creditsHosts', 'core.no-response-bool', 'bool', true)
    global.configuration.register('creditsSubscribers', 'core.no-response-bool', 'bool', true)
    global.configuration.register('creditsSubgifts', 'core.no-response-bool', 'bool', true)
    global.configuration.register('creditsResubs', 'core.no-response-bool', 'bool', true)
    global.configuration.register('creditsCheers', 'core.no-response-bool', 'bool', true)

    global.configuration.register('creditsSpeed', 'core.no-response', 'number', 35)

    global.configuration.register('creditsLastMessage', 'core.no-response', 'string', 'Thanks for watching!')
    global.configuration.register('creditsLastSubMessage', 'core.no-response', 'string', '~ see you on the next stream ~')

    global.configuration.register('creditsStreamBy', 'core.no-response', 'string', 'Stream by')
    global.configuration.register('creditsFollowedBy', 'core.no-response', 'string', 'Followed by')
    global.configuration.register('creditsHostedBy', 'core.no-response', 'string', 'Hosted by')
    global.configuration.register('creditsCheerBy', 'core.no-response', 'string', 'Cheer <strong>$bits bits</strong> by')
    global.configuration.register('creditsSubscribedBy', 'core.no-response', 'string', 'Subscribed by')
    global.configuration.register('creditsResubscribedBy', 'core.no-response', 'string', 'Resubscribed <strong>$months months</strong> by')
    global.configuration.register('creditsSubgiftBy', 'core.no-response', 'string', '<strong>$from</strong> gifted subscribe to')

    global.configuration.register('creditsSocialFacebook', 'core.no-response', 'string', '')
    global.configuration.register('creditsSocialTwitter', 'core.no-response', 'string', '')
    global.configuration.register('creditsSocialTwitch', 'core.no-response', 'string', '')
  }

  sockets () {
    const d = debug('Credits:sockets')
    this.io = global.panel.io.of('/overlays/credits')

    this.io.on('connection', (socket) => {
      d('Socket /overlays/credits connected, registering sockets')
      socket.on('load', async (callback) => {
        let [events, when, cached] = await Promise.all([
          global.db.engine.find('widgetsEventList'),
          global.twitch.when(),
          global.twitch.cached()
        ])

        let timestamp = new Date(when.online).getTime() // 2018-02-16T18:02:50Z
        let socials = {
          facebook: global.configuration.getValue('creditsSocialFacebook'),
          twitter: global.configuration.getValue('creditsSocialTwitter'),
          twitch: global.configuration.getValue('creditsSocialTwitch')
        }
        let messages = {
          lastMessage: global.configuration.getValue('creditsLastMessage'),
          lastSubMessge: global.configuration.getValue('creditsLastSubMessage')
        }
        let speed = global.configuration.getValue('creditsSpeed')
        let custom = {
          'stream-by': global.configuration.getValue('creditsStreamBy'),
          'followed-by': global.configuration.getValue('creditsFollowedBy'),
          'hosted-by': global.configuration.getValue('creditsHostedBy'),
          'cheer-by': global.configuration.getValue('creditsCheerBy'),
          'subscribed-by': global.configuration.getValue('creditsSubscribedBy'),
          'resubscribed by': global.configuration.getValue('creditsResubscribedBy'),
          'subgift-by': global.configuration.getValue('creditsSubgiftBy')
        }
        let show = {
          followers: global.configuration.getValue('creditsFollowers'),
          hosts: global.configuration.getValue('creditsHosts'),
          subscribers: global.configuration.getValue('creditsSubscribers'),
          subgifts: global.configuration.getValue('creditsSubgifts'),
          resubs: global.configuration.getValue('creditsResubs'),
          cheers: global.configuration.getValue('creditsCheers')
        }

        callback(null,
          events.filter((o) => o.timestamp >= timestamp),
          config.settings.broadcaster_username,
          global.twitch.current.game,
          global.twitch.current.status,
          cached.hosts,
          socials,
          messages,
          custom,
          _.get(speed, '[0].value', 35),
          show
        )
      })
    })
  }
}

module.exports = new Credits()

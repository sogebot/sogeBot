const debug = require('debug')
const _ = require('lodash')
const snekfetch = require('snekfetch')
const config = require('../../config.json')

class Credits {
  constructor () {
    this.sockets()

    global.configuration.register('creditsAggregate', 'core.no-response-bool', 'bool', false)

    global.configuration.register('creditsFollowers', 'core.no-response-bool', 'bool', true)
    global.configuration.register('creditsHosts', 'core.no-response-bool', 'bool', true)
    global.configuration.register('creditsSubscribers', 'core.no-response-bool', 'bool', true)
    global.configuration.register('creditsSubgifts', 'core.no-response-bool', 'bool', true)
    global.configuration.register('creditsResubs', 'core.no-response-bool', 'bool', true)
    global.configuration.register('creditsCheers', 'core.no-response-bool', 'bool', true)
    global.configuration.register('creditsClips', 'core.no-response-bool', 'bool', true)
    global.configuration.register('creditsTips', 'core.no-response-bool', 'bool', true)

    global.configuration.register('creditsSpeed', 'core.no-response', 'number', 35)
    global.configuration.register('creditsMaxFontSize', 'core.no-response', 'number', 200)

    global.configuration.register('creditsLastMessage', 'core.no-response', 'string', 'Thanks for watching!')
    global.configuration.register('creditsLastSubMessage', 'core.no-response', 'string', '~ see you on the next stream ~')

    global.configuration.register('creditsStreamBy', 'core.no-response', 'string', 'Stream by')
    global.configuration.register('creditsFollowedBy', 'core.no-response', 'string', 'Followed by')
    global.configuration.register('creditsHostedBy', 'core.no-response', 'string', 'Hosted by')
    global.configuration.register('creditsCheerBy', 'core.no-response', 'string', 'Cheer <strong>$bits bits</strong> by')
    global.configuration.register('creditsSubscribedBy', 'core.no-response', 'string', 'Subscribed by')
    global.configuration.register('creditsResubscribedBy', 'core.no-response', 'string', 'Resubscribed <strong>$months months</strong> by')
    global.configuration.register('creditsSubgiftBy', 'core.no-response', 'string', '<strong>$from</strong> gifted subscribe to')
    global.configuration.register('creditsClippedBy', 'core.no-response', 'string', 'Clipped by')
    global.configuration.register('creditsTipsBy', 'core.no-response', 'string', 'tip <strong>$currency$amount</strong>')
    global.configuration.register('creditsTopClips', 'core.no-response', 'string', 'Top clips')

    global.configuration.register('creditsTopClipsPeriod', 'core.no-response', 'string', 'week') // possibilities day, week, month, all
    global.configuration.register('creditsTopClipsPlay', 'core.no-response-bool', 'bool', true)
    global.configuration.register('creditsTopClipsCount', 'core.no-response', 'number', 3)
  }

  sockets () {
    const d = debug('Credits:sockets')
    this.io = global.panel.io.of('/overlays/credits')

    this.io.on('connection', (socket) => {
      d('Socket /overlays/credits connected, registering sockets')
      socket.on('load', async (callback) => {
        let [events, when, hosts, socials] = await Promise.all([
          global.db.engine.find('widgetsEventList'),
          global.twitch.when(),
          global.db.engine.find('cache.hosts'),
          global.db.engine.find('overlay.credits.socials')
        ])

        if (_.isNil(when.online)) when.online = 0
        let timestamp = new Date(when.online).getTime() // 2018-02-16T18:02:50Z
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
          'subgift-by': global.configuration.getValue('creditsSubgiftBy'),
          'clipped-by': global.configuration.getValue('creditsClippedBy'),
          'top-clips': global.configuration.getValue('creditsTopClips'),
          'tip-by': global.configuration.getValue('creditsTipsBy')
        }
        let show = {
          followers: global.configuration.getValue('creditsFollowers'),
          hosts: global.configuration.getValue('creditsHosts'),
          subscribers: global.configuration.getValue('creditsSubscribers'),
          subgifts: global.configuration.getValue('creditsSubgifts'),
          resubs: global.configuration.getValue('creditsResubs'),
          cheers: global.configuration.getValue('creditsCheers'),
          tips: global.configuration.getValue('creditsTips')
        }

        let clips = { play: global.configuration.getValue('creditsTopClipsPlay'), list: [] }
        if (global.configuration.getValue('creditsClips')) {
          clips.list = await this.getTopClips()
        }

        callback(null,
          events.filter((o) => o.timestamp >= timestamp),
          config.settings.broadcaster_username,
          global.twitch.current.game,
          global.twitch.current.status,
          hosts.map((o) => o.username),
          socials,
          messages,
          custom,
          speed,
          show,
          clips,
          global.configuration.getValue('creditsMaxFontSize'),
          global.configuration.getValue('creditsAggregate')
        )
      })
      socket.on('socials.save', async (data, cb) => {
        // remove all data
        await global.db.engine.remove('overlay.credits.socials', {})

        let toAwait = []
        for (let [i, v] of Object.entries(data)) {
          toAwait.push(global.db.engine.insert('overlay.credits.socials', { order: i, type: v.type, text: v.text }))
        }
        await Promise.all(toAwait)
        cb(null, true)
      })
      socket.on('socials.load', async (cb) => {
        cb(null, await global.db.engine.find('overlay.credits.socials'))
      })
      socket.on('custom.text.save', async (data, cb) => {
        // remove all data
        await global.db.engine.remove('overlay.credits.customTexts', {})

        let toAwait = []
        for (let [i, v] of Object.entries(data)) {
          toAwait.push(global.db.engine.insert('overlay.credits.customTexts', { order: i, type: v.type, text: v.text }))
        }
        await Promise.all(toAwait)
        cb(null, true)
      })
      socket.on('custom.text.load', async (cb) => {
        cb(null, await global.db.engine.find('overlay.credits.customTexts'))
      })
    })
  }

  async getTopClips () {
    const period = _.includes(['day', 'week', 'month', 'all'], global.configuration.getValue('creditsTopClipsPeriod')) ? global.configuration.getValue('creditsTopClipsPeriod') : 'day'
    const count = global.configuration.getValue('creditsTopClipsCount')
    const channel = config.settings.broadcaster_username

    var request
    const url = `https://api.twitch.tv/kraken/clips/top?channel=${channel}&period=${period}&trending=false&limit=${count}`
    try {
      request = await snekfetch.get(url)
        .set('Accept', 'application/vnd.twitchtv.v5+json')
        .set('Client-ID', config.settings.client_id)
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'getTopClips', api: 'kraken', endpoint: url, code: request.status })
    } catch (e) {
      global.log.error(`API: ${url} - ${e.status} ${e.body.message}`)
      global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'getTopClips', api: 'kraken', endpoint: url, code: `${e.status} ${e.body.message}` })
    }
    return request.body.clips
  }
}

module.exports = new Credits()

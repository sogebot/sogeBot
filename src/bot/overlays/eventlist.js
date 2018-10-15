'use strict'

// 3rdparty libraries
const _ = require('lodash')
const crypto = require('crypto')

class EventListOverlay {
  socket = null

  constructor () {
    if (require('cluster').isMaster) {
      global.panel.addMenu({ category: 'settings', name: 'overlays', id: 'overlays' })
      this.sockets()
    }
  }

  sockets () {
    global.panel.io.of('/overlays/eventlist').on('connection', (socket) => {
      this.socket = socket
      socket.on('get', () => this.sendDataToOverlay())
    })
  }

  async sendDataToOverlay () {
    if (!this.socket) return setTimeout(() => this.sendDataToOverlay(), 1000)

    let events = await global.db.engine.find('widgetsEventList')
    events = _.uniqBy(_.orderBy(events, 'timestamp', 'desc'), o =>
      (o.username + (o.event === 'cheer' ? crypto.randomBytes(64).toString('hex') : o.event))
    )
    this.socket.emit('events', _.chunk(events, 20)[0])
  }

  async add (data) {
    if (await global.commons.isBot(data.username)) return // don't save event from a bot

    const newEvent = {
      event: data.type,
      timestamp: _.now(),
      username: data.username,
      autohost: _.isNil(data.autohost) ? undefined : data.autohost,
      message: _.isNil(data.message) ? undefined : data.message,
      amount: _.isNil(data.amount) ? undefined : data.amount,
      currency: _.isNil(data.currency) ? undefined : data.currency,
      months: _.isNil(data.months) ? undefined : data.months,
      bits: _.isNil(data.bits) ? undefined : data.bits,
      viewers: _.isNil(data.viewers) ? undefined : data.viewers,
      from: _.isNil(data.from) ? undefined : data.from,
      tier: _.isNil(data.tier) ? undefined : data.tier,
      song_title: _.isNil(data.song_title) ? undefined : data.song_title,
      song_url: _.isNil(data.song_url) ? undefined : data.song_url
    }
    await global.db.engine.insert('widgetsEventList', newEvent)
    global.overlays.eventlist.sendDataToOverlay(global.overlays.eventlist)
    global.widgets.eventlist._get(global.widgets.eventlist)
  }
}

module.exports = new EventListOverlay()

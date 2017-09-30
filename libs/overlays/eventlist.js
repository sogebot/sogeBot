'use strict'

// 3rdparty libraries
var _ = require('lodash')

function EventList () {
  global.panel.addMenu({category: 'settings', name: 'overlays', id: 'overlays'})
  global.panel.socketListening(this, 'overlay.eventlist.get', this._get)
}

EventList.prototype._get = async function (self) {
  let events = await global.db.engine.find('widgetsEventList')

  global.panel.io.emit('overlay.eventlist', _.chunk(_.orderBy(events, 'timestamp', 'desc'), 20)[0])
}

EventList.prototype.add = async function (data) {
  let events = await global.db.engine.find('widgetsEventList')

  const newEvent = {
    event: data.type,
    timestamp: _.now(),
    username: data.username,
    months: _.isNil(data.months) ? 0 : data.months,
    bits: _.isNil(data.bits) ? 0 : data.bits
  }

  const event = _.find(events, function (o) {
    return o.event === data.type && o.username === data.username && _.now() - o.timestamp < 1000 * 60 * 60 * 24 && data.event !== 'cheer'
  })

  // only save when event is not in list for 24h
  if (_.isNil(event) || data.type === 'cheer') {
    if (_.size(events) > 0 && events[0].event === data.type && events[0].username === data.username && data.type !== 'cheer') return
    await global.db.engine.insert('widgetsEventList', newEvent)
  }
  global.overlays.eventlist._get(global.overlays.eventlist)
}

module.exports = new EventList()

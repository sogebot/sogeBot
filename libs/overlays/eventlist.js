'use strict'

// 3rdparty libraries
var _ = require('lodash')

function EventList () {
  this.events = []

  global.watcher.watch(this, 'events', this._save)
  this._update(this)

  global.panel.addMenu({category: 'settings', name: 'overlays', id: 'overlays'})
  global.panel.socketListening(this, 'overlay.eventlist.get', this._get)
}

EventList.prototype._update = function (self) {
  global.botDB.findOne({ _id: 'eventlist' }, function (err, item) {
    if (err) return global.log.error(err, { fnc: 'EventList.prototype._update' })
    if (_.isNull(item)) return
    self.events = item.events
  })
}

EventList.prototype._save = function (self) {
  let events = { events: self.events }
  global.botDB.update({ _id: 'eventlist' }, { $set: events }, { upsert: true })
  self._get(self)
}

EventList.prototype._get = function (self) {
  global.panel.io.emit('overlay.eventlist', self.events)
}

EventList.prototype.add = function (data) {
  const self = global.overlays.eventlist

  const event = _.find(self.events, function (o) {
    return o.event === data.type && o.username === data.username && _.now() - o.timestamp < 1000 * 60 * 60 * 24 && data.event !== 'cheer'
  })

  // only save when event is not in list for 24h
  if (_.isNil(event) || data.type === 'cheer') {
    if (_.size(self.events) > 0 && self.events[0].event === data.type && self.events[0].username === data.username && data.type !== 'cheer') return

    self.events.push({
      event: data.type,
      timestamp: _.now(),
      username: data.username,
      months: _.isNil(data.months) ? 0 : data.months,
      bits: _.isNil(data.bits) ? 0 : data.bits
    })
  }
  // store only 20 last events
  self.events = _.chunk(_.orderBy(self.events, 'timestamp', 'desc'), 20)[0]
}

module.exports = new EventList()

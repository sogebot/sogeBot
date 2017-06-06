'use strict'

// 3rdparty libraries
var _ = require('lodash')

// bot libraries
var constants = require('../constants')

function EventList () {
  this.events = []

  global.watcher.watch(this, 'events', this._save)
  this._update(this)

  global.panel.addMenu({category: 'settings', name: 'overlays', id: 'overlays'})
  global.panel.socketListening(this, 'overlay.eventlist.get', this._get)
}

EventList.prototype._update = function (self) {
  global.botDB.findOne({ _id: 'eventlist' }, function (err, item) {
    if (err) return log.error(err, { fnc: 'EventList.prototype._update' })
    if (_.isNull(item)) return
    self.events = item.events
  })
}

EventList.prototype._save = function (self) {
  let events = { events: self.events }
  global.botDB.update({ _id: 'eventlist' }, { $set: self.events }, { upsert: true })
}

EventList.prototype._get = function (self, socket) {
  socket.emit('overlay.eventlist', self.events)
}

EventList.prototype.add = function (data) {
  const self = global.overlays.eventlist

  self.events.push({
    event: data.type,
    timestamp: _.now(),
    username: data.username,
    months: _.isNil(data.months) ? 0 : data.months
  })

  // store only 20 last events
  self.events = _.chunk(_.orderBy(self.events, 'timestamp', 'desc'), 20)[0]
}

module.exports = new EventList()

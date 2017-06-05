'use strict'

// 3rdparty libraries
var _ = require('lodash')

// bot libraries
var constants = require('../constants')

function EventList () {
  this.events = []

  global.watcher.watch(this, 'events', this._saveAndEmit)

  global.panel.addMenu({category: 'settings', name: 'overlays', id: 'overlays'})
}

EventList.prototype._saveAndEmit = function (self) {
  console.log(self.events)
}

EventList.prototype.add = function (data) {
  const self = global.overlays.eventlist

  self.events.push({
    event: data.type,
    timestamp: new Date().getTime(),
    username: data.username
  })
}

module.exports = new EventList()

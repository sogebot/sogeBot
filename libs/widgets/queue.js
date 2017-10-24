'use strict'

var _ = require('lodash')

function QueueWidget () {
  this.timestamp = 0

  if (!global.commons.isSystemEnabled('queue')) return
  global.panel.addWidget('queue', 'widget-title-queue', 'users')
  global.panel.socketListening(this, 'queue.get', this.sendQueue)
  global.panel.socketListening(this, 'queue.setLocked', this.setLocked)
  global.panel.socketListening(this, 'queue.clear', this.clear)
  global.panel.socketListening(this, 'queue.pick', this.pick)

  global.watcher.watch(this, 'timestamp', this._send)

  var self = this
  setInterval(function () { self.timestamp = global.systems.queue.timestamp }, 1000)
}

QueueWidget.prototype._send = function (self) {
  self.sendQueue(self, global.panel.io)
}

QueueWidget.prototype.sendQueue = function (self, socket) {
  let picked = []
  _.each(global.systems.queue.picked, function (username) {
    picked.push(global.users.get(username.split('@')[1]))
  })
  socket.emit('queue', {
    locked: global.systems.queue.locked,
    picked: picked,
    users: global.systems.queue.users
  })
}

QueueWidget.prototype.setLocked = function (self, socket, locked) {
  global.parser.parse({username: global.configuration.get().twitch.channel}, '!queue ' + (locked ? 'close' : 'open'))
}

QueueWidget.prototype.clear = function (self, socket) {
  global.parser.parse({username: global.configuration.get().twitch.channel}, '!queue clear')
}

QueueWidget.prototype.pick = function (self, socket, count) {
  global.parser.parse({username: global.configuration.get().twitch.channel}, '!queue pick ' + count)
}

module.exports = new QueueWidget()

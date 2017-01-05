'use strict'

function QueueWidget () {
  this.timestamp = 0

  if (global.configuration.get().systems.queue !== true) return
  global.panel.addWidget('queue', 'Queue', 'heart-empty')
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
  socket.emit('queue', {
    locked: global.systems.queue.locked,
    picked: global.systems.queue.picked,
    users: global.systems.queue.users
  })
}

QueueWidget.prototype.setLocked = function (self, socket, locked) {
  global.parser.parse({username: global.configuration.get().twitch.owner}, '!queue ' + (locked ? 'close' : 'open'))
}

QueueWidget.prototype.clear = function (self, socket) {
  global.parser.parse({username: global.configuration.get().twitch.owner}, '!queue clear')
}

QueueWidget.prototype.pick = function (self, socket, count) {
  global.parser.parse({username: global.configuration.get().twitch.owner}, '!queue pick ' + count)
}

module.exports = new QueueWidget()

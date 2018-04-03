'use strict'

const cluster = require('cluster')
const _ = require('lodash')

function QueueWidget () {
  if (!global.commons.isSystemEnabled('queue') || require('cluster').isWorker) return
  this.timestamp = 0
  global.panel.addWidget('queue', 'widget-title-queue', 'fas fa-users')
  global.panel.socketListening(this, 'queue.get', this.sendQueue)
  global.panel.socketListening(this, 'queue.setLocked', this.setLocked)
  global.panel.socketListening(this, 'queue.clear', this.clear)
  global.panel.socketListening(this, 'queue.pick', this.pick)

  setInterval(async () => {
    const timestamp = await global.systems.queue.timestamp
    if (this.timestamp !== timestamp) {
      this.timestamp = timestamp
      this._send(this)
    }
  }, 5000)
}

QueueWidget.prototype._send = function (self) {
  self.sendQueue(self, global.panel.io)
}

QueueWidget.prototype.sendQueue = async function (self, socket) {
  let picked = []
  for (let username of (await global.systems.queue.picked)) {
    let user = await global.users.get(username.replace('@', ''))
    picked.push(user)
  }
  socket.emit('queue', {
    locked: await global.systems.queue.locked,
    picked: picked,
    users: await global.systems.queue.users
  })
}

QueueWidget.prototype.setLocked = function (self, socket, locked) {
  _.sample(cluster.workers).send({ type: 'message', sender: { username: global.commons.getOwner() }, message: '!queue ' + (locked ? 'close' : 'open'), skip: true })
}

QueueWidget.prototype.clear = function (self, socket) {
  _.sample(cluster.workers).send({ type: 'message', sender: { username: global.commons.getOwner() }, message: '!queue clear', skip: true })
}

QueueWidget.prototype.pick = function (self, socket, count) {
  _.sample(cluster.workers).send({ type: 'message', sender: { username: global.commons.getOwner() }, message: '!queue pick ' + count, skip: true })
}

module.exports = new QueueWidget()

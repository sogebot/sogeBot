'use strict'

// 3rdparty libraries
var _ = require('lodash')
// bot libraries
var constants = require('../constants')
var log = global.log

/*
 * !queue               - gets an info whether queue is opened or closed
 * !queue open          - open a queue
 * !queue close         - close a queue
 * !queue pick [amount] - pick [amount] (optional) of users from queue
 * !queue join          - join a queue
 * !queue clear         - clear a queue
 */
function Queue () {
  this.timestamp = 0
  this.locked = true
  this.users = []
  this.picked = []

  if (global.commons.isSystemEnabled(this)) {
    global.parser.register(this, '!queue pick', this.pick, constants.OWNER_ONLY)
    global.parser.register(this, '!queue join', this.join, constants.VIEWERS)
    global.parser.register(this, '!queue clear', this.clear, constants.OWNER_ONLY)
    global.parser.register(this, '!queue close', this.close, constants.OWNER_ONLY)
    global.parser.register(this, '!queue open', this.open, constants.OWNER_ONLY)
    global.parser.register(this, '!queue', this.info, constants.VIEWERS)

    global.parser.registerHelper('!queue')

    global.watcher.watch(this, 'locked', this._timestamp)
    global.watcher.watch(this, 'users', this._timestamp)
  }
}
Queue.prototype._timestamp = function (self) {
  self.timestamp = new Date().getTime()
}

Queue.prototype.setLocked = function (locked) {
  this.locked = locked
}

Queue.prototype.addUser = function (username) {
  if (this.users.indexOf(username) === -1) {
    this.users.push(username)
  }
}

Queue.prototype.getUser = function () {
  return this.users.shift()
}

Queue.prototype.info = function (self, sender) {
  global.commons.sendMessage(global.translate(self.locked ? 'queue.info.closed' : 'queue.info.opened'), sender)
}

Queue.prototype.open = function (self, sender) {
  self.setLocked(false)
  global.commons.sendMessage(global.translate('queue.open'), sender)
}

Queue.prototype.close = function (self, sender) {
  self.setLocked(true)
  global.commons.sendMessage(global.translate('queue.close'), sender)
}

Queue.prototype.join = function (self, sender) {
  if (!self.locked) {
    self.addUser(sender.username)
    global.commons.sendMessage(global.translate('queue.join.opened'), sender)
  } else {
    global.commons.sendMessage(global.translate('queue.join.closed'), sender)
  }
}

Queue.prototype.clear = function (self, sender) {
  self.users = []
  self.picked = []
  global.commons.sendMessage(global.translate('queue.clear'), sender)
}

Queue.prototype.pick = function (self, sender, text) {
  var input = text.match(/^(\d+)?/)[0]
  var amount = (input === '' ? 1 : parseInt(input, 10))
  self.picked = []

  while (amount > 0 && self.users.length > 0) {
    self.picked.push('@' + self.getUser())
    amount--
  }

  var msg
  switch (self.picked.length) {
    case 0:
      msg = global.translate('queue.picked.none')
      break
    case 1:
      msg = global.translate('queue.picked.single')
      break
    default:
      msg = global.translate('queue.picked.multi')
  }

  global.commons.sendMessage(msg
    .replace('(users)', self.picked.join(', ')), sender)
}

module.exports = new Queue()

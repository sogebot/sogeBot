'use strict'

// 3rdparty libraries
var _ = require('lodash')

// bot libraries
var constants = require('../constants')
var log = global.log

/*
 * !cooldown [command] [seconds] - set cooldown for command - 0 for disable
 */

function Cooldown () {
  this._id = 'cooldowns'
  this.list = {}
  this.viewers = {}

  if (global.commons.isSystemEnabled(this)) {
    global.parser.register(this, '!cooldown', this.set, constants.OWNER_ONLY)
    global.parser.registerParser(this, '0-cooldown', this.check, constants.VIEWERS)

    global.watcher.watch(this, 'list', this._save)
    global.watcher.watch(this, 'viewers', this._save)

    this._update(this)

    this.webPanel()
  }
}

Cooldown.prototype.webPanel = function () {
  global.panel.addMenu({category: 'manage', name: 'Commands Cooldowns', id: 'cooldown'})
  global.panel.socketListening(this, 'cooldown.get', this.sSend)
  global.panel.socketListening(this, 'cooldown.set', this.sSet)
}

Cooldown.prototype.sSend = function (self, socket) {
  socket.emit('cooldown.data', self.list)
}

Cooldown.prototype.sSet = function (self, socket, data) {
  data.type = _.isUndefined(data.type) ? 'global' : data.type
  self.set(self, null, data.command + ' ' + data.type + ' ' + data.seconds)
  self.sSend(self, socket)
}

Cooldown.prototype._save = function (self) {
  var cooldown = {
    list: self.list,
    viewers: self.viewers
  }
  global.botDB.update({ _id: self._id }, { $set: cooldown }, { upsert: true })
}

Cooldown.prototype._update = function (self) {
  global.botDB.findOne({ _id: self._id }, function (err, item) {
    if (err) return log.error(err)
    if (_.isNull(item)) return

    self.list = item.list
    self.viewers = item.viewers
  })
}

Cooldown.prototype.set = function (self, sender, text) {
  var data, match

  try {
    match = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+) (global|user) (\d+)/)
    data = {'command': match[1], 'seconds': match[3], 'type': match[2]}
  } catch (e) {
    global.commons.sendMessage(global.translate('cooldown.failed.parse'), sender)
    return
  }

  delete self.list[data.command]
  if (parseInt(data.seconds, 10) !== 0) {
    self.list[data.command] = { 'miliseconds': data.seconds * 1000, 'type': data.type, 'timestamp': 0 }
    global.commons.sendMessage(global.translate('cooldown.success.set')
      .replace('(command)', data.command)
      .replace('(type)', data.type)
      .replace('(seconds)', data.seconds), sender)
  } else {
    global.commons.sendMessage(global.translate('cooldown.success.unset')
      .replace('(command)', data.command), sender)
  }
}

Cooldown.prototype.check = function (self, id, sender, text) {
  var data, match, viewer, timestamp, now

  if (global.parser.isOwner(sender)) {
    global.updateQueue(id, true)
    return
  }

  try {
    match = text.match(/^!([\u0500-\u052F\u0400-\u04FF\w]+)/)
    data = {'command': match[1], 'miliseconds': self.list[match[1]].miliseconds, 'type': self.list[match[1]].type, 'timestamp': self.list[match[1]].timestamp}
    if (_.isUndefined(data.miliseconds)) throw Error()
  } catch (e) {
    global.updateQueue(id, true)
    return
  }

  viewer = _.isUndefined(self.viewers[sender.username]) ? {} : self.viewers[sender.username]
  if (data.type === 'global') {
    timestamp = data.timestamp
  } else {
    timestamp = _.isUndefined(viewer[data.command]) ? 0 : viewer[data.command]
  }
  now = new Date().getTime()

  if (now - timestamp >= data.miliseconds) {
    if (data.type === 'global') {
      self.list[match[1]].timestamp = now
    } else {
      viewer[data.command] = now
      self.viewers[sender.username] = viewer
    }
    global.updateQueue(id, true)
  } else {
    global.commons.sendMessage(global.translate('cooldown.failed.cooldown')
      .replace('(command)', data.command)
      .replace('(seconds)', Math.ceil((data.miliseconds - now + timestamp) / 1000)), sender)
    global.updateQueue(id, false)
  }
}

module.exports = new Cooldown()

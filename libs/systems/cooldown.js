'use strict'

// 3rdparty libraries
var _ = require('lodash')

// bot libraries
var constants = require('../constants')
var log = global.log

/*
 * !cooldown [command] [seconds] [true/false] - set cooldown for command - 0 for disable, true/false set quiet mode
 * !cooldown toggle [command]                 - enable/disable specified command cooldown
 */

function Cooldown () {
  this._id = 'cooldowns'
  this.list = {}
  this.viewers = {}

  if (global.commons.isSystemEnabled(this)) {
    global.parser.register(this, '!cooldown toggle', this.toggle, constants.OWNER_ONLY)
    global.parser.register(this, '!cooldown', this.set, constants.OWNER_ONLY)
    global.parser.registerParser(this, '0-cooldown', this.check, constants.VIEWERS)

    global.watcher.watch(this, 'list', this._save)
    global.watcher.watch(this, 'viewers', this._save)

    this._update(this)

    this.webPanel()
  }
}

Cooldown.prototype.webPanel = function () {
  global.panel.addMenu({category: 'manage', name: 'commands-cooldowns', id: 'cooldown'})
  global.panel.socketListening(this, 'cooldown.get', this.sSend)
  global.panel.socketListening(this, 'cooldown.set', this.sSet)
  global.panel.socketListening(this, 'cooldown.edit', this.sEdit)
  global.panel.socketListening(this, 'cooldown.toggle', this.sToggle)
}

Cooldown.prototype.sEdit = function (self, socket, data) {
  if (data.seconds.length === 0 || parseInt(data.seconds, 10) === 0) self.sSet(self, socket, {command: data.id, seconds: 0})
  else _.find(self.list, function (o, k) { return k === data.id }).miliseconds = parseInt(data.seconds, 10) * 1000
  self.sSend(self, socket)
}

Cooldown.prototype.sSend = function (self, socket) {
  socket.emit('cooldown.data', self.list)
}

Cooldown.prototype.sSet = function (self, socket, data) {
  data.type = _.isUndefined(data.type) ? 'global' : data.type
  self.set(self, null, [data.command, data.type, data.seconds, data.quiet].join(' '))
  self.sSend(self, socket)
}

Cooldown.prototype.sToggle = function (self, socket, data) {
  console.log(data)
  self.toggle(self, null, data)
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
    if (err) return log.error(err, { fnc: 'Cooldown.prototype._update' })
    if (_.isNull(item)) return

    self.list = item.list
    self.viewers = item.viewers
  })
}

Cooldown.prototype.set = function (self, sender, text) {
  var data, match

  try {
    match = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+) (global|user) (\d+) ?(\w+)?/)
    data = {'command': match[1], 'seconds': match[3], 'type': match[2], 'quiet': match[4] !== 'false', 'enabled': true}
  } catch (e) {
    global.commons.sendMessage(global.translate('cooldown.failed.parse'), sender)
    return
  }

  delete self.list[data.command]
  if (parseInt(data.seconds, 10) !== 0) {
    self.list[data.command] = { 'miliseconds': data.seconds * 1000, 'type': data.type, 'timestamp': 0, 'quiet': data.quiet, 'enabled': data.enabled }
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
    data = {'command': match[1], 'miliseconds': self.list[match[1]].miliseconds, 'type': self.list[match[1]].type, 'timestamp': self.list[match[1]].timestamp, 'quiet': self.list[match[1]].quiet, 'enabled': self.list[match[1]].enabled}
    if (_.isUndefined(data.miliseconds) || !data.enabled) throw Error()
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
    if (!data.quiet) {
      sender['message-type'] = 'whisper' // we want to whisp cooldown message
      global.commons.sendMessage(global.translate('cooldown.failed.cooldown')
        .replace('(command)', data.command)
        .replace('(seconds)', Math.ceil((data.miliseconds - now + timestamp) / 1000)), sender)
    }
    global.updateQueue(id, false)
  }
}

Cooldown.prototype.toggle = function (self, sender, text) {
  try {
    let parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w\S]+)$/)[1]
    let cooldown = _.find(self.list, function (o, k) { return k === parsed })
    if (_.isUndefined(cooldown)) {
      global.commons.sendMessage(global.translate('cooldown.failed.toggle')
        .replace('(command)', parsed), sender)
      return
    }

    cooldown.enabled = !cooldown.enabled
    global.commons.sendMessage(global.translate(cooldown.enabled ? 'cooldown.success.enabled' : 'cooldown.success.disabled')
      .replace('(command)', parsed), sender)
  } catch (e) {
    global.commons.sendMessage(global.translate('cooldown.failed.parse'), sender)
  }
}

module.exports = new Cooldown()

'use strict'

// 3rdparty libraries
var _ = require('lodash')

// bot libraries
var constants = require('../constants')
var log = global.log

/*
 * !cooldown [keyword|!command] [global|user] [seconds] [true/false] - set cooldown for keyword or !command - 0 for disable, true/false set quiet mode
 * !cooldown toggle moderators [keyword|!command]                    - enable/disable specified keyword or !command cooldown for moderators
 * !cooldown toggle owners [keyword|!command]                        - enable/disable specified keyword or !command cooldown for owners
 * !cooldown toggle enabled [keyword|!command]                       - enable/disable specified keyword or !command cooldown
 */

function Cooldown () {
  this._id = 'cooldowns'
  this.list = {}
  this.viewers = {}

  if (global.commons.isSystemEnabled(this)) {
    global.parser.register(this, '!cooldown toggle moderators', this.toggleModerators, constants.OWNER_ONLY)
    global.parser.register(this, '!cooldown toggle owners', this.toggleOwners, constants.OWNER_ONLY)
    global.parser.register(this, '!cooldown toggle enabled', this.toggle, constants.OWNER_ONLY)
    global.parser.register(this, '!cooldown', this.set, constants.OWNER_ONLY)
    global.parser.registerParser(this, '0-cooldown', this.check, constants.VIEWERS)

    global.configuration.register('disableCooldownWhispers', 'whisper.settings.disableCooldownWhispers', 'bool', false)

    global.watcher.watch(this, 'list', this._save)
    global.watcher.watch(this, 'viewers', this._save)

    this._update(this)

    this.webPanel()
  }
}

Cooldown.prototype.webPanel = function () {
  global.panel.addMenu({category: 'manage', name: 'cooldowns', id: 'cooldown'})
  global.panel.socketListening(this, 'cooldown.get', this.sSend)
  global.panel.socketListening(this, 'cooldown.set', this.sSet)
  global.panel.socketListening(this, 'cooldown.edit', this.sEdit)
  global.panel.socketListening(this, 'cooldown.toggle', this.sToggle)
  global.panel.socketListening(this, 'cooldown.toggle.moderators', this.sToggleModerators)
  global.panel.socketListening(this, 'cooldown.toggle.owners', this.sToggleOwners)
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
  self.toggle(self, null, data)
  self.sSend(self, socket)
}

Cooldown.prototype.sToggleModerators = function (self, socket, data) {
  self.toggleModerators(self, null, data)
  self.sSend(self, socket)
}

Cooldown.prototype.sToggleOwners = function (self, socket, data) {
  self.toggleOwners(self, null, data)
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
    match = text.match(/^([!\u0500-\u052F\u0400-\u04FF\w]+) (global|user) (\d+) ?(\w+)?/)
    data = {'command': match[1], 'seconds': match[3], 'type': match[2], 'quiet': match[4] !== 'false', 'enabled': true}
  } catch (e) {
    global.commons.sendMessage(global.translate('cooldown.failed.parse'), sender)
    return
  }

  delete self.list[data.command]
  if (parseInt(data.seconds, 10) !== 0) {
    self.list[data.command] = { 'miliseconds': data.seconds * 1000, 'type': data.type, 'timestamp': 0, 'quiet': data.quiet, 'enabled': data.enabled }
    global.commons.sendMessage(global.translate('cooldown.success.set')
      .replace(/\$command/g, data.command)
      .replace(/\$type/g, data.type)
      .replace(/\$seconds/g, data.seconds), sender)
  } else {
    global.commons.sendMessage(global.translate('cooldown.success.unset')
      .replace(/\$command/g, data.command), sender)
  }
}

Cooldown.prototype.check = function (self, id, sender, text) {
  var data, cmdMatch, viewer, timestamp, now

  cmdMatch = text.match(/^(![\u0500-\u052F\u0400-\u04FF\w]+)/)
  if (!_.isNil(cmdMatch)) { // command
    if (_.isNil(self.list[cmdMatch[1]])) { // command is not on cooldown -> recheck with text only
      self.check(self, id, sender, text.replace(cmdMatch[1], ''))
      return // do nothing
    } else {
      data = [{'command': cmdMatch[1], 'miliseconds': self.list[cmdMatch[1]].miliseconds, 'type': self.list[cmdMatch[1]].type, 'timestamp': self.list[cmdMatch[1]].timestamp, 'quiet': self.list[cmdMatch[1]].quiet, 'enabled': self.list[cmdMatch[1]].enabled, 'moderator': self.list[cmdMatch[1]].moderator, 'owner': self.list[cmdMatch[1]].owner}]
    }
  } else { // text
    let keywords = _.filter(global.systems.keywords.keywords, function (o) {
      return text.search(new RegExp('^(?!\\!)(?:^|\\s).*(' + _.escapeRegExp(o.keyword) + ')(?=\\s|$|\\?|\\!|\\.|\\,)', 'gi')) >= 0
    })
    data = []
    _.each(keywords, function (o) { if (o.enabled && !_.isNil(self.list[o.keyword])) data.push({'command': o.keyword, 'miliseconds': self.list[o.keyword].miliseconds, 'type': self.list[o.keyword].type, 'timestamp': self.list[o.keyword].timestamp, 'quiet': self.list[o.keyword].quiet, 'enabled': self.list[o.keyword].enabled, 'moderator': self.list[o.keyword].moderator, 'owner': self.list[o.keyword].owner}) })
  }

  if (!_.some(data, { enabled: true })) { // parse ok if all cooldowns are disabled
    global.updateQueue(id, true)
    return
  }

  let result = false
  _.each(data, function (cooldown) {
    if ((global.parser.isOwner(sender) && !cooldown.owner) || (sender.mod && !cooldown.moderator)) {
      result = true
      return true
    }

    viewer = _.isUndefined(self.viewers[sender.username]) ? {} : self.viewers[sender.username]
    if (cooldown.type === 'global') {
      timestamp = cooldown.timestamp
    } else {
      timestamp = _.isUndefined(viewer[cooldown.command]) ? 0 : viewer[cooldown.command]
    }
    now = new Date().getTime()

    if (now - timestamp >= cooldown.miliseconds) {
      if (cooldown.type === 'global') {
        self.list[cooldown.command].timestamp = now
      } else {
        viewer[cooldown.command] = now
        self.viewers[sender.username] = viewer
      }
      result = true
      return true
    } else {
      if (!cooldown.quiet && !global.configuration.getValue('disableCooldownWhispers')) {
        sender['message-type'] = 'whisper' // we want to whisp cooldown message
        global.commons.sendMessage(global.translate('cooldown.failed.cooldown')
          .replace(/\$command/g, cooldown.command)
          .replace(/\$seconds/g, Math.ceil((cooldown.miliseconds - now + timestamp) / 1000)), sender)
      }
      result = false
      return false // disable _.each and updateQueue with false
    }
  })
  global.updateQueue(id, result)
}

Cooldown.prototype.toggle = function (self, sender, text) {
  try {
    let parsed = text.match(/^([!\u0500-\u052F\u0400-\u04FF\w\S]+)$/)[1]
    let cooldown = _.find(self.list, function (o, k) { return k === parsed })
    if (_.isUndefined(cooldown)) {
      global.commons.sendMessage(global.translate('cooldown.failed.toggle')
        .replace(/\$command/g, parsed), sender)
      return
    }

    cooldown.enabled = !cooldown.enabled
    global.commons.sendMessage(global.translate(cooldown.enabled ? 'cooldown.success.enabled' : 'cooldown.success.disabled')
      .replace(/\$command/g, parsed), sender)
  } catch (e) {
    global.commons.sendMessage(global.translate('cooldown.failed.parse'), sender)
  }
}

Cooldown.prototype.toggleModerators = function (self, sender, text) {
  try {
    let parsed = text.match(/^([!\u0500-\u052F\u0400-\u04FF\w\S]+)$/)[1]
    let cooldown = _.find(self.list, function (o, k) { return k === parsed })
    if (_.isUndefined(cooldown)) {
      global.commons.sendMessage(global.translate('cooldown.toggle.moderator.failed')
        .replace(/\$command/g, parsed), sender)
      return
    }

    cooldown.moderator = !cooldown.moderator
    global.commons.sendMessage(global.translate(cooldown.moderator ? 'cooldown.toggle.moderator.enabled' : 'cooldown.toggle.moderator.disabled')
      .replace(/\$command/g, parsed), sender)
  } catch (e) {
    global.commons.sendMessage(global.translate('cooldown.failed.parse'), sender)
  }
}

Cooldown.prototype.toggleOwners = function (self, sender, text) {
  try {
    let parsed = text.match(/^([!\u0500-\u052F\u0400-\u04FF\w\S]+)$/)[1]
    let cooldown = _.find(self.list, function (o, k) { return k === parsed })
    if (_.isUndefined(cooldown)) {
      global.commons.sendMessage(global.translate('cooldown.toggle.owner.failed')
        .replace(/\$command/g, parsed), sender)
      return
    }

    cooldown.owner = !cooldown.owner
    global.commons.sendMessage(global.translate(cooldown.owner ? 'cooldown.toggle.owner.enabled' : 'cooldown.toggle.owner.disabled')
      .replace(/\$command/g, parsed), sender)
  } catch (e) {
    global.commons.sendMessage(global.translate('cooldown.failed.parse'), sender)
  }
}

module.exports = new Cooldown()

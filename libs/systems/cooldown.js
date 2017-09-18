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
  if (global.commons.isSystemEnabled(this)) {
    global.parser.register(this, '!cooldown toggle moderators', this.toggleModerators, constants.OWNER_ONLY)
    global.parser.register(this, '!cooldown toggle owners', this.toggleOwners, constants.OWNER_ONLY)
    global.parser.register(this, '!cooldown toggle enabled', this.toggle, constants.OWNER_ONLY)
    global.parser.register(this, '!cooldown', this.set, constants.OWNER_ONLY)
    global.parser.registerParser(this, '0-cooldown', this.check, constants.VIEWERS)

    global.configuration.register('disableCooldownWhispers', 'whisper.settings.disableCooldownWhispers', 'bool', false)

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

Cooldown.prototype.sEdit = async function (self, socket, data) {
  if (data.seconds.length === 0 || parseInt(data.seconds, 10) === 0) self.sSet(self, socket, {command: data.id, seconds: 0})
  else await global.db.engine.update('cooldowns', { key: data.id }, { key: data.value })
  self.sSend(self, socket)
}

Cooldown.prototype.sSend = async function (self, socket) {
  socket.emit('cooldown.data', await global.db.engine.find('cooldowns'))
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

Cooldown.prototype.set = function (self, sender, text) {
  var data, match

  try {
    match = text.match(/^([!\u0500-\u052F\u0400-\u04FF\w]+) (global|user) (\d+) ?(\w+)?/)
    data = {'command': match[1], 'seconds': match[3], 'type': match[2], 'quiet': match[4] !== 'false', 'enabled': true}
  } catch (e) {
    global.commons.sendMessage(global.translate('cooldown.failed.parse'), sender)
    return
  }

  if (parseInt(data.seconds, 10) !== 0) {
    global.db.engine.update('cooldowns', { key: data.command }, { miliseconds: data.seconds * 1000, type: data.type, timestamp: 0, quiet: data.quiet, enabled: data.enabled })
    global.commons.sendMessage(global.translate('cooldown.success.set')
      .replace(/\$command/g, data.command)
      .replace(/\$type/g, data.type)
      .replace(/\$seconds/g, data.seconds), sender)
  } else {
    global.commons.sendMessage(global.translate('cooldown.success.unset')
      .replace(/\$command/g, data.command), sender)
  }
}

Cooldown.prototype.check = async function (self, id, sender, text) {
  var data, cmdMatch, viewer, timestamp, now

  cmdMatch = text.match(/^(![\u0500-\u052F\u0400-\u04FF\w]+)/)
  if (!_.isNil(cmdMatch)) { // command
    let cooldown = await global.db.engine.findOne('cooldowns', { key: cmdMatch[1] })
    if (_.isEmpty(cooldown)) { // command is not on cooldown -> recheck with text only
      self.check(self, id, sender, text.replace(cmdMatch[1], ''))
      return // do nothing
    }
    data = [{
      key: cooldown.key,
      miliseconds: cooldown.miliseconds,
      type: cooldown.type,
      timestamp: cooldown.timestamp,
      quiet: cooldown.quiet,
      enabled: cooldown.enabled,
      moderator: cooldown.moderator,
      owner: self.list[cmdMatch[1]].owner
    }]
  } else { // text
    let keywords = await global.db.engine.find('keywords')
    let cooldowns = await global.db.engine.find('cooldowns')
    keywords = _.filter(keywords, function (o) {
      return text.search(new RegExp('^(?!\\!)(?:^|\\s).*(' + _.escapeRegExp(o.keyword) + ')(?=\\s|$|\\?|\\!|\\.|\\,)', 'gi')) >= 0
    })
    data = []
    _.each(keywords, (keyword) => {
      let cooldown = _.find(cooldowns, (o) => o.key = keyword.keyword)
      if (keyword.enabled && !_.isEmpty(cooldown)) {
        data.push({
          key: keyword.keyword,
          miliseconds: cooldown.miliseconds,
          type: cooldown.type,
          timestamp: cooldown.timestamp,
          quiet: cooldown.quiet,
          enabled: cooldown.enabled,
          moderator: cooldown.moderator,
          owner: cooldown.owner
        })
      }
    })
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

    // TODO VIEWERS!
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

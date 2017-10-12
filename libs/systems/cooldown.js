'use strict'

// 3rdparty libraries
var _ = require('lodash')

// bot libraries
var constants = require('../constants')

const debug = require('debug')('systems:cooldown')

/*
 * !cooldown [keyword|!command] [global|user] [seconds] [true/false] - set cooldown for keyword or !command - 0 for disable, true/false set quiet mode
 * !cooldown toggle moderators [keyword|!command]                    - enable/disable specified keyword or !command cooldown for moderators
 * !cooldown toggle owners [keyword|!command]                        - enable/disable specified keyword or !command cooldown for owners
 * !cooldown toggle enabled [keyword|!command]                       - enable/disable specified keyword or !command cooldown
 */

function Cooldown () {
  if (global.commons.isSystemEnabled(this)) {
    this.viewers = {}

    global.parser.register(this, '!cooldown toggle moderators', this.toggleModerators, constants.OWNER_ONLY)
    global.parser.register(this, '!cooldown toggle owners', this.toggleOwners, constants.OWNER_ONLY)
    global.parser.register(this, '!cooldown toggle enabled', this.toggleEnabled, constants.OWNER_ONLY)
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
  if (data.seconds.length === 0 || parseInt(data.seconds, 10) === 0) self.sSet(self, socket, {key: data.id, seconds: 0})
  else await global.db.engine.update('cooldowns', { key: data.id }, { miliseconds: data.seconds * 1000 })
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
  self.toggleEnabled(self, null, data)
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

Cooldown.prototype.set = async function (self, sender, text) {
  var data, match

  try {
    match = text.match(/^([!\u0500-\u052F\u0400-\u04FF\w]+) (global|user) (\d+) ?(\w+)?/)
    data = {'command': match[1], 'seconds': match[3], 'type': match[2], 'quiet': match[4] !== 'false', 'enabled': true}
  } catch (e) {
    global.commons.sendMessage(global.translate('cooldown.failed.parse'), sender)
    return
  }

  if (parseInt(data.seconds, 10) !== 0) {
    await global.db.engine.update('cooldowns', { key: data.command, type: data.type }, { miliseconds: data.seconds * 1000, type: data.type, timestamp: 0, quiet: data.quiet, enabled: data.enabled, owner: false, moderator: false })
    global.commons.sendMessage(global.translate('cooldown.success.set')
      .replace(/\$command/g, data.command)
      .replace(/\$type/g, data.type)
      .replace(/\$seconds/g, data.seconds), sender)
  } else {
    await global.db.engine.remove('cooldowns', { key: data.command, type: data.type })
    global.commons.sendMessage(global.translate('cooldown.success.unset')
      .replace(/\$command/g, data.command), sender)
  }
}

Cooldown.prototype.check = async function (self, id, sender, text) {
  debug('check(self, %s, %j, %s)', id, sender, text)
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
      owner: cooldown.owner
    }]
  } else { // text
    let keywords = await global.db.engine.find('keywords')
    let cooldowns = await global.db.engine.find('cooldowns')

    keywords = _.filter(keywords, function (o) {
      return text.search(new RegExp('^(?!\\!)(?:^|\\s).*(' + _.escapeRegExp(o.keyword) + ')(?=\\s|$|\\?|\\!|\\.|\\,)', 'gi')) >= 0
    })

    data = []
    _.each(keywords, (keyword) => {
      let cooldown = _.find(cooldowns, (o) => o.key === keyword.keyword)
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
    debug('cooldowns disabled')
    global.updateQueue(id, true)
    return
  }

  let result = false
  let isMod = await global.parser.isMod(sender)
  _.each(data, function (cooldown) {
    if ((global.parser.isOwner(sender) && !cooldown.owner) || (isMod && !cooldown.moderator)) {
      result = true
      return true
    }

    viewer = _.isUndefined(self.viewers[sender.username]) ? {} : self.viewers[sender.username]
    if (cooldown.type === 'global') {
      timestamp = cooldown.timestamp
    } else {
      timestamp = _.isUndefined(viewer[cooldown.key]) ? 0 : viewer[cooldown.key]
    }
    now = new Date().getTime()

    if (now - timestamp >= cooldown.miliseconds) {
      if (cooldown.type === 'global') {
        global.db.engine.update('cooldowns', { key: cooldown.key, type: 'global' }, { timestamp: now, key: cooldown.key, type: 'global' })
      } else {
        viewer[cooldown.key] = now
        self.viewers[sender.username] = viewer
      }
      result = true
      return true
    } else {
      if (!cooldown.quiet && !global.configuration.getValue('disableCooldownWhispers')) {
        sender['message-type'] = 'whisper' // we want to whisp cooldown message
        global.commons.sendMessage(global.translate('cooldown.failed.cooldown')
          .replace(/\$command/g, cooldown.key)
          .replace(/\$seconds/g, Math.ceil((cooldown.miliseconds - now + timestamp) / 1000)), sender)
      }
      result = false
      return false // disable _.each and updateQueue with false
    }
  })
  debug('cooldowns result %s', result)
  global.updateQueue(id, result)
}

Cooldown.prototype.toggle = async function (self, sender, text, type) {
  const toggle = text.match(/^([!\u0500-\u052F\u0400-\u04FF\w]+) (global|user)$/)

  if (_.isNil(toggle)) {
    global.commons.sendMessage(global.translate('cooldown.failed.parse'), sender)
    return false
  }

  const cooldown = await global.db.engine.findOne('cooldowns', { key: toggle[1], type: toggle[2] })
  if (_.isEmpty(cooldown)) {
    global.commons.sendMessage(global.translate('cooldown.failed.toggle')
     .replace(/\$command/g, toggle[1]), sender)
    return false
  }

  cooldown[type] = !cooldown[type]

  await global.db.engine.update('cooldowns', { key: toggle[1], type: toggle[2] }, cooldown)

  let translation = 'cooldown.success'
  if (type !== 'enabled') translation = `cooldown.toggle.${type}`

  global.commons.sendMessage(global.translate(cooldown[type] ? `${translation}.enabled` : `${translation}.disabled`)
    .replace(/\$command/g, cooldown.key), sender)
}

Cooldown.prototype.toggleEnabled = async (self, sender, text) => self.toggle(self, sender, text, 'enabled')
Cooldown.prototype.toggleModerators = async (self, sender, text) => self.toggle(self, sender, text, 'moderator')
Cooldown.prototype.toggleOwners = async (self, sender, text) => self.toggle(self, sender, text, 'owner')

module.exports = new Cooldown()

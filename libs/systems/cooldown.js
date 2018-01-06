'use strict'

// 3rdparty libraries
const _ = require('lodash')
const XRegExp = require('xregexp')

// bot libraries
var constants = require('../constants')

const debug = require('debug')('systems:cooldown')

/*
 * !cooldown [keyword|!command] [global|user] [seconds] [true/false] - set cooldown for keyword or !command - 0 for disable, true/false set quiet mode
 * !cooldown toggle moderators [keyword|!command] [global|user]      - enable/disable specified keyword or !command cooldown for moderators
 * !cooldown toggle owners [keyword|!command] [global|user]          - enable/disable specified keyword or !command cooldown for owners
 * !cooldown toggle enabled [keyword|!command] [global|user]         - enable/disable specified keyword or !command cooldown
 */

class Cooldown {
  constructor () {
    if (global.commons.isSystemEnabled(this)) {
      this.viewers = {}

      global.parser.register(this, '!cooldown toggle moderators', this.toggleModerators, constants.OWNER_ONLY)
      global.parser.register(this, '!cooldown toggle owners', this.toggleOwners, constants.OWNER_ONLY)
      global.parser.register(this, '!cooldown toggle enabled', this.toggleEnabled, constants.OWNER_ONLY)
      global.parser.register(this, '!cooldown', this.set, constants.OWNER_ONLY)
      global.parser.registerParser(this, '0-cooldown', this.check, constants.VIEWERS)

      global.configuration.register('disableCooldownWhispers', 'whisper.settings.disableCooldownWhispers', 'bool', false)

      global.panel.addMenu({category: 'manage', name: 'cooldowns', id: 'cooldown'})
      global.panel.registerSockets({
        self: this,
        expose: ['set', 'toggleModerators', 'toggleOwners', 'toggleEnabled', 'toggleNotify', 'toggleType', 'editName', 'send'],
        finally: this.send
      })
    }
  }

  async send (self, socket) {
    socket.emit('cooldown', await global.db.engine.find('cooldowns'))
  }

  async editName (self, socket, data) {
    if (data.value.length === 0) await self.set(self, null, `${data.id} ${data.type} 0`)
    else {
      await global.db.engine.update('cooldowns', { key: data.id }, { key: data.value })
    }
  }

  async set (self, sender, text) {
    const match = XRegExp.exec(text, constants.COOLDOWN_REGEXP_SET)

    if (_.isNil(match)) {
      let message = global.commons.prepare('cooldowns.cooldown-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    if (parseInt(match.seconds, 10) === 0) {
      await global.db.engine.remove('cooldowns', { key: match.command, type: match.type })
      let message = global.commons.prepare('cooldowns.cooldown-was-unset', { type: match.type, command: match.command })
      debug(message); global.commons.sendMessage(message, sender)
      return
    }

    let cooldown = await global.db.engine.findOne('cooldowns', { key: match.command, type: match.type })
    if (_.isEmpty(cooldown)) await global.db.engine.update('cooldowns', { key: match.command, type: match.type }, { miliseconds: parseInt(match.seconds, 10) * 1000, type: match.type, timestamp: 0, quiet: _.isNil(match.quiet) ? false : match.quiet, enabled: true, owner: false, moderator: false })
    else await global.db.engine.update('cooldowns', { key: match.command, type: match.type }, { miliseconds: parseInt(match.seconds, 10) * 1000 })

    let message = global.commons.prepare('cooldowns.cooldown-was-set', { seconds: match.seconds, type: match.type, command: match.command })
    debug(message); global.commons.sendMessage(message, sender)
  }

  async check (self, id, sender, text) {
    debug('check(self, %s, %j, %s)', id, sender, text)

    var data, viewer, timestamp, now
    const match = XRegExp.exec(text, constants.COMMAND_REGEXP)
    if (!_.isNil(match)) { // command
      let cooldown = await global.db.engine.findOne('cooldowns', { key: `!${match.command}` })
      if (_.isEmpty(cooldown)) { // command is not on cooldown -> recheck with text only
        self.check(self, id, sender, text.replace(`!${match.command}`, ''))
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
      let [keywords, cooldowns] = await Promise.all([global.db.engine.find('keywords'), global.db.engine.find('cooldowns')])

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
    debug('isMod: %j', isMod)
    _.each(data, function (cooldown) {
      debug('Is for mods: %j', cooldown.moderator)
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
          let message = global.commons.prepare('cooldown-triggered', { command: cooldown.key, seconds: Math.ceil((cooldown.miliseconds - now + timestamp) / 1000) })
          debug(message); global.commons.sendMessage(message, sender)
        }
        result = false
        return false // disable _.each and updateQueue with false
      }
    })
    debug('cooldowns result %s', result)
    global.updateQueue(id, result)
  }

  async toggle (self, sender, text, type) {
    debug('toggle(%j, %j, %j, %j', self, sender, text, type)
    const match = XRegExp.exec(text, constants.COOLDOWN_REGEXP)

    if (_.isNil(match)) {
      let message = global.commons.prepare('cooldowns.cooldown-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    const cooldown = await global.db.engine.findOne('cooldowns', { key: match.command, type: match.type })
    if (_.isEmpty(cooldown)) {
      let message = global.commons.prepare('cooldowns.cooldown-not-found', { command: match.command })
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    if (type === 'type') {
      cooldown[type] = cooldown[type] === 'global' ? 'user' : 'global'
    } else cooldown[type] = !cooldown[type]

    delete cooldown._id
    await global.db.engine.update('cooldowns', { key: match.command, type: match.type }, cooldown)

    let path = ''
    let status = cooldown[type] ? 'enabled' : 'disabled'

    if (type === 'moderator') path = '-for-moderators'
    if (type === 'owner') path = '-for-owners'
    if (type === 'quiet' || type === 'type') return // those two are setable only from dashboard

    let message = global.commons.prepare(`cooldowns.cooldown-was-${status}${path}`, { command: cooldown.key })
    debug(message); global.commons.sendMessage(message, sender)
  }

  async toggleEnabled (self, sender, text) { await self.toggle(self, sender, text, 'enabled') }
  async toggleModerators (self, sender, text) { await self.toggle(self, sender, text, 'moderator') }
  async toggleOwners (self, sender, text) { await self.toggle(self, sender, text, 'owner') }
  async toggleNotify (self, sender, text) { await self.toggle(self, sender, text, 'quiet') }
  async toggleType (self, sender, text) { await self.toggle(self, sender, text, 'type') }
}

module.exports = new Cooldown()

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
      global.configuration.register('disableCooldownWhispers', 'whisper.settings.disableCooldownWhispers', 'bool', false)

      if (require('cluster').isMaster) {
        global.panel.addMenu({category: 'manage', name: 'cooldowns', id: 'cooldown'})
        global.panel.registerSockets({
          self: this,
          expose: ['set', 'toggleModerators', 'toggleOwners', 'toggleEnabled', 'toggleNotify', 'toggleType', 'editName', 'send'],
          finally: this.send
        })
      }
    }
  }

  commands () {
    return !global.commons.isSystemEnabled('cooldown')
      ? []
      : [
        {this: this, id: '!cooldown toggle moderators', command: '!cooldown toggle moderators', fnc: this.toggleModerators, permission: constants.OWNER_ONLY},
        {this: this, id: '!cooldown toggle owners', command: '!cooldown toggle owners', fnc: this.toggleOwners, permission: constants.OWNER_ONLY},
        {this: this, id: '!cooldown toggle enabled', command: '!cooldown toggle enabled', fnc: this.toggleEnabled, permission: constants.OWNER_ONLY},
        {this: this, id: '!cooldown', command: '!cooldown', fnc: this.set, permission: constants.OWNER_ONLY}
      ]
  }

  parsers () {
    return !global.commons.isSystemEnabled('cooldown')
      ? []
      : [
        {this: this, name: 'cooldown', fnc: this.check, permission: constants.VIEWERS, priority: constants.HIGH}
      ]
  }

  async send (self, socket) {
    socket.emit('cooldown', await global.db.engine.find('cooldowns'))
  }

  async editName (self, socket, data) {
    if (data.value.length === 0) await this.set({ sender: null, command: { after: `${data.id} ${data.type} 0` } })
    else {
      await global.db.engine.update('cooldowns', { key: data.id }, { key: data.value })
    }
  }

  async set (opts) {
    const match = XRegExp.exec(opts.parameters, constants.COOLDOWN_REGEXP_SET)

    if (_.isNil(match)) {
      let message = await global.commons.prepare('cooldowns.cooldown-parse-failed')
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    if (parseInt(match.seconds, 10) === 0) {
      await global.db.engine.remove('cooldowns', { key: match.command, type: match.type })
      let message = await global.commons.prepare('cooldowns.cooldown-was-unset', { type: match.type, command: match.command })
      debug(message); global.commons.sendMessage(message, opts.sender)
      return
    }

    let cooldown = await global.db.engine.findOne('cooldowns', { key: match.command, type: match.type })
    if (_.isEmpty(cooldown)) await global.db.engine.update('cooldowns', { key: match.command, type: match.type }, { miliseconds: parseInt(match.seconds, 10) * 1000, type: match.type, timestamp: 0, quiet: _.isNil(match.quiet) ? false : match.quiet, enabled: true, owner: false, moderator: false })
    else await global.db.engine.update('cooldowns', { key: match.command, type: match.type }, { miliseconds: parseInt(match.seconds, 10) * 1000 })

    let message = await global.commons.prepare('cooldowns.cooldown-was-set', { seconds: match.seconds, type: match.type, command: match.command })
    debug(message); global.commons.sendMessage(message, opts.sender)
  }

  async check (opts) {
    var data, viewer, timestamp, now
    const match = XRegExp.exec(opts.message, constants.COMMAND_REGEXP)
    if (!_.isNil(match)) { // command
      let cooldown = await global.db.engine.findOne('cooldowns', { key: `!${match.command}` })
      if (_.isEmpty(cooldown)) { // command is not on cooldown -> recheck with text only
        opts.message = opts.message.replace(`!${match.command}`, '')
        return this.check(opts)
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
        return opts.message.search(new RegExp('^(?!\\!)(?:^|\\s).*(' + _.escapeRegExp(o.keyword) + ')(?=\\s|$|\\?|\\!|\\.|\\,)', 'gi')) >= 0
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
      return true
    }

    let result = false
    let isMod = await global.commons.isMod(opts.sender)
    debug('isMod: %j', isMod)
    for (let cooldown of data) {
      debug('Is for mods: %j', cooldown.moderator)
      if ((global.commons.isOwner(opts.sender) && !cooldown.owner) || (isMod && !cooldown.moderator)) {
        result = true
        continue
      }

      viewer = await global.db.engine.findOne('cooldown.viewers', { username: opts.sender.username, key: cooldown.key })
      if (cooldown.type === 'global') {
        timestamp = cooldown.timestamp
      } else {
        timestamp = _.isNil(viewer.timestamp) ? 0 : viewer.timestamp
      }
      now = new Date().getTime()

      if (now - timestamp >= cooldown.miliseconds) {
        if (cooldown.type === 'global') {
          await global.db.engine.update('cooldowns', { key: cooldown.key, type: 'global' }, { timestamp: now, key: cooldown.key, type: 'global' })
        } else {
          await global.db.engine.update('cooldown.viewers', { username: opts.sender.username, key: cooldown.key }, { timestamp: now })
        }
        result = true
        continue
      } else {
        if (!cooldown.quiet && !(await global.configuration.getValue('disableCooldownWhispers'))) {
          opts.sender['message-type'] = 'whisper' // we want to whisp cooldown message
          let message = await global.commons.prepare('cooldowns.cooldown-triggered', { command: cooldown.key, seconds: Math.ceil((cooldown.miliseconds - now + timestamp) / 1000) })
          debug(message); global.commons.sendMessage(message, opts.sender)
        }
        result = false
        break // disable _.each and updateQueue with false
      }
    }
    debug('cooldowns result %s', result)
    return result
  }

  async toggle (opts, type) {
    const match = XRegExp.exec(opts.parameters, constants.COOLDOWN_REGEXP)

    if (_.isNil(match)) {
      let message = await global.commons.prepare('cooldowns.cooldown-parse-failed')
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    const cooldown = await global.db.engine.findOne('cooldowns', { key: match.command, type: match.type })
    if (_.isEmpty(cooldown)) {
      let message = await global.commons.prepare('cooldowns.cooldown-not-found', { command: match.command })
      debug(message); global.commons.sendMessage(message, opts.sender)
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

    let message = await global.commons.prepare(`cooldowns.cooldown-was-${status}${path}`, { command: cooldown.key })
    debug(message); global.commons.sendMessage(message, opts.sender)
  }

  async toggleEnabled (opts) { await this.toggle(opts, 'enabled') }
  async toggleModerators (opts) { await this.toggle(opts, 'moderator') }
  async toggleOwners (opts) { await this.toggle(opts, 'owner') }
  async toggleNotify (opts) { await this.toggle(opts, 'quiet') }
  async toggleType (opts) { await this.toggle(opts, 'type') }
}

module.exports = new Cooldown()

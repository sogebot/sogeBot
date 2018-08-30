/* @flow */

'use strict'

// 3rdparty libraries
const _ = require('lodash')
const XRegExp = require('xregexp')

// bot libraries
var constants = require('../constants')
const System = require('./_interface')

const debug = require('debug')('systems:cooldown')

/*
 * !cooldown [keyword|!command] [global|user] [seconds] [true/false] - set cooldown for keyword or !command - 0 for disable, true/false set quiet mode
 * !cooldown toggle moderators [keyword|!command] [global|user]      - enable/disable specified keyword or !command cooldown for moderators
 * !cooldown toggle owners [keyword|!command] [global|user]          - enable/disable specified keyword or !command cooldown for owners
 * !cooldown toggle enabled [keyword|!command] [global|user]         - enable/disable specified keyword or !command cooldown
 */

class Cooldown extends System {
  constructor () {
    const settings = {
      cooldownNotifyAsWhisper: false,
      commands: [
        { name: '!cooldown toggle moderators', permission: constants.OWNER_ONLY },
        { name: '!cooldown toggle owners', permission: constants.OWNER_ONLY },
        { name: '!cooldown toggle enabled', permission: constants.OWNER_ONLY },
        { name: '!cooldown', permission: constants.OWNER_ONLY }
      ],
      parsers: [
        { name: 'check', priority: constants.HIGH }
      ]
    }
    super({ settings })

    this.addMenu({ category: 'manage', name: 'cooldown', id: 'cooldown/list' })
  }

  sockets () {
    this.socket.on('connection', (socket) => {
      socket.on('list', async (cb) => {
        cb(null, await global.db.engine.find(this.collection.data))
      })
      socket.on('get', async (_id, cb) => {
        cb(null, await global.db.engine.findOne(this.collection.data, { _id }))
      })
      socket.on('delete', async (_id, cb) => {
        await global.db.engine.remove(this.collection.data, { _id })
        cb(null)
      })
      socket.on('update', async (items, cb) => {
        for (let item of items) {
          const _id = item._id; delete item._id
          let itemFromDb = item
          if (_.isNil(_id)) itemFromDb = await global.db.engine.insert(this.collection.data, item)
          else await global.db.engine.update(this.collection.data, { _id }, item)

          if (_.isFunction(cb)) cb(null, itemFromDb)
        }
      })
    })
  }

  async main (opts: Object) {
    const match = XRegExp.exec(opts.parameters, constants.COOLDOWN_REGEXP_SET)

    if (_.isNil(match)) {
      let message = await global.commons.prepare('cooldowns.cooldown-parse-failed')
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    if (parseInt(match.seconds, 10) === 0) {
      await global.db.engine.remove(this.collection.data, { key: match.command, type: match.type })
      let message = await global.commons.prepare('cooldowns.cooldown-was-unset', { type: match.type, command: match.command })
      debug(message); global.commons.sendMessage(message, opts.sender)
      return
    }

    let cooldown = await global.db.engine.findOne(this.collection.data, { key: match.command, type: match.type })
    if (_.isEmpty(cooldown)) await global.db.engine.update(this.collection.data, { key: match.command, type: match.type }, { miliseconds: parseInt(match.seconds, 10) * 1000, type: match.type, timestamp: 0, quiet: _.isNil(match.quiet) ? false : match.quiet, enabled: true, owner: false, moderator: false })
    else await global.db.engine.update(this.collection.data, { key: match.command, type: match.type }, { miliseconds: parseInt(match.seconds, 10) * 1000 })

    let message = await global.commons.prepare('cooldowns.cooldown-was-set', { seconds: match.seconds, type: match.type, command: match.command })
    debug(message); global.commons.sendMessage(message, opts.sender)
  }

  async check (opts: Object) {
    var data, viewer, timestamp, now
    const match = XRegExp.exec(opts.message, constants.COMMAND_REGEXP)
    if (!_.isNil(match)) { // command
      let cooldown = await global.db.engine.findOne(this.collection.data, { key: `${match.command}` })
      if (_.isEmpty(cooldown)) { // command is not on cooldown -> recheck with text only
        opts.message = opts.message.replace(`${match.command}`, '')
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
      let [keywords, cooldowns] = await Promise.all([global.db.engine.find(global.systems.keywords.collection.data), global.db.engine.find(this.collection.data)])

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

      viewer = await global.db.engine.findOne(this.collection.viewers, { username: opts.sender.username, key: cooldown.key })
      if (cooldown.type === 'global') {
        timestamp = cooldown.timestamp || 0
      } else {
        timestamp = _.isNil(viewer.timestamp) ? 0 : viewer.timestamp
      }
      now = new Date().getTime()

      if (now - timestamp >= cooldown.miliseconds) {
        if (cooldown.type === 'global') {
          await global.db.engine.update(this.collection.data, { key: cooldown.key, type: 'global' }, { timestamp: now, key: cooldown.key, type: 'global' })
        } else {
          await global.db.engine.update(this.collection.viewers, { username: opts.sender.username, key: cooldown.key }, { timestamp: now })
        }
        result = true
        continue
      } else {
        if (!cooldown.quiet && !(await this.settings['cooldownNotifyAsWhisper'])) {
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

  async toggle (opts: Object, type: string) {
    const match = XRegExp.exec(opts.parameters, constants.COOLDOWN_REGEXP)

    if (_.isNil(match)) {
      let message = await global.commons.prepare('cooldowns.cooldown-parse-failed')
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    const cooldown = await global.db.engine.findOne(this.collection.data, { key: match.command, type: match.type })
    if (_.isEmpty(cooldown)) {
      let message = await global.commons.prepare('cooldowns.cooldown-not-found', { command: match.command })
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    if (type === 'type') {
      cooldown[type] = cooldown[type] === 'global' ? 'user' : 'global'
    } else cooldown[type] = !cooldown[type]

    delete cooldown._id
    await global.db.engine.update(this.collection.data, { key: match.command, type: match.type }, cooldown)

    let path = ''
    let status = cooldown[type] ? 'enabled' : 'disabled'

    if (type === 'moderator') path = '-for-moderators'
    if (type === 'owner') path = '-for-owners'
    if (type === 'quiet' || type === 'type') return // those two are setable only from dashboard

    let message = await global.commons.prepare(`cooldowns.cooldown-was-${status}${path}`, { command: cooldown.key })
    debug(message); global.commons.sendMessage(message, opts.sender)
  }

  async toggleEnabled (opts: Object) { await this.toggle(opts, 'enabled') }
  async toggleModerators (opts: Object) { await this.toggle(opts, 'moderator') }
  async toggleOwners (opts: Object) { await this.toggle(opts, 'owner') }
  async toggleNotify (opts: Object) { await this.toggle(opts, 'quiet') }
  async toggleType (opts: Object) { await this.toggle(opts, 'type') }
}

module.exports = new Cooldown()

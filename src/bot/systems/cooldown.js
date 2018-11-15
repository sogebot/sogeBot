/* @flow */

'use strict'

// 3rdparty libraries
const _ = require('lodash')
const XRegExp = require('xregexp')

// bot libraries
var constants = require('../constants')
const System = require('./_interface')
const Expects = require('../expects.js')
const Parser = require('../parser')

/*
 * !cooldown [keyword|!command] [global|user] [seconds] [true/false] - set cooldown for keyword or !command - 0 for disable, true/false set quiet mode
 * !cooldown toggle moderators [keyword|!command] [global|user]      - enable/disable specified keyword or !command cooldown for moderators
 * !cooldown toggle owners [keyword|!command] [global|user]          - enable/disable specified keyword or !command cooldown for owners
 * !cooldown toggle subscribers [keyword|!command] [global|user]     - enable/disable specified keyword or !command cooldown for owners
 * !cooldown toggle followers [keyword|!command] [global|user]       - enable/disable specified keyword or !command cooldown for owners
 * !cooldown toggle enabled [keyword|!command] [global|user]         - enable/disable specified keyword or !command cooldown
 */

class Cooldown extends System {
  constructor () {
    const settings = {
      cooldownNotifyAsWhisper: false,
      commands: [
        { name: '!cooldown toggle moderators', permission: constants.OWNER_ONLY },
        { name: '!cooldown toggle owners', permission: constants.OWNER_ONLY },
        { name: '!cooldown toggle subscribers', permission: constants.OWNER_ONLY },
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

  async main (opts: Object) {
    const match = XRegExp.exec(opts.parameters, constants.COOLDOWN_REGEXP_SET)

    if (_.isNil(match)) {
      let message = await global.commons.prepare('cooldowns.cooldown-parse-failed')
      global.commons.sendMessage(message, opts.sender)
      return false
    }

    if (parseInt(match.seconds, 10) === 0) {
      await global.db.engine.remove(this.collection.data, { key: match.command, type: match.type })
      let message = await global.commons.prepare('cooldowns.cooldown-was-unset', { type: match.type, command: match.command })
      global.commons.sendMessage(message, opts.sender)
      return
    }

    let cooldown = await global.db.engine.findOne(this.collection.data, { key: match.command, type: match.type })
    if (_.isEmpty(cooldown)) await global.db.engine.update(this.collection.data, { key: match.command, type: match.type }, { miliseconds: parseInt(match.seconds, 10) * 1000, type: match.type, timestamp: 0, quiet: _.isNil(match.quiet) ? false : match.quiet, enabled: true, owner: false, moderator: false, subscriber: true, follower: true })
    else await global.db.engine.update(this.collection.data, { key: match.command, type: match.type }, { miliseconds: parseInt(match.seconds, 10) * 1000 })

    let message = await global.commons.prepare('cooldowns.cooldown-was-set', { seconds: match.seconds, type: match.type, command: match.command })
    global.commons.sendMessage(message, opts.sender)
  }

  async check (opts: Object) {
    var data, viewer, timestamp, now
    const [command, subcommand] = new Expects(opts.message)
      .command({ optional: true })
      .string({ optional: true })
      .toArray()

    if (!_.isNil(command)) { // command
      let key
      const parsed = await (new Parser().find(subcommand ? `${command} ${subcommand}` : command))
      if (!parsed) {
        key = subcommand ? `${command} ${subcommand}` : command
      } else key = parsed.command

      let cooldown = await global.db.engine.findOne(this.collection.data, { key })
      if (_.isEmpty(cooldown)) { // command is not on cooldown -> recheck with text only
        opts.message = opts.message.replace(key, '')
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
        subscriber: cooldown.subscriber,
        follower: cooldown.follower,
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
            subscriber: cooldown.subscriber,
            follower: cooldown.follower,
            owner: cooldown.owner
          })
        }
      })
    }
    if (!_.some(data, { enabled: true })) { // parse ok if all cooldowns are disabled
      return true
    }

    const user = await global.users.getById(opts.sender.userId)
    let result = false
    const isMod = opts.sender.isModerator
    const isSubscriber = opts.sender.isSubscriber
    const isFollower = user.is && user.is.follower ? user.is.follower : false

    for (let cooldown of data) {
      if ((global.commons.isOwner(opts.sender) && !cooldown.owner) || (isMod && !cooldown.moderator) || (isSubscriber && !cooldown.subscriber) || (isFollower && !cooldown.follower)) {
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
          global.commons.sendMessage(message, opts.sender)
        }
        result = false
        break // disable _.each and updateQueue with false
      }
    }
    return result
  }

  async toggle (opts: Object, type: string) {
    const match = XRegExp.exec(opts.parameters, constants.COOLDOWN_REGEXP)

    if (_.isNil(match)) {
      let message = await global.commons.prepare('cooldowns.cooldown-parse-failed')
      global.commons.sendMessage(message, opts.sender)
      return false
    }

    const cooldown = await global.db.engine.findOne(this.collection.data, { key: match.command, type: match.type })
    if (_.isEmpty(cooldown)) {
      let message = await global.commons.prepare('cooldowns.cooldown-not-found', { command: match.command })
      global.commons.sendMessage(message, opts.sender)
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
    if (type === 'subscriber') path = '-for-subscribers'
    if (type === 'follower') path = '-for-followers'
    if (type === 'quiet' || type === 'type') return // those two are setable only from dashboard

    let message = await global.commons.prepare(`cooldowns.cooldown-was-${status}${path}`, { command: cooldown.key })
    global.commons.sendMessage(message, opts.sender)
  }

  async toggleEnabled (opts: Object) { await this.toggle(opts, 'enabled') }
  async toggleModerators (opts: Object) { await this.toggle(opts, 'moderator') }
  async toggleOwners (opts: Object) { await this.toggle(opts, 'owner') }
  async toggleSubscribers (opts: Object) { await this.toggle(opts, 'subscriber') }
  async toggleFollowers (opts: Object) { await this.toggle(opts, 'follower') }
  async toggleNotify (opts: Object) { await this.toggle(opts, 'quiet') }
  async toggleType (opts: Object) { await this.toggle(opts, 'type') }
}

module.exports = new Cooldown()

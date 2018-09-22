'use strict'

const _ = require('lodash')

const constants = require('./constants')
const config = require('@config')

class Parser {
  constructor (opts) {
    opts = opts || {}

    this.started_at = new Date().getTime()
    this.message = opts.message || ''
    this.sender = opts.sender || null
    this.skip = opts.skip || false

    if (!_.isNil(this.sender) && opts.quiet) this.sender.quiet = opts.quiet

    this.isCommand = this.message.startsWith('!')
    this.list = this.populateList()
  }

  time () {
    return parseInt(new Date().getTime(), 10) - parseInt(this.started_at, 10)
  }

  async isModerated () {
    if (this.skip) return false

    for (let parser of await this.parsers()) {
      if (parser.priority !== constants.MODERATION) continue // skip non-moderation parsers
      const opts = {
        sender: this.sender,
        message: this.message.trim(),
        skip: this.skip
      }
      const isOk = await parser['fnc'].apply(parser.this, [opts])
      if (!isOk) {
        return true
      }
    }
    return false // no parser failed
  }

  async process () {
    for (let parser of await this.parsers()) {
      if (parser.priority === constants.MODERATION) continue // skip moderation parsers
      let [isRegular, isMod, isOwner] = await Promise.all([
        global.commons.isRegular(this.sender),
        global.commons.isMod(this.sender),
        global.commons.isOwner(this.sender)
      ])

      if (_.isNil(this.sender) || // if user is null -> we are running command through a bot
        this.skip || (parser.permission === constants.VIEWERS) ||
        (parser.permission === constants.REGULAR && (isRegular || isMod || isOwner)) ||
        (parser.permission === constants.MODS && (isMod || isOwner)) ||
        (parser.permission === constants.OWNER_ONLY && isOwner)) {
        const opts = {
          sender: this.sender,
          message: this.message.trim(),
          skip: this.skip
        }

        if (parser.fireAndForget) {
          parser['fnc'].apply(parser.this, [opts])
        } else if (!(await parser['fnc'].apply(parser.this, [opts]))) {
          // TODO: call revert on parser with revert (price can have revert)
          return false
        }
      }
    }

    if (this.isCommand) {
      this.command(this.sender, this.message.trim(), this.skip)
    }
  }

  populateList () {
    const list = [
      global.configuration,
      global.currency,
      global.events,
      global.users,
      global.permissions,
      global.twitch
    ]
    for (let system of Object.entries(global.systems)) {
      list.push(system[1])
    }
    for (let overlay of Object.entries(global.overlays)) {
      list.push(overlay[1])
    }
    for (let game of Object.entries(global.games)) {
      list.push(game[1])
    }
    for (let integration of Object.entries(global.integrations)) {
      list.push(integration[1])
    }
    return list
  }

  /**
   * Return all parsers
   * @constructor
   * @returns object or empty list
   */
  async parsers () {
    let parsers = []
    for (let item of this.list) {
      if (_.isFunction(item.parsers)) {
        let items = await item.parsers()
        if (!_.isEmpty(items)) parsers.push(items)
      }
    }
    parsers = _.orderBy(_.flatMap(parsers), 'priority', 'asc')
    return parsers
  }

  /**
   * Find first command called by message
   * @constructor
   * @param {string} message - Message from chat
   * @returns object or null if empty
   */
  async find (message) {
    for (let item of (await this.getCommandsList())) {
      let onlyParams = message.trim().toLowerCase().replace(item.command, '')
      let isStartingWith = message.trim().toLowerCase().startsWith(item.command)
      if (isStartingWith && (onlyParams.length === 0 || (onlyParams.length > 0 && onlyParams[0] === ' '))) {
        return item
      }
    }
    return null
  }

  async getCommandsList () {
    let commands = []
    for (let item of this.list) {
      if (_.isFunction(item.commands)) {
        let items = await item.commands()
        if (!_.isEmpty(items)) commands.push(items)
      }
    }

    commands = _(commands).flatMap().sortBy(o => -o.command.length).value()
    for (let command of commands) {
      let permission = await global.db.engine.findOne('permissions', { key: command.id })
      if (!_.isEmpty(permission)) command.permission = permission.permission // change to custom permission
    }
    return commands
  }

  async command (sender, message, skip) {
    if (!message.startsWith('!')) return // do nothing, this is not a command or user is ignored

    let command = await this.find(message)

    if (_.isNil(command)) return // command not found, do nothing
    if (command.permission === constants.DISABLE) return

    let [isRegular, isMod, isOwner] = await Promise.all([
      global.commons.isRegular(sender),
      global.commons.isMod(sender),
      global.commons.isOwner(sender)
    ])

    if (_.isNil(sender) || // if user is null -> we are running command through a bot
      this.skip || (command.permission === constants.VIEWERS) ||
      (command.permission === constants.REGULAR && (isRegular || isMod || isOwner)) ||
      (command.permission === constants.MODS && (isMod || isOwner)) ||
      (command.permission === constants.OWNER_ONLY && isOwner)) {
      var text = message.trim().replace(new RegExp('^(' + command.command + ')', 'i'), '').trim()
      let opts = {
        sender: _.isNil(sender) ? { username: config.settings.bot_username.toLowerCase() } : sender,
        command: command.command,
        parameters: text.trim()
      }

      if (_.isNil(command.id)) throw Error(`command id is missing from ${command['fnc']}`)

      if (typeof command.fnc === 'function' && !_.isNil(command.id)) command['fnc'].apply(command.this, [opts])
      else global.log.error(command.command + ' have wrong null function registered!', { fnc: 'Parser.prototype.parseCommands' })
    } else {
      // user doesn't have permissions for command
      sender['message-type'] = 'whisper'
      global.commons.sendMessage(global.translate('permissions.without-permission').replace(/\$command/g, message), sender)
    }
  }
}

module.exports = Parser

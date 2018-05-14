'use strict'

const _ = require('lodash')
const debug = require('debug')
const util = require('util')

const constants = require('./constants')
const config = require('../config.json')

const DEBUG_PROCESS_PARSE = debug('parser:process')

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

  async isModerated (sender, message) {
    if (this.skip) return false

    for (let parser of this.parsers()) {
      if (parser.priority !== constants.MODERATION) continue // skip non-moderation parsers
      const isOk = await parser.fnc(parser.this, this.sender, this.message)
      if (!isOk) {
        DEBUG_PROCESS_PARSE(`Parser ${parser.name} failed with message ${this.message}\n${util.inspect(isOk)}\n${util.inspect(this.sender)}`)
        return true
      }
    }
    return false // no parser failed
  }

  async process () {
    for (let parser of this.parsers()) {
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
        DEBUG_PROCESS_PARSE(`Parser ${parser.name} start`)
        if (parser.fireAndForget) {
          parser.fnc(parser.this, this.sender, this.message, this.skip)
        } else if (!(await parser.fnc(parser.this, this.sender, this.message, this.skip))) {
          // TODO: call revert on parser with revert (price can have revert)
          DEBUG_PROCESS_PARSE(`Parser ${parser.name} failed with message ${this.message}\n${util.inspect(this.sender)}`)
          return false
        }
        DEBUG_PROCESS_PARSE(`Parser ${parser.name} finish`)
      }
    }

    if (this.isCommand) {
      DEBUG_PROCESS_PARSE(`Running command - ${this.message.trim()}`)
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
  parsers () {
    const d = debug('parser:parsers')

    let parsers = []
    for (let item of this.list) {
      d(`Checking ${util.inspect(item)}`)
      if (_.isFunction(item.parsers)) parsers.push(item.parsers())
    }
    parsers = _.orderBy(_.flatMap(parsers), 'priority', 'asc')
    d(`Parsers list: ${util.inspect(parsers)}`)
    return parsers
  }

  /**
   * Find first command called by message
   * @constructor
   * @param {string} message - Message from chat
   * @returns object or null if empty
   */
  async find (message) {
    const d = debug('parser:find')

    for (let item of (await this.getCommandsList())) {
      let onlyParams = message.trim().toLowerCase().replace(item.command, '')

      let isStartingWith = message.trim().toLowerCase().startsWith(item.command)
      d(`Does ${message} startsWith ${item.command}: ${isStartingWith}`)
      if (isStartingWith && (onlyParams.length === 0 || (onlyParams.length > 0 && onlyParams[0] === ' '))) {
        return item
      }
    }
    return null
  }

  async getCommandsList () {
    const d = debug('parser:getCommandsList')
    let commands = []
    for (let item of this.list) {
      d(`Checking ${util.inspect(item)}`)
      if (_.isFunction(item.commands)) commands.push(item.commands())
    }
    // TODO: sort _(this.registeredCmds).toPairs().sortBy((o) => -o[0].length).fromPairs().value() // order by length
    commands = _.flatMap(commands)

    for (let command of commands) {
      let permission = await global.db.engine.findOne('permissions', { key: command.command.replace('!', '') })
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
      if (typeof command.fnc === 'function') command.fnc(command.this, _.isNil(sender) ? { username: config.settings.bot_username.toLowerCase() } : sender, text.trim(), message)
      else global.log.error(command.command + ' have wrong null function registered!', { fnc: 'Parser.prototype.parseCommands' })
    } else {
      // user doesn't have permissions for command
      sender['message-type'] = 'whisper'
      global.commons.sendMessage(global.translate('permissions.without-permission').replace(/\$command/g, message), sender)
    }
  }
}

module.exports = Parser

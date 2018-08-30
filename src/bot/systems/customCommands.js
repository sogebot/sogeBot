'use strict'

// 3rdparty libraries
const _ = require('lodash')
const debug = require('debug')('systems:commands')
const XRegExp = require('xregexp')

// bot libraries
var constants = require('../constants')
const System = require('./_interface')

/*
 * !command                                                 - gets an info about command usage
 * !command add owner|mod|regular|viewer ![cmd] [response]  - add command with specified response
 * !command edit owner|mod|regular|viewer ![cmd] [response] - edit command with specified response
 * !command remove ![cmd]                                   - remove specified command
 * !command toggle ![cmd]                                   - enable/disable specified command
 * !command toggle-visibility ![cmd]                        - enable/disable specified command
 * !command list                                            - get commands list
 */

class CustomCommands extends System {
  constructor () {
    const settings = {
      commands: [
        { name: '!command add', permission: constants.OWNER_ONLY },
        { name: '!command edit', permission: constants.OWNER_ONLY },
        { name: '!command list', permission: constants.OWNER_ONLY },
        { name: '!command remove', permission: constants.OWNER_ONLY },
        { name: '!command toggle-visibility', permission: constants.OWNER_ONLY },
        { name: '!command toggle', permission: constants.OWNER_ONLY },
        { name: '!command', permission: constants.OWNER_ONLY, isHelper: true }
      ],
      parsers: [
        { name: 'run', priority: constants.LOW, fireAndForget: true }
      ]
    }
    super({ settings })

    this.addMenu({ category: 'manage', name: 'customcommands', id: 'customcommands/list' })
  }

  main (opts) {
    global.commons.sendMessage(global.translate('core.usage') + ': !command add owner|mod|regular|viewer <!command> <response> | !command edit owner|mod|regular|viewer <!command> <response> | !command remove <!command> | !command list', opts.sender)
  }

  async edit (opts) {
    const match = XRegExp.exec(opts.parameters, constants.COMMAND_REGEXP_WITH_RESPONSE)

    if (_.isNil(match)) {
      let message = await global.commons.prepare('customcmds.commands-parse-failed')
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    let item = await global.db.engine.findOne(this.collection.data, { command: match.command })
    if (_.isEmpty(item)) {
      let message = await global.commons.prepare('customcmds.command-was-not-found', { command: match.command })
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    let permission = constants.VIEWERS
    switch (match.permission) {
      case 'owner':
        permission = constants.OWNER_ONLY
        break
      case 'mod':
        permission = constants.MODS
        break
      case 'regular':
        permission = constants.REGULAR
        break
    }

    await global.db.engine.update(this.collection.data, { command: match.command }, { response: match.response, permision: permission })
    let message = await global.commons.prepare('customcmds.command-was-edited', { command: match.command, response: match.response })
    debug(message); global.commons.sendMessage(message, opts.sender)
  }

  async add (opts) {
    const match = XRegExp.exec(opts.parameters, constants.COMMAND_REGEXP_WITH_RESPONSE)

    if (_.isNil(match)) {
      let message = await global.commons.prepare('customcmds.commands-parse-failed')
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    debug(match)
    let permission = constants.VIEWERS
    switch (match.permission) {
      case 'owner':
        permission = constants.OWNER_ONLY
        break
      case 'mod':
        permission = constants.MODS
        break
      case 'regular':
        permission = constants.REGULAR
        break
    }
    let command = { command: match.command, response: match.response, enabled: true, visible: true, permission: permission }

    await global.db.engine.update(this.collection.data, { command: command.command }, command)
    let message = await global.commons.prepare('customcmds.command-was-added', { command: match.command })
    debug(message); global.commons.sendMessage(message, opts.sender)
  }

  async run (opts) {
    if (!opts.message.startsWith('!')) return true // do nothing if it is not a command

    var command
    let cmdArray = opts.message.toLowerCase().split(' ')
    for (let i in opts.message.toLowerCase().split(' ')) { // search for correct command
      debug(`${i} - Searching for ${cmdArray.join(' ')} in commands`)
      command = await global.db.engine.findOne(this.collection.data, { command: cmdArray.join(' '), enabled: true })
      debug(command)
      if (!_.isEmpty(command)) break
      cmdArray.pop() // remove last array item if not found
    }
    if (_.isEmpty(command)) return true // no command was found - return
    debug('Command found: %j', command)

    debug('Checking if permissions are ok')
    let [isRegular, isMod, isOwner] = await Promise.all([
      global.commons.isRegular(opts.sender),
      global.commons.isMod(opts.sender),
      global.commons.isOwner(opts.sender)
    ])
    debug('isRegular: %s', isRegular)
    debug('isMod: %s', isMod)
    debug('isOwner: %s', isOwner)
    if (command.permission === constants.VIEWERS ||
      (command.permission === constants.REGULAR && (isRegular || isMod || isOwner)) ||
      (command.permission === constants.MODS && (isMod || isOwner)) ||
      (command.permission === constants.OWNER_ONLY && isOwner)) {
      const param = opts.message.replace(new RegExp('^(' + cmdArray.join(' ') + ')', 'i'), '').trim() // remove found command from message to get param
      global.commons.sendMessage(command.response, opts.sender, { 'param': param, 'cmd': command.command })
    }
    return true
  }

  async list (opts) {
    let commands = await global.db.engine.find(this.collection.data, { visible: true })
    var output = (commands.length === 0 ? global.translate('customcmds.list-is-empty') : global.translate('customcmds.list-is-not-empty').replace(/\$list/g, _.map(_.orderBy(commands, 'command'), 'command').join(', ')))
    debug(output); global.commons.sendMessage(output, opts.sender)
  }

  async togglePermission (opts) {
    debug('togglePermission(%j,%j,%j)', opts)
    const command = await global.db.engine.findOne(this.collection.data, { command: opts.parameters })
    if (!_.isEmpty(command)) {
      await global.db.engine.update(this.collection.data, { _id: command._id.toString() }, { permission: command.permission === 3 ? 0 : ++command.permission })
    }
  }

  async toggle (opts) {
    debug('toggle(%j,%j,%j)', opts)
    const match = XRegExp.exec(opts.parameters, constants.COMMAND_REGEXP)
    if (_.isNil(match)) {
      let message = await global.commons.prepare('customcmds.commands-parse-failed')
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    const command = await global.db.engine.findOne(this.collection.data, { command: match.command })
    if (_.isEmpty(command)) {
      let message = await global.commons.prepare('customcmds.command-was-not-found', { command: match.command })
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    await global.db.engine.update(this.collection.data, { command: match.command }, { enabled: !command.enabled })

    let message = await global.commons.prepare(!command.enabled ? 'customcmds.command-was-enabled' : 'customcmds.command-was-disabled', { command: command.command })
    debug(message); global.commons.sendMessage(message, opts.sender)
  }

  async toggleVisibility (opts) {
    const match = XRegExp.exec(opts.parameters, constants.COMMAND_REGEXP)
    if (_.isNil(match)) {
      let message = await global.commons.prepare('customcmds.commands-parse-failed')
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    const command = await global.db.engine.findOne(this.collection.data, { command: match.command })
    if (_.isEmpty(command)) {
      let message = await global.commons.prepare('customcmds.command-was-not-found', { command: match.command })
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    await global.db.engine.update(this.collection.data, { command: match.command }, { visible: !command.visible })
    let message = await global.commons.prepare(!command.visible ? 'customcmds.command-was-exposed' : 'customcmds.command-was-concealed', { command: command.command })
    debug(message); global.commons.sendMessage(message, opts.sender)
  }

  async remove (opts) {
    const match = XRegExp.exec(opts.parameters, constants.COMMAND_REGEXP)
    if (_.isNil(match)) {
      let message = await global.commons.prepare('customcmds.commands-parse-failed')
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    let removed = await global.db.engine.remove(this.collection.data, { command: match.command })
    if (!removed) {
      let message = await global.commons.prepare('customcmds.command-was-not-found', { command: match.command })
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }
    let message = await global.commons.prepare('customcmds.command-was-removed', { command: match.command })
    debug(message); global.commons.sendMessage(message, opts.sender)
  }
}

module.exports = new CustomCommands()

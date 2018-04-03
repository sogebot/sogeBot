'use strict'

// 3rdparty libraries
const _ = require('lodash')
const debug = require('debug')('systems:commands')
const XRegExp = require('xregexp')

// bot libraries
var constants = require('../constants')

/*
 * !command                          - gets an info about command usage
 * !command add ![cmd] [response]    - add command with specified response
 * !command edit ![cmd] [response]   - edit command with specified response
 * !command remove ![cmd]            - remove specified command
 * !command toggle ![cmd]            - enable/disable specified command
 * !command toggle-visibility ![cmd] - enable/disable specified command
 * !command list                     - get commands list
 */

class CustomCommands {
  constructor () {
    if (global.commons.isSystemEnabled(this) && require('cluster').isMaster) {
      global.panel.addMenu({category: 'manage', name: 'custom-commands', id: 'customCommands'})
      global.panel.registerSockets({
        self: this,
        expose: ['add', 'remove', 'visible', 'toggle', 'editCommand', 'editResponse', 'send'],
        finally: this.send
      })
    }
  }

  commands () {
    return !global.commons.isSystemEnabled('customcommands')
      ? []
      : [
        { command: '!command add', fnc: this.add, permission: constants.OWNER_ONLY, this: this },
        { command: '!command edit', fnc: this.edit, permission: constants.OWNER_ONLY, this: this },
        { command: '!command list', fnc: this.list, permission: constants.OWNER_ONLY, this: this },
        { command: '!command remove', fnc: this.remove, permission: constants.OWNER_ONLY, this: this },
        { command: '!command toggle-visibility', fnc: this.visibility, permission: constants.OWNER_ONLY, this: this },
        { command: '!command toggle', fnc: this.toggle, permission: constants.OWNER_ONLY, this: this },
        { command: '!command', fnc: this.help, permission: constants.OWNER_ONLY, isHelper: true, this: this }
      ]
  }

  parsers () {
    return !global.commons.isSystemEnabled('customcommands')
      ? []
      : [
        { name: 'command', fnc: this.run, priority: constants.LOW, permission: constants.VIEWERS, this: this }
      ]
  }

  async send (self, socket) {
    socket.emit('commands', await global.db.engine.find('commands'))
  }

  async editCommand (self, socket, data) {
    if (data.value.length === 0) await self.remove(self, null, '!' + data.id)
    else {
      if (data.value.startsWith('!')) data.value = data.value.replace('!', '')
      await global.db.engine.update('commands', { command: data.id }, { command: data.value })

      global.parser.unregister(data.id)
      global.parser.register(self, '!' + data.value, self.run, constants.VIEWERS)
    }
  }

  async editResponse (self, socket, data) {
    if (data.value.length === 0) await self.remove(self, null, '!' + data.id)
    else await global.db.engine.update('commands', { command: data.id }, { response: data.value })
  }

  help (self, sender) {
    global.commons.sendMessage(global.translate('core.usage') + ': !command add <!command> <response> | !command edit <!command> <response> | !command remove <!command> | !command list', sender)
  }

  async edit (self, sender, text) {
    debug('edit(%j, %j, %j)', self, sender, text)
    const match = XRegExp.exec(text, constants.COMMAND_REGEXP_WITH_RESPONSE)

    if (_.isNil(match)) {
      let message = global.commons.prepare('customcmds.commands-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    let item = await global.db.engine.findOne('commands', { command: match.command })
    if (_.isEmpty(item)) {
      let message = global.commons.prepare('customcmds.command-was-not-found', { command: match.command })
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    await global.db.engine.update('commands', { command: match.command }, { response: match.response })
    let message = global.commons.prepare('customcmds.command-was-edited', { command: match.command, response: match.response })
    debug(message); global.commons.sendMessage(message, sender)
  }

  async add (self, sender, text) {
    debug('add(%j,%j,%j)', self, sender, text)
    const match = XRegExp.exec(text, constants.COMMAND_REGEXP_WITH_RESPONSE)

    if (_.isNil(match)) {
      let message = global.commons.prepare('customcmds.commands-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    debug(match)
    let command = { command: match.command, response: match.response, enabled: true, visible: true }

    await global.db.engine.insert('commands', command)
    let message = global.commons.prepare('customcmds.command-was-added', { command: match.command })
    debug(message); global.commons.sendMessage(message, sender)
  }

  async run (self, sender, msg) {
    if (!msg.startsWith('!')) return true // do nothing if it is not a command

    var command
    let cmdArray = msg.toLowerCase().split(' ')
    for (let i in msg.toLowerCase().split(' ')) { // search for correct command
      debug(`${i} - Searching for ${cmdArray.join(' ')} in commands`)
      command = await global.db.engine.findOne('commands', { command: cmdArray.join(' ').replace('!', ''), enabled: true })
      debug(command)
      if (!_.isEmpty(command)) break
      cmdArray.pop() // remove last array item if not found
    }
    if (_.isEmpty(command)) return true // no command was found - return
    debug('Command found: %j', command)
    const param = msg.replace(cmdArray.join(' '), '') // remove found command from message to get param
    global.commons.sendMessage(command.response, sender, {'param': param, 'cmd': command.command})
  }

  async list (self, sender, text) {
    let commands = await global.db.engine.find('commands', { visible: true })
    var output = (commands.length === 0 ? global.translate('customcmds.list-is-empty') : global.translate('customcmds.list-is-not-empty').replace(/\$list/g, '!' + _.map(_.orderBy(commands, 'command'), 'command').join(', !')))
    debug(output); global.commons.sendMessage(output, sender)
  }

  async toggle (self, sender, text) {
    debug('toggle(%j,%j,%j)', self, sender, text)
    const match = XRegExp.exec(text, constants.COMMAND_REGEXP)
    if (_.isNil(match)) {
      let message = global.commons.prepare('customcmds.commands-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    const command = await global.db.engine.findOne('commands', { command: match.command })
    if (_.isEmpty(command)) {
      let message = global.commons.prepare('customcmds.command-was-not-found', { command: match.command })
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    await global.db.engine.update('commands', { command: match.command }, { enabled: !command.enabled })

    let message = global.commons.prepare(!command.enabled ? 'customcmds.command-was-enabled' : 'customcmds.command-was-disabled', { command: command.command })
    debug(message); global.commons.sendMessage(message, sender)
  }

  async visible (self, sender, text) {
    const match = XRegExp.exec(text, constants.COMMAND_REGEXP)
    if (_.isNil(match)) {
      let message = global.commons.prepare('customcmds.commands-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    const command = await global.db.engine.findOne('commands', { command: match.command })
    if (_.isEmpty(command)) {
      let message = global.commons.prepare('customcmds.command-was-not-found', { command: match.command })
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    await global.db.engine.update('commands', { command: match.command }, { visible: !command.visible })
    let message = global.commons.prepare(!command.visible ? 'customcmds.command-was-exposed' : 'customcmds.command-was-concealed', { command: command.command })
    debug(message); global.commons.sendMessage(message, sender)
  }

  async remove (self, sender, text) {
    const match = XRegExp.exec(text, constants.COMMAND_REGEXP)
    if (_.isNil(match)) {
      let message = global.commons.prepare('customcmds.commands-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    let removed = await global.db.engine.remove('commands', { command: match.command })
    if (!removed) {
      let message = global.commons.prepare('customcmds.command-was-not-found', { command: match.command })
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }
    let message = global.commons.prepare('customcmds.command-was-removed', { command: match.command })
    debug(message); global.commons.sendMessage(message, sender)
  }
}

module.exports = new CustomCommands()

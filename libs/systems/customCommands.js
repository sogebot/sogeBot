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
    if (global.commons.isSystemEnabled(this)) {
      global.parser.register(this, '!command add', this.add, constants.OWNER_ONLY)
      global.parser.register(this, '!command edit', this.edit, constants.OWNER_ONLY)
      global.parser.register(this, '!command list', this.list, constants.OWNER_ONLY)
      global.parser.register(this, '!command remove', this.remove, constants.OWNER_ONLY)
      global.parser.register(this, '!command toggle-visibility', this.visible, constants.OWNER_ONLY)
      global.parser.register(this, '!command toggle', this.toggle, constants.OWNER_ONLY)
      global.parser.register(this, '!command', this.help, constants.OWNER_ONLY)

      global.parser.registerHelper('!command')

      global.panel.addMenu({category: 'manage', name: 'custom-commands', id: 'customCommands'})
      global.panel.registerSockets({
        self: this,
        expose: ['add', 'remove', 'visible', 'toggle', 'editCommand', 'editResponse', 'send'],
        finally: this.send
      })

      this.register(this)
    }
  }

  async register (self) {
    let commands = await global.db.engine.find('commands')
    _.each(commands, function (o) { global.parser.register(self, '!' + o.command, self.run, constants.VIEWERS) })
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

    if (global.parser.isRegistered(command.command)) {
      let message = global.commons.prepare('core.isRegistered', { keyword: command.command })
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    await global.db.engine.insert('commands', command)
    await self.register(self)
    let message = global.commons.prepare('customcmds.command-was-added', { command: match.command })
    debug(message); global.commons.sendMessage(message, sender)
  }

  async run (self, sender, msg, fullMsg) {
    const match = XRegExp.exec(fullMsg, constants.COMMAND_REGEXP_WITH_OPTIONAL_RESPONSE)
    let command = await global.db.engine.findOne('commands', { command: match.command.toLowerCase(), enabled: true })
    if (!_.isEmpty(command)) global.commons.sendMessage(command.response, sender, {'param': match.response, 'cmd': match.command})
    else global.parser.unregister(fullMsg)
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
    await self.register(self)

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
    global.parser.unregister('!' + match.command)
    let message = global.commons.prepare('customcmds.command-was-removed', { command: match.command })
    debug(message); global.commons.sendMessage(message, sender)
  }
}

module.exports = new CustomCommands()

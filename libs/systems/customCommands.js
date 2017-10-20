'use strict'

// 3rdparty libraries
const _ = require('lodash')
const debug = require('debug')('systems:commands')

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
    else {
      if (data.value.startsWith('!')) data.value = data.value.replace('!', '')
      await global.db.engine.update('commands', { command: data.id }, { response: data.value })
    }
  }

  help (self, sender) {
    global.commons.sendMessage(global.translate('core.usage') + ': !command add <!command> <response> | !command edit <!command> <response> | !command remove <!command> | !command list', sender)
  }

  async edit (self, sender, text) {
    debug('edit(%j, %j, %j)', self, sender, text)
    let parsed = text.match(/^!([\u0500-\u052F\u0400-\u04FF\w\S]+) ([\u0500-\u052F\u0400-\u04FF\w\S].+)$/)

    if (_.isNil(parsed)) {
      let message = global.commons.prepare('customcmds.commands-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    const command = parsed[1]
    const response = parsed[2]

    let item = await global.db.engine.findOne('commands', { command: command })
    if (_.isEmpty(item)) {
      let message = global.commons.prepare('customcmds.command-was-not-found', { command: command })
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    await global.db.engine.update('commands', { command: command }, { response: response })
    let message = global.commons.prepare('customcmds.command-was-edited', { command: command, response: response })
    debug(message); global.commons.sendMessage(message, sender)
  }

  async add (self, sender, text) {
    debug('add(%j,%j,%j)', self, sender, text)
    let parsed = text.match(/^!([\u0500-\u052F\u0400-\u04FF\w]+) ([\u0500-\u052F\u0400-\u04FF\w\S].+)$/)

    if (_.isNil(parsed)) {
      let message = global.commons.prepare('customcmds.commands-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    debug(parsed)
    let command = { command: parsed[1], response: parsed[2], enabled: true, visible: true }

    if (global.parser.isRegistered(command.command)) {
      let message = global.commons.prepare('core.isRegistered', { keyword: command.command })
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    await global.db.engine.insert('commands', command)
    await self.register(self)
    let message = global.commons.prepare('customcmds.command-was-added', { command: parsed[1] })
    debug(message); global.commons.sendMessage(message, sender)
  }

  async run (self, sender, msg, fullMsg) {
    let parsed = fullMsg.match(/^!([\u0500-\u052F\u0400-\u04FF\w]+) ?(.*)$/)
    let command = await global.db.engine.findOne('commands', { command: parsed[1].toLowerCase(), enabled: true })
    if (!_.isEmpty(command)) global.commons.sendMessage(command.response, sender, {'param': msg, 'cmd': command})
    else global.parser.unregister(fullMsg)
  }

  async list (self, sender, text) {
    let commands = await global.db.engine.find('commands', { visible: true })
    var output = (commands.length === 0 ? global.translate('customcmds.list-is-empty') : global.translate('customcmds.list-is-not-empty').replace(/\$list/g, '!' + _.map(_.orderBy(commands, 'command'), 'command').join(', !')))
    debug(output); global.commons.sendMessage(output, sender)
  }

  async toggle (self, sender, text) {
    debug('toggle(%j,%j,%j)', self, sender, text)
    let id = text.match(/^!([\u0500-\u052F\u0400-\u04FF\w]+)$/)
    if (_.isNil(id)) {
      let message = global.commons.prepare('customcmds.commands-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }
    id = id[1]

    const command = await global.db.engine.findOne('commands', { command: id })
    if (_.isEmpty(command)) {
      let message = global.commons.prepare('customcmds.command-was-not-found', { command: id })
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    await global.db.engine.update('commands', { command: id }, { enabled: !command.enabled })
    await self.register(self)

    let message = global.commons.prepare(!command.enabled ? 'customcmds.command-was-enabled' : 'customcmds.command-was-disabled', { command: command.command })
    debug(message); global.commons.sendMessage(message, sender)
  }

  async visible (self, sender, text) {
    let id = text.match(/^!([\u0500-\u052F\u0400-\u04FF\w]+)$/)
    if (_.isNil(id)) {
      let message = global.commons.prepare('customcmds.commands-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }
    id = id[1]

    const command = await global.db.engine.findOne('commands', { command: id })
    if (_.isEmpty(command)) {
      let message = global.commons.prepare('customcmds.command-was-not-found', { command: id })
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    await global.db.engine.update('commands', { command: id }, { visible: !command.visible })
    let message = global.commons.prepare(!command.visible ? 'customcmds.command-was-exposed' : 'customcmds.command-was-concealed', { command: command.command })
    debug(message); global.commons.sendMessage(message, sender)
  }

  async remove (self, sender, text) {
    let id = text.match(/^!([\u0500-\u052F\u0400-\u04FF\w]+)$/)
    if (_.isNil(id)) {
      let message = global.commons.prepare('customcmds.commands-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }
    id = id[1]

    let removed = await global.db.engine.remove('commands', { command: id })
    if (!removed) {
      let message = global.commons.prepare('customcmds.command-was-not-found', { command: id })
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }
    global.parser.unregister('!' + id)
    let message = global.commons.prepare('customcmds.command-was-removed', { command: id })
    debug(message); global.commons.sendMessage(message, sender)
  }
}

module.exports = new CustomCommands()

'use strict'

// 3rdparty libraries
const _ = require('lodash')
const debug = require('debug')('systems:commands')

// bot libraries
var constants = require('../constants')

/*
 * !command                          - gets an info about command usage
 * !command add ![cmd] [response]    - add command with specified response
 * !command remove ![cmd]            - remove specified command
 * !command toggle ![cmd]            - enable/disable specified command
 * !command toggle-visibility ![cmd] - enable/disable specified command
 * !command list                     - get commands list
 */

class CustomCommands {
  constructor () {
    if (global.commons.isSystemEnabled(this)) {
      global.parser.register(this, '!command add', this.add, constants.OWNER_ONLY)
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
    global.commons.sendMessage(global.translate('core.usage') + ': !command add <!command> <response> | !command remove <!command> | !command list', sender)
  }

  async add (self, sender, text) {
    debug('add(%j,%j,%j)', self, sender, text)
    let parsed = text.match(/^!([\u0500-\u052F\u0400-\u04FF\w]+) ([\u0500-\u052F\u0400-\u04FF\w\S].+)$/)

    if (_.isNil(parsed)) {
      global.commons.sendMessage(global.translate('customcmds.failed.parse'), sender)
      return false
    }

    let command = { command: parsed[1], response: parsed[2], enabled: true, visible: true }

    let exists = await global.db.engine.findOne('commands', { command: parsed[1] })
    if (!_.isEmpty(exists)) {
      global.commons.sendMessage(global.translate('customcmds.failed.add').replace(/\$command/g, parsed[1]), sender)
      return false
    }

    if (global.parser.isRegistered(command.command)) {
      global.commons.sendMessage(global.translate('core.isRegistered').replace(/\$keyword/g, '!' + command.command), sender)
      return false
    }

    await global.db.engine.insert('commands', command)
    await self.register(self)
    global.commons.sendMessage(global.translate('customcmds.success.add').replace(/\$command/g, parsed[1]), sender)
  }

  async run (self, sender, msg, fullMsg) {
    let parsed = fullMsg.match(/^!([\u0500-\u052F\u0400-\u04FF\w]+) ?(.*)$/)
    let command = await global.db.engine.findOne('commands', { command: parsed[1].toLowerCase(), enabled: true })
    if (!_.isEmpty(command)) global.commons.sendMessage(command.response, sender, {'param': msg, 'cmd': command})
    else global.parser.unregister(fullMsg)
  }

  async list (self, sender, text) {
    let commands = await global.db.engine.find('commands', { visible: true })
    var output = (commands.length === 0 ? global.translate('customcmds.failed.list') : global.translate('customcmds.success.list').replace(/\$list/g, '!' + _.map(commands, 'command').join(', !')))
    global.commons.sendMessage(output, sender)
  }

  async toggle (self, sender, text) {
    debug('toggle(%j,%j,%j)', self, sender, text)
    let id = text.match(/^!([\u0500-\u052F\u0400-\u04FF\w]+)$/)
    if (_.isNil(id)) {
      global.commons.sendMessage(global.translate('customcmds.failed.parse'), sender)
      debug(global.translate('customcmds.failed.parse'))
      return false
    }
    id = id[1]

    const command = await global.db.engine.findOne('commands', { command: id })
    if (_.isEmpty(command)) {
      global.commons.sendMessage(global.translate('customcmds.failed.toggle')
        .replace(/\$command/g, id), sender)
      debug(global.translate('customcmds.failed.toggle').replace(/\$command/g, id))
      return false
    }

    await global.db.engine.update('commands', { command: id }, { enabled: !command.enabled })
    await self.register(self)

    global.commons.sendMessage(global.translate(!command.enabled ? 'customcmds.success.enabled' : 'customcmds.success.disabled')
      .replace(/\$command/g, command.command), sender)
    debug(global.translate(!command.enabled ? 'customcmds.success.enabled' : 'customcmds.success.disabled').replace(/\$command/g, command.command))
  }

  async visible (self, sender, text) {
    let id = text.match(/^!([\u0500-\u052F\u0400-\u04FF\w]+)$/)
    if (_.isNil(id)) {
      global.commons.sendMessage(global.translate('customcmds.failed.parse'), sender)
      return false
    }
    id = id[1]

    const command = await global.db.engine.findOne('commands', { command: id })
    if (_.isEmpty(command)) {
      global.commons.sendMessage(global.translate('customcmds.failed.visible')
        .replace(/\$command/g, id), sender)
      return
    }

    await global.db.engine.update('commands', { command: id }, { visible: !command.visible })
    global.commons.sendMessage(global.translate(!command.visible ? 'customcmds.success.visible' : 'customcmds.success.invisible')
      .replace(/\$command/g, id), sender)
  }

  async remove (self, sender, text) {
    let id = text.match(/^!?([\u0500-\u052F\u0400-\u04FF\w]+)$/)
    if (_.isNil(id)) {
      global.commons.sendMessage(global.translate('customcmds.failed.parse'), sender)
      return false
    }
    id = id[1]

    let removed = await global.db.engine.remove('commands', { command: id })
    if (!removed) {
      global.commons.sendMessage(global.translate('customcmds.failed.remove').replace(/\$command/g, id), sender)
      return false
    }
    global.parser.unregister('!' + id)
    global.commons.sendMessage(global.translate('customcmds.success.remove').replace(/\$command/g, id), sender)
  }
}

module.exports = new CustomCommands()

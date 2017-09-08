'use strict'

// 3rdparty libraries
var _ = require('lodash')

// bot libraries
var constants = require('../constants')

const ERROR_ALREADY_EXISTS = '0'
const ERROR_DOESNT_EXISTS = '1'

/*
 * !command                          - gets an info about command usage
 * !command add ![cmd] [response]    - add command with specified response
 * !command remove ![cmd]            - remove specified command
 * !command toggle ![cmd]            - enable/disable specified command
 * !command toggle-visibility ![cmd] - enable/disable specified command
 * !command list                     - get commands list
 */

function CustomCommands () {
  if (global.commons.isSystemEnabled(this)) {
    global.parser.register(this, '!command add', this.add, constants.OWNER_ONLY)
    global.parser.register(this, '!command list', this.list, constants.OWNER_ONLY)
    global.parser.register(this, '!command remove', this.remove, constants.OWNER_ONLY)
    global.parser.register(this, '!command toggle-visibility', this.visible, constants.OWNER_ONLY)
    global.parser.register(this, '!command toggle', this.toggle, constants.OWNER_ONLY)
    global.parser.register(this, '!command', this.help, constants.OWNER_ONLY)

    global.parser.registerHelper('!command')

    this.register(this)
    this.webPanel()
  }
}

CustomCommands.prototype.webPanel = function () {
  global.panel.addMenu({category: 'manage', name: 'custom-commands', id: 'customCommands'})
  global.panel.socketListening(this, 'commands.get', this.sendCommands)
  global.panel.socketListening(this, 'commands.delete', this.deleteCommands)
  global.panel.socketListening(this, 'commands.create', this.createCommands)
  global.panel.socketListening(this, 'commands.toggle', this.toggleCommands)
  global.panel.socketListening(this, 'commands.toggle.visibility', this.toggleVisibilityCommands)
  global.panel.socketListening(this, 'commands.edit', this.editCommands)
}

CustomCommands.prototype.sendCommands = async function (self, socket) {
  socket.emit('commands', await global.db.engine.find('commands'))
}

CustomCommands.prototype.deleteCommands = function (self, socket, data) {
  self.remove(self, null, '!' + data)
  self.sendCommands(self, socket)
}

CustomCommands.prototype.toggleCommands = async function (self, socket, data) {
  await self.toggle(self, null, '!' + data)
  self.sendCommands(self, socket)
}

CustomCommands.prototype.toggleVisibilityCommands = async function (self, socket, data) {
  await self.visible(self, null, '!' + data)
  self.sendCommands(self, socket)
}

CustomCommands.prototype.createCommands = function (self, socket, data) {
  self.add(self, null, '!' + data.command + ' ' + data.response)
  self.sendCommands(self, socket)
}

CustomCommands.prototype.editCommands = async function (self, socket, data) {
  if (data.value.length === 0) self.remove(self, null, data.id)
  else await global.db.engine.update('commands', { command: data.id }, { response: data.value })
  self.sendCommands(self, socket)
}

CustomCommands.prototype.help = function (self, sender) {
  global.commons.sendMessage(global.translate('core.usage') + ': !command add <!command> <response> | !command remove <!command> | !command list', sender)
}

CustomCommands.prototype.register = async function (self) {
  let commands = await global.db.engine.find('commands')
  _.each(commands, function (o) { global.parser.register(self, '!' + o.command, self.run, constants.VIEWERS) })
}

CustomCommands.prototype.add = async function (self, sender, text) {
  try {
    let parsed = text.match(/^!([\u0500-\u052F\u0400-\u04FF\w]+) ([\u0500-\u052F\u0400-\u04FF\w\S].+)$/)
    let command = { command: parsed[1], response: parsed[2], enabled: true, visible: true }

    if (!_.isEmpty(await global.db.engine.findOne('commands', { command: parsed[1] }))) throw Error(ERROR_ALREADY_EXISTS)

    if (global.parser.isRegistered(command.command)) {
      global.commons.sendMessage(global.translate('core.isRegistered').replace(/\$keyword/g, '!' + command.command), sender)
      return
    }

    global.db.engine.update('commands', { command: parsed[1] }, command)
    self.register(self)
    global.commons.sendMessage(global.translate('customcmds.success.add'), sender)
  } catch (e) {
    switch (e.message) {
      case ERROR_ALREADY_EXISTS:
        global.commons.sendMessage(global.translate('customcmds.failed.add'), sender)
        break
      default:
        global.commons.sendMessage(global.translate('customcmds.failed.parse'), sender)
    }
  }
}

CustomCommands.prototype.run = async function (self, sender, msg, fullMsg) {
  let parsed = fullMsg.match(/^!([\u0500-\u052F\u0400-\u04FF\w]+) ?(.*)$/)
  let command = await global.db.engine.findOne('commands', { command: parsed[1].toLowerCase(), enabled: true })
  try {
    global.commons.sendMessage(command.response, sender, {'param': msg, 'cmd': command})
  } catch (e) {
    global.parser.unregister(fullMsg)
  }
}

CustomCommands.prototype.list = async function (self, sender, text) {
  let commands = await global.db.engine.find('commands', { visible: true })
  var output = (commands.length === 0 ? global.translate('customcmds.failed.list') : global.translate('customcmds.success.list') + ': !' + commands.join(', !'))
  global.commons.sendMessage(output, sender)
}

CustomCommands.prototype.toggle = async function (self, sender, text) {
  try {
    const id = text.match(/^!([\u0500-\u052F\u0400-\u04FF\w]+)$/)[1]
    const command = await global.db.engine.findOne('commands', { command: id })
    if (_.isEmpty(command)) {
      global.commons.sendMessage(global.translate('customcmds.failed.toggle')
        .replace(/\$command/g, id), sender)
      return
    }

    await global.db.engine.update('commands', { command: id }, { enabled: !command.enabled })
    self.register(self)

    global.commons.sendMessage(global.translate(command.enabled ? 'customcmds.success.enabled' : 'customcmds.success.disabled')
      .replace(/\$command/g, command.command), sender)
  } catch (e) {
    global.commons.sendMessage(global.translate('customcmds.failed.parse'), sender)
  }
}

CustomCommands.prototype.visible = async function (self, sender, text) {
  try {
    const id = text.match(/^!([\u0500-\u052F\u0400-\u04FF\w]+)$/)[1]
    const command = await global.db.engine.findOne('commands', { command: id })
    if (_.isUndefined(command)) {
      global.commons.sendMessage(global.translate('customcmds.failed.visible')
        .replace(/\$command/g, id), sender)
      return
    }

    await global.db.engine.update('commands', { command: id }, { visible: !command.visible })
    global.commons.sendMessage(global.translate(command.visible ? 'customcmds.success.visible' : 'customcmds.success.invisible')
      .replace(/\$command/g, command.command), sender)
  } catch (e) {
    global.commons.sendMessage(global.translate('customcmds.failed.parse'), sender)
  }
}

CustomCommands.prototype.remove = async function (self, sender, text) {
  try {
    let id = text.match(/^!?([\u0500-\u052F\u0400-\u04FF\w]+)$/)[1]
    let removed = await global.db.engine.remove('commands', { command: id })
    if (!removed) throw Error(ERROR_DOESNT_EXISTS)
    global.parser.unregister('!' + id)
    global.commons.sendMessage(global.translate('customcmds.success.remove'), sender)
  } catch (e) {
    switch (e.message) {
      case ERROR_DOESNT_EXISTS:
        global.commons.sendMessage(global.translate('customcmds.failed.remove'), sender)
        break
      default:
        global.commons.sendMessage(global.translate('customcmds.failed.parse'), sender)
    }
  }
}

module.exports = new CustomCommands()

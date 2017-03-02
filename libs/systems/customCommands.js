'use strict'

// 3rdparty libraries
var _ = require('lodash')

// bot libraries
var constants = require('../constants')
var log = global.log

const ERROR_ALREADY_EXISTS = '0'
const ERROR_DOESNT_EXISTS = '1'

/*
 * !command                      - gets an info about command usage
 * !command add [cmd] [response] - add command with specified response
 * !command remove [cmd]         - remove specified command
 * !command list                 - get commands list
 */

function CustomCommands () {
  this.commands = []

  if (global.commons.isSystemEnabled(this)) {
    global.parser.register(this, '!command add', this.add, constants.OWNER_ONLY)
    global.parser.register(this, '!command list', this.list, constants.OWNER_ONLY)
    global.parser.register(this, '!command remove', this.remove, constants.OWNER_ONLY)
    global.parser.register(this, '!command', this.help, constants.OWNER_ONLY)

    global.parser.registerHelper('!command')

    global.watcher.watch(this, 'commands', this._save)
    this._update(this)

    this.webPanel()
  }
}

CustomCommands.prototype._update = function (self) {
  global.botDB.findOne({ _id: 'commands' }, function (err, item) {
    if (err) return log.error(err)
    if (_.isNull(item)) return
    self.commands = item.commands
  })
}

CustomCommands.prototype._save = function (self) {
  let commands = { commands: self.commands }
  global.botDB.update({ _id: 'commands' }, { $set: commands }, { upsert: true })
  self.register(self)
}

CustomCommands.prototype.webPanel = function () {
  global.panel.addMenu({category: 'manage', name: 'Custom Commands', id: 'customCommands'})
  global.panel.socketListening(this, 'getCommands', this.sendCommands)
  global.panel.socketListening(this, 'deleteCommand', this.deleteCommands)
  global.panel.socketListening(this, 'createCommand', this.createCommands)
}

CustomCommands.prototype.sendCommands = function (self, socket) {
  socket.emit('Commands', self.commands)
}

CustomCommands.prototype.deleteCommands = function (self, socket, data) {
  self.remove(self, null, data)
  self.sendCommands(self, socket)
}

CustomCommands.prototype.createCommands = function (self, socket, data) {
  self.add(self, null, data.command + ' ' + data.response)
  self.sendCommands(self, socket)
}

CustomCommands.prototype.help = function (self, sender) {
  global.commons.sendMessage(global.translate('core.usage') + ': !command add <command> <response> | !command remove <command> | !command list', sender)
}

CustomCommands.prototype.register = function (self) {
  _.each(self.commands, function (o) { global.parser.register(self, '!' + o.command, self.run, constants.VIEWERS) })
}

CustomCommands.prototype.add = function (self, sender, text) {
  try {
    let parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+) ([\u0500-\u052F\u0400-\u04FF\w\S].+)$/)
    let command = { command: parsed[1], response: parsed[2] }
    if (!_.isUndefined(_.find(self.commands, function (o) { return o.command === command.command }))) throw Error(ERROR_ALREADY_EXISTS)
    self.commands.push(command)
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

CustomCommands.prototype.run = function (self, sender, msg, fullMsg) {
  let parsed = fullMsg.match(/^!([\u0500-\u052F\u0400-\u04FF\w]+) ?(.*)$/)
  let command = _.find(self.commands, function (o) { return o.command === parsed[1] })
  try {
    global.commons.sendMessage(command.response, sender, {'set': msg})
  } catch (e) {
    global.parser.unregister(fullMsg)
  }
}

CustomCommands.prototype.list = function (self, sender, text) {
  var commands = []
  _.each(self.commands, function (element) { commands.push('!' + element.command) })
  var output = (commands.length === 0 ? global.translate('customcmds.failed.list') : global.translate('customcmds.success.list') + ': ' + commands.join(', '))
  global.commons.sendMessage(output, sender)
}

CustomCommands.prototype.remove = function (self, sender, text) {
  try {
    let parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+)$/)
    if (_.isUndefined(_.find(self.commands, function (o) { return o.command === parsed[1] }))) throw Error(ERROR_DOESNT_EXISTS)
    self.commands = _.filter(self.commands, function (o) { return o.command !== parsed[1] })
    global.parser.unregister('!' + parsed[1])
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

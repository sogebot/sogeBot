'use strict'

// 3rdparty libraries
var _ = require('lodash')
// bot libraries
var constants = require('../constants')
var log = global.log

function CustomCommands () {
  if (global.commons.isSystemEnabled(this)) {
    global.parser.register(this, '!command add', this.add, constants.OWNER_ONLY)
    global.parser.register(this, '!command list', this.list, constants.OWNER_ONLY)
    global.parser.register(this, '!command remove', this.remove, constants.OWNER_ONLY)
    global.parser.register(this, '!command', this.help, constants.OWNER_ONLY)

    global.parser.registerHelper('!command')

    // start interval for registering commands from DB
    var self = this
    setInterval(function () {
      self.register(self)
    }, 1000)

    this.webPanel()
  }
}

CustomCommands.prototype.webPanel = function () {
  global.panel.addMenu({category: 'manage', name: 'Custom Commands', id: 'customCommands'})
  global.panel.socketListening(this, 'getCommands', this.sendCommands)
  global.panel.socketListening(this, 'deleteCommand', this.deleteCommands)
  global.panel.socketListening(this, 'createCommand', this.createCommands)
}

CustomCommands.prototype.sendCommands = function (self, socket) {
  global.botDB.find({$where: function () { return this._id.startsWith('customcmds') }}, function (err, items) {
    if (err) { log.error(err) }
    socket.emit('Commands', items)
  })
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
  global.botDB.find({$where: function () { return this._id.startsWith('customcmds') }}, function (err, docs) {
    if (err) { log.error(err) }
    docs.forEach(function (e, i, ar) { global.parser.register(self, '!' + e.command, self.run, constants.VIEWERS) })
  })
}

CustomCommands.prototype.add = function (self, sender, text) {
  try {
    var parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+) ([\u0500-\u052F\u0400-\u04FF\w\S].+)$/)
    global.commons.insertIfNotExists({__id: 'customcmds_' + parsed[1], _command: parsed[1], response: parsed[2], success: 'customcmds.success.add', error: 'customcmds.failed.add'})
  } catch (e) {
    global.commons.sendMessage(global.translate('customcmds.failed.parse'), sender)
  }
}

CustomCommands.prototype.run = function (self, sender, msg, fullMsg) {
  var parsed = fullMsg.match(/^!([\u0500-\u052F\u0400-\u04FF\w]+) ?(.*)$/)
  global.botDB.findOne({$where: function () { return this._id.startsWith('customcmds') }, command: parsed[1]}, function (err, item) {
    if (err) { log.error(err) }
    try {
      global.commons.sendMessage(item.response, sender, {'set': msg})
    } catch (e) {
      global.parser.unregister(fullMsg)
    }
  })
}

CustomCommands.prototype.list = function (self, sender, text) {
  var parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+)$/)
  if (_.isNull(parsed)) {
    global.botDB.find({$where: function () { return this._id.startsWith('customcmds') }}, function (err, docs) {
      if (err) { log.error(err) }
      var commands = []
      docs.forEach(function (e, i, ar) { commands.push('!' + e.command) })
      var output = (docs.length === 0 ? global.translate('customcmds.failed.list') : global.translate('customcmds.success.list') + ': ' + commands.join(', '))
      global.commons.sendMessage(output, sender)
    })
  } else {
    global.commons.sendMessage(global.translate('customcmds.failed.parse', sender))
  }
}

CustomCommands.prototype.remove = function (self, sender, text) {
  try {
    var parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+)$/)
    global.commons.remove({__id: 'customcmds_' + parsed[1],
      success: function (cb) {
        global.parser.unregister('!' + cb.command)
        global.commons.sendMessage(global.translate('customcmds.success.remove'), sender)
      },
      error: 'customcmds.failed.remove'})
  } catch (e) {
    global.commons.sendMessage(global.translate('customcmds.failed.parse'), sender)
  }
}

module.exports = new CustomCommands()

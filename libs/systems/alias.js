'use strict'

var chalk = require('chalk')
var constants = require('../constants')
var _ = require('lodash')
var log = global.log

function Alias () {
  if (global.configuration.get().systems.alias === true) {
    global.parser.register(this, '!alias add', this.add, constants.OWNER_ONLY)
    global.parser.register(this, '!alias list', this.list, constants.OWNER_ONLY)
    global.parser.register(this, '!alias remove', this.remove, constants.OWNER_ONLY)
    global.parser.register(this, '!alias', this.help, constants.OWNER_ONLY)

    global.parser.registerHelper('!alias')

    global.parser.registerParser(this, 'alias', this.parse, constants.VIEWERS)

    this.webPanel()
  }
  log.info('Alias system ' + global.translate('core.loaded') + ' ' + (global.configuration.get().systems.alias === true ? chalk.green(global.translate('core.enabled')) : chalk.red(global.translate('core.disabled'))))
}

Alias.prototype.webPanel = function () {
  global.panel.addMenu({category: 'systems', name: 'Alias', id: 'alias'})
  global.panel.socketListening(this, 'getAlias', this.sendAliases)
  global.panel.socketListening(this, 'deleteAlias', this.deleteAlias)
  global.panel.socketListening(this, 'createAlias', this.createAlias)
}

Alias.prototype.sendAliases = function (self, socket) {
  global.botDB.find({$where: function () { return this._id.startsWith('alias') }}, function (err, docs) {
    if (err) { log.error(err) }
    socket.emit('Alias', docs)
  })
}

Alias.prototype.deleteAlias = function (self, socket, data) {
  self.remove(self, null, data)
  self.sendAliases(self, socket)
}

Alias.prototype.createAlias = function (self, socket, data) {
  self.add(self, null, data.command + ' ' + data.value)
  self.sendAliases(self, socket)
}

Alias.prototype.help = function (self, sender) {
  global.commons.sendMessage(global.translate('core.usage') + ': !alias add <command> <alias> | !alias remove <alias> | !alias list', sender)
}

Alias.prototype.add = function (self, sender, text) {
  try {
    var parsed = text.match(/^(\w+) (\w+)$/)
    global.commons.insertIfNotExists({__id: 'alias_' + parsed[2], _alias: parsed[2], command: parsed[1], success: 'alias.success.add', error: 'alias.failed.add'})
  } catch (e) {
    global.commons.sendMessage(global.translate('alias.failed.parse'), sender)
  }
}

Alias.prototype.list = function (self, sender, text) {
  var parsed = text.match(/^(\w+)$/)
  if (_.isNull(parsed)) {
    global.botDB.find({$where: function () { return this._id.startsWith('alias') }}, function (err, docs) {
      if (err) { log.error(err) }
      var list = []
      docs.forEach(function (e, i, ar) { list.push('!' + e.alias) })
      var output = (docs.length === 0 ? global.translate('alias.failed.list') : global.translate('alias.success.list') + ': ' + list.join(', '))
      global.commons.sendMessage(output, sender)
    })
  } else global.commons.sendMessage(global.translate('alias.failed.parse'), sender)
}

Alias.prototype.remove = function (self, sender, text) {
  try {
    var parsed = text.match(/^(\w+)$/)
    global.commons.remove({__id: 'alias_' + parsed[1], success: 'alias.success.remove', error: 'alias.failed.remove'})
  } catch (e) {
    global.commons.sendMessage(global.translate('alias.failed.parse'), sender)
  }
}

Alias.prototype.parse = function (self, id, sender, text) {
  try {
    global.botDB.findOne({$where: function () { return this._id.startsWith('alias_') && text.startsWith('!' + this.alias) && text.trim().length === this.alias.length + 1 }}, function (err, item) {
      if (err) log.error(err)
      if (!_.isNull(item)) {
        global.parser.parse(sender, text.replace('!' + item.alias, '!' + item.command))
        global.parser.lineParsed--
      }
      global.updateQueue(id, _.isNull(item))
    })
  } catch (e) {
    global.updateQueue(id, true)
  }
}

module.exports = new Alias()

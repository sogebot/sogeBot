'use strict'

// 3rdparty libraries
var _ = require('lodash')

// bot libraries
var constants = require('../constants')
var log = global.log

function Alias () {
  this.alias = []
  if (global.commons.isSystemEnabled(this)) {
    global.parser.register(this, '!alias add', this.add, constants.OWNER_ONLY)
    global.parser.register(this, '!alias list', this.list, constants.OWNER_ONLY)
    global.parser.register(this, '!alias remove', this.remove, constants.OWNER_ONLY)
    global.parser.register(this, '!alias', this.help, constants.OWNER_ONLY)

    global.parser.registerHelper('!alias')

    global.parser.registerParser(this, 'alias', this.parse, constants.VIEWERS)

    global.watcher.watch(this, 'alias', this._save)
    this._update(this)

    this.webPanel()
  }
}

Alias.prototype._update = function (self) {
  global.botDB.findOne({ _id: 'alias' }, function (err, item) {
    if (err) return log.error(err)
    if (_.isNull(item)) return

    self.alias = item.alias
  })
}

Alias.prototype._save = function (self) {
  var alias = {
    alias: self.alias
  }
  global.botDB.update({ _id: 'alias' }, { $set: alias }, { upsert: true })
}

Alias.prototype.webPanel = function () {
  global.panel.addMenu({category: 'manage', name: 'Alias', id: 'alias'})
  global.panel.socketListening(this, 'getAlias', this.sendAliases)
  global.panel.socketListening(this, 'deleteAlias', this.deleteAlias)
  global.panel.socketListening(this, 'createAlias', this.createAlias)
}

Alias.prototype.sendAliases = function (self, socket) {
  socket.emit('Alias', self.alias)
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
    let parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+) ([\u0500-\u052F\u0400-\u04FF\w]+)$/)
    let data = {
      alias: parsed[2],
      command: parsed[1]
    }
    // check if alias is already created
    var unique = true
    _.each(self.alias, function (alias) {
      if (!unique) return
      if (alias.alias === data.alias) unique = false
    })

    if (unique) self.alias.push(data)
    global.commons.sendMessage(global.translate(unique ? 'alias.success.add' : 'alias.failed.add'), sender)
  } catch (e) {
    global.commons.sendMessage(global.translate('alias.failed.parse'), sender)
  }
}

Alias.prototype.list = function (self, sender, text) {
  var aliases = []
  _.each(self.alias, function (element) { aliases.push('!' + element.alias) })
  var output = (aliases.length === 0 ? global.translate('alias.failed.list') : global.translate('alias.success.list') + ': ' + aliases.join(', '))
  global.commons.sendMessage(output, sender)
}

Alias.prototype.remove = function (self, sender, text) {
  try {
    let alias = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+)$/)[1]

    var removed = false
    self.alias.forEach(function (element, key) {
      if (element.alias === alias) {
        removed = true
        self.alias.splice(key, 1)
      }
    }, this)
    global.commons.sendMessage(global.translate(removed ? 'alias.success.remove' : 'alias.failed.remove'), sender)
  } catch (e) {
    global.commons.sendMessage(global.translate('alias.failed.parse'), sender)
  }
}

Alias.prototype.parse = function (self, id, sender, text) {
  try {
    var parsed = text.match(/^!([\u0500-\u052F\u0400-\u04FF\w]+) ?(.*)$/)
    var cmd = parsed[1]

    var found = false
    _.each(self.alias, function (alias) {
      if (found) return
      if (alias.alias === cmd) {
        found = true
        global.parser.parse(sender, text.replace('!' + cmd, '!' + alias.command))
        global.parser.lineParsed--
      }
    })
    global.updateQueue(id, true)
  } catch (e) {
    global.updateQueue(id, true)
  }
}

module.exports = new Alias()

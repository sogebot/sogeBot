'use strict'

// 3rdparty libraries
var _ = require('lodash')

// bot libraries
var constants = require('../constants')

const ERROR_DOESNT_EXISTS = '1'

/*
 * !alias                            - gets an info about alias usage
 * !alias add ![cmd] ![alias]        - add alias for specified command
 * !alias remove ![alias]            - remove specified alias
 * !alias toggle ![alias]            - enable/disable specified alias
 * !alias toggle-visibility ![alias] - enable/disable specified alias
 * !alias list                       - get alias list
 */

function Alias () {
  if (global.commons.isSystemEnabled(this)) {
    global.parser.register(this, '!alias add', this.add, constants.OWNER_ONLY)
    global.parser.register(this, '!alias list', this.list, constants.OWNER_ONLY)
    global.parser.register(this, '!alias remove', this.remove, constants.OWNER_ONLY)
    global.parser.register(this, '!alias toggle-visibility', this.visible, constants.OWNER_ONLY)
    global.parser.register(this, '!alias toggle', this.toggle, constants.OWNER_ONLY)
    global.parser.register(this, '!alias', this.help, constants.OWNER_ONLY)

    global.parser.registerHelper('!alias')

    this.register(this)

    this.webPanel()
  }
}

Alias.prototype.register = async function (self) {
  let alias = await global.db.engine.find('alias')
  _.each(alias, function (o) { global.parser.register(self, '!' + o.alias, self.run, constants.VIEWERS) })
}

Alias.prototype.webPanel = function () {
  global.panel.addMenu({category: 'manage', name: 'aliases', id: 'alias'})
  global.panel.socketListening(this, 'alias.get', this.sendAliases)
  global.panel.socketListening(this, 'alias.delete', this.deleteAlias)
  global.panel.socketListening(this, 'alias.create', this.createAlias)
  global.panel.socketListening(this, 'alias.toggle', this.toggleAlias)
  global.panel.socketListening(this, 'alias.toggle.visibility', this.toggleVisibilityAlias)
  global.panel.socketListening(this, 'alias.edit', this.editAlias)
}

Alias.prototype.sendAliases = async function (self, socket) {
  socket.emit('alias', await global.db.engine.find('alias'))
}

Alias.prototype.deleteAlias = function (self, socket, data) {
  self.remove(self, null, '!' + data)
  self.sendAliases(self, socket)
}

Alias.prototype.toggleAlias = function (self, socket, data) {
  self.toggle(self, null, '!' + data)
  self.sendAliases(self, socket)
}

Alias.prototype.toggleVisibilityAlias = function (self, socket, data) {
  self.visible(self, null, '!' + data)
  self.sendAliases(self, socket)
}

Alias.prototype.createAlias = function (self, socket, data) {
  if (data.command.startsWith('!')) data.command = data.command.replace('!', '')
  if (data.value.startsWith('!')) data.value = data.value.replace('!', '')
  self.add(self, null, '!' + data.command + ' !' + data.value)
  self.sendAliases(self, socket)
}

Alias.prototype.editAlias = async function (self, socket, data) {
  if (data.value.length === 0) self.remove(self, null, '!' + data.id)
  else {
    if (data.value.startsWith('!')) data.value = data.value.replace('!', '')
    await global.db.engine.update('alias', { alias: data.id }, { command: data.value })
  }
  self.sendAliases(self, socket)
}

Alias.prototype.help = function (self, sender) {
  global.commons.sendMessage(global.translate('core.usage') + ': !alias add <!command> <!alias> | !alias remove <!alias> | !alias list | !alias toggle <!alias> | !alias toggle-visibility <!alias>', sender)
}

Alias.prototype.add = function (self, sender, text) {
  try {
    let parsed = text.match(/^!([\u0500-\u052F\u0400-\u04FF\w\S ]+) !([\u0500-\u052F\u0400-\u04FF\w ]+)$/)
    let alias = {
      alias: parsed[2],
      command: parsed[1],
      enabled: true,
      visible: true
    }

    if (global.parser.isRegistered(alias.alias)) {
      global.commons.sendMessage(global.translate('core.isRegistered').replace(/\$keyword/g, '!' + alias.alias), sender)
      return
    }

    global.db.engine.update('alias', { alias: alias.alias }, alias)
    self.register(self)
    global.commons.sendMessage(alias.success.add, sender)
  } catch (e) {
    global.commons.sendMessage(global.translate('alias.failed.parse'), sender)
  }
}

Alias.prototype.run = async function (self, sender, msg, fullMsg) {
  let parsed = fullMsg.match(/^!([\u0500-\u052F\u0400-\u04FF\w]+) ?(.*)$/)
  let alias = await global.db.engine.findOne('alias', { alias: parsed[1].toLowerCase(), enabled: true })
  try {
    global.parser.parse(sender, fullMsg.replace(parsed[1], alias.command), true)
  } catch (e) {
    global.parser.unregister(fullMsg)
  }
}

Alias.prototype.list = async function (self, sender, text) {
  let alias = await global.db.engine.find('alias', { visible: true })
  var output = (alias.length === 0 ? global.translate('alias.failed.list') : global.translate('alias.success.list') + ': !' + _.map(alias, 'alias').join(', !'))
  global.commons.sendMessage(output, sender)
}

Alias.prototype.toggle = async function (self, sender, text) {
  try {
    const id = text.match(/^!([\u0500-\u052F\u0400-\u04FF\w ]+)$/)[1]
    const alias = await global.db.engine.findOne('alias', { alias: id })
    if (_.isEmpty(alias)) {
      global.commons.sendMessage(global.translate('alias.failed.toggle')
        .replace(/\$alias/g, id), sender)
      return
    }

    await global.db.engine.update('alias', { alias: id }, { enabled: !alias.enabled })
    self.register(self)

    global.commons.sendMessage(global.translate(alias.enabled ? 'alias.success.enabled' : 'alias.success.disabled')
      .replace(/\$alias/g, alias.alias), sender)
  } catch (e) {
    global.commons.sendMessage(global.translate('alias.failed.parse'), sender)
  }
}

Alias.prototype.visible = async function (self, sender, text) {
  try {
    const id = text.match(/^!([\u0500-\u052F\u0400-\u04FF\w ]+)$/)[1]
    const alias = await global.db.engine.findOne('alias', { alias: id })
    if (_.isEmpty(alias)) {
      global.commons.sendMessage(global.translate('alias.failed.visible')
        .replace(/\$alias/g, id), sender)
      return
    }

    await global.db.engine.update('alias', { alias: id }, { visible: !alias.visible })

    global.commons.sendMessage(global.translate(alias.visible ? 'alias.success.visible' : 'alias.success.invisible')
      .replace(/\$alias/g, alias.alias), sender)
  } catch (e) {
    global.commons.sendMessage(global.translate('alias.failed.parse'), sender)
  }
}

Alias.prototype.remove = async function (self, sender, text) {
  try {
    const id = text.match(/^!([\u0500-\u052F\u0400-\u04FF\w ]+)$/)[1]
    let removed = await global.db.engine.remove('alias', { alias: id })
    if (!removed) throw Error(ERROR_DOESNT_EXISTS)
    global.parser.unregister(text)
    global.commons.sendMessage(global.translate('alias.success.remove'), sender)
  } catch (e) {
    switch (e.message) {
      case ERROR_DOESNT_EXISTS:
        global.commons.sendMessage(global.translate('alias.failed.remove'), sender)
        break
      default:
        global.commons.sendMessage(global.translate('alias.failed.parse'), sender)
    }
  }
}

module.exports = new Alias()

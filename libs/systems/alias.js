'use strict'

// 3rdparty libraries
const _ = require('lodash')
const debug = require('debug')('systems:alias')

// bot libraries
var constants = require('../constants')

/*
 * !alias                            - gets an info about alias usage
 * !alias add ![alias] ![cmd]        - add alias for specified command
 * !alias edit ![alias] ![cmd]        - add alias for specified command
 * !alias remove ![alias]            - remove specified alias
 * !alias toggle ![alias]            - enable/disable specified alias
 * !alias toggle-visibility ![alias] - enable/disable specified alias
 * !alias list                       - get alias list
 */

class Alias {
  constructor () {
    if (global.commons.isSystemEnabled(this)) {
      global.parser.register(this, '!alias add', this.add, constants.OWNER_ONLY)
      global.parser.register(this, '!alias edit', this.edit, constants.OWNER_ONLY)
      global.parser.register(this, '!alias list', this.list, constants.OWNER_ONLY)
      global.parser.register(this, '!alias remove', this.remove, constants.OWNER_ONLY)
      global.parser.register(this, '!alias toggle-visibility', this.visible, constants.OWNER_ONLY)
      global.parser.register(this, '!alias toggle', this.toggle, constants.OWNER_ONLY)
      global.parser.register(this, '!alias', this.help, constants.OWNER_ONLY)

      global.parser.registerHelper('!alias')

      global.panel.addMenu({category: 'manage', name: 'aliases', id: 'alias'})
      global.panel.registerSockets({
        self: this,
        expose: ['add', 'remove', 'visible', 'toggle', 'editCommand', 'editAlias', 'send'],
        finally: this.send
      })

      this.register(this)
    }
  }

  async register (self) {
    let aliases = await global.db.engine.find('alias')
    for (let alias of aliases) {
      global.parser.register(self, '!' + alias.alias, self.run, constants.VIEWERS)
    }
  }

  async send (self, socket) {
    socket.emit('alias', await global.db.engine.find('alias'))
  }

  async editCommand (self, socket, data) {
    if (data.value.length === 0) await self.remove(self, null, '!' + data.id)
    else {
      if (data.value.startsWith('!')) data.value = data.value.replace('!', '')
      await global.db.engine.update('alias', { alias: data.id }, { command: data.value })
    }
  }

  async editAlias (self, socket, data) {
    if (data.value.length === 0) await self.remove(self, null, '!' + data.id)
    else {
      if (data.value.startsWith('!')) data.value = data.value.replace('!', '')
      await global.db.engine.update('alias', { alias: data.id }, { alias: data.value })

      global.parser.unregister(data.id)
      global.parser.register(self, '!' + data.value, self.run, constants.VIEWERS)
    }
  }

  help (self, sender) {
    global.commons.sendMessage(global.translate('core.usage') + ': !alias add <!alias> <!command> | !alias edit <!alias> <!command> | !alias remove <!alias> | !alias list | !alias toggle <!alias> | !alias toggle-visibility <!alias>', sender)
  }

  async edit (self, sender, text) {
    debug('edit(%j, %j, %j)', self, sender, text)
    let parsed = text.match(/^!([\u0500-\u052F\u0400-\u04FF\w\S ]+) !([\u0500-\u052F\u0400-\u04FF\w ]+)$/)

    if (_.isNil(parsed)) {
      let message = global.commons.prepare('alias.alias-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    const alias = parsed[1]
    const command = parsed[2]

    let item = await global.db.engine.findOne('alias', { alias: alias })
    if (_.isEmpty(item)) {
      let message = global.commons.prepare('alias.alias-was-not-found', { alias: alias })
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    await global.db.engine.update('alias', { alias: alias }, { command: command })

    let message = global.commons.prepare('alias.alias-was-edited', { alias: alias, command: command })
    debug(message); global.commons.sendMessage(message, sender)
  }

  async add (self, sender, text) {
    debug('add(%j, %j, %j)', self, sender, text)
    let parsed = text.match(/^!([\u0500-\u052F\u0400-\u04FF\w ]+) !([\u0500-\u052F\u0400-\u04FF\w\S ]+)$/)

    if (_.isNil(parsed)) {
      let message = global.commons.prepare('alias.alias-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    let alias = {
      alias: parsed[1],
      command: parsed[2],
      enabled: true,
      visible: true
    }

    if (global.parser.isRegistered(alias.alias)) {
      let message = global.commons.prepare('core.isRegistered', { keyword: alias.alias })
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    await global.db.engine.insert('alias', alias)
    await self.register(self)

    let message = global.commons.prepare('alias.alias-was-added', alias)
    debug(message); global.commons.sendMessage(message, sender)
  }

  async run (self, sender, msg, fullMsg) {
    let parsed = fullMsg.match(/^!([\u0500-\u052F\u0400-\u04FF\w]+) ?(.*)$/)
    let alias = await global.db.engine.findOne('alias', { alias: parsed[1].toLowerCase(), enabled: true })

    if (!_.isEmpty(alias)) global.parser.parse(sender, fullMsg.replace(parsed[1], alias.command), true)
    else global.parser.unregister(fullMsg)
  }

  async list (self, sender) {
    debug('list(%j, %j)', self, sender)
    let alias = await global.db.engine.find('alias', { visible: true })
    var output = (alias.length === 0 ? global.translate('alias.list-is-empty') : global.translate('alias.list-is-not-empty').replace(/\$list/g, '!' + (_.map(_.orderBy(alias, 'alias'), 'alias')).join(', !')))
    debug(output); global.commons.sendMessage(output, sender)
  }

  async toggle (self, sender, text) {
    debug('toggle(%j, %j, %j)', self, sender, text)
    let id = text.match(/^!([\u0500-\u052F\u0400-\u04FF\w ]+)$/)

    if (_.isNil(id)) {
      let message = global.commons.prepare('alias.alias-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }
    id = id[1]
    const alias = await global.db.engine.findOne('alias', { alias: id })
    if (_.isEmpty(alias)) {
      let message = global.commons.prepare('alias.alias-was-not-found', { alias: id })
      debug(message); global.commons.sendMessage(message, sender)
      return
    }

    await global.db.engine.update('alias', { alias: id }, { enabled: !alias.enabled })
    self.register(self)

    let message = global.commons.prepare(!alias.enabled ? 'alias.alias-was-enabled' : 'alias.alias-was-disabled', { alias: id })
    debug(message); global.commons.sendMessage(message, sender)
  }

  async visible (self, sender, text) {
    let id = text.match(/^!([\u0500-\u052F\u0400-\u04FF\w ]+)$/)

    if (_.isNil(id)) {
      let message = global.commons.prepare('alias.alias-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }
    id = id[1]

    const alias = await global.db.engine.findOne('alias', { alias: id })
    if (_.isEmpty(alias)) {
      let message = global.commons.prepare('alias.alias-was-not-found', { alias: id })
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    await global.db.engine.update('alias', { alias: id }, { visible: !alias.visible })

    let message = global.commons.prepare(!alias.visible ? 'alias.alias-was-exposed' : 'alias.alias-was-concealed', alias)
    debug(message); global.commons.sendMessage(message, sender)
  }

  async remove (self, sender, text) {
    debug('remove(%j, %j, %j)', self, sender, text)
    let id = text.match(/^!([\u0500-\u052F\u0400-\u04FF\w ]+)$/)
    if (_.isNil(id)) {
      let message = global.commons.prepare('alias.alias-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }
    id = id[1]

    let removed = await global.db.engine.remove('alias', { alias: id })
    if (!removed) {
      let message = global.commons.prepare('alias.alias-was-not-found', { alias: id })
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }
    global.parser.unregister(text)

    let message = global.commons.prepare('alias.alias-was-removed', { alias: id })
    debug(message); global.commons.sendMessage(message, sender)
  }
}

module.exports = new Alias()

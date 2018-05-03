'use strict'

// 3rdparty libraries
const _ = require('lodash')
const debug = require('debug')
const XRegExp = require('xregexp')

// bot libraries
const Parser = require('../parser')
const constants = require('../constants')

/*
 * !alias                                               - gets an info about alias usage
 * !alias add owner|mod|regular|viewer ![alias] ![cmd]  - add alias for specified command
 * !alias edit owner|mod|regular|viewer ![alias] ![cmd] - add alias for specified command
 * !alias remove ![alias]                               - remove specified alias
 * !alias toggle ![alias]                               - enable/disable specified alias
 * !alias toggle-visibility ![alias]                    - enable/disable specified alias
 * !alias list                                          - get alias list
 */

class Alias {
  constructor () {
    if (require('cluster').isMaster && global.commons.isSystemEnabled(this)) {
      global.panel.addMenu({category: 'manage', name: 'aliases', id: 'alias'})
      global.panel.registerSockets({
        self: this,
        expose: ['add', 'remove', 'visible', 'toggle', 'togglePermission', 'editCommand', 'editAlias', 'send'],
        finally: this.send
      })
    }
  }

  commands () {
    if (global.commons.isSystemEnabled('alias')) {
      return [
        { command: '!alias add', fnc: this.add, permission: constants.OWNER_ONLY, this: this },
        { command: '!alias edit', fnc: this.edit, permission: constants.OWNER_ONLY, this: this },
        { command: '!alias list', fnc: this.list, permission: constants.OWNER_ONLY, this: this },
        { command: '!alias remove', fnc: this.remove, permission: constants.OWNER_ONLY, this: this },
        { command: '!alias toggle-visibility', fnc: this.visibility, permission: constants.OWNER_ONLY, this: this },
        { command: '!alias toggle', fnc: this.toggle, permission: constants.OWNER_ONLY, this: this },
        { command: '!alias', fnc: this.help, permission: constants.OWNER_ONLY, isHelper: true, this: this }
      ]
    } else return []
  }

  parsers () {
    if (global.commons.isSystemEnabled('alias')) {
      return [
        { name: 'alias', fnc: this.run, priority: constants.LOW, permission: constants.VIEWERS, this: this }
      ]
    } else return []
  }

  async run (self, sender, msg) {
    const d = debug('alias:run')
    const parser = new Parser()
    var alias

    // is it an command?
    if (!msg.trim().startsWith('!')) return true

    let cmdArray = msg.toLowerCase().split(' ')
    for (let i in msg.toLowerCase().split(' ')) { // search for correct alias
      d(`${i} - Searching for ${cmdArray.join(' ')} in aliases`)
      alias = await global.db.engine.findOne('alias', { alias: cmdArray.join(' ').replace('!', ''), enabled: true })
      d(alias)
      if (!_.isEmpty(alias)) break
      cmdArray.pop() // remove last array item if not found
    }
    if (_.isEmpty(alias)) return true // no alias was found - return
    d('Alias found: %j', alias)

    let replace = new RegExp(`!${alias.alias}`, 'i')
    cmdArray = msg.replace(replace, `!${alias.command}`).split(' ')
    let tryingToBypass = false

    for (let i in msg.split(' ')) { // search if it is not trying to bypass permissions
      if (cmdArray.length === alias.command.split(' ').length) break // command is correct (have same number of parameters as command)
      d(`${i} - Searching if ${cmdArray.join(' ')} is registered as command`)

      const parsedCmd = await parser.find(cmdArray.join(' '))
      const isRegistered = !_.isNil(parsedCmd) && parsedCmd.command.split(' ').length === cmdArray.length
      d(`Is registered: %s`, isRegistered)

      if (isRegistered) {
        tryingToBypass = true
        break
      }
      cmdArray.pop() // remove last array item if not found
    }
    d(`Is trying to bypass command permission: %s`, tryingToBypass)

    d('Alias: %s', replace)
    d('Command: %s', `!${alias.command}`)
    d('Running: %s', msg.replace(replace, `!${alias.command}`))
    if (!tryingToBypass) {
      debug('Checking if permissions are ok')
      let [isRegular, isMod, isOwner] = await Promise.all([
        global.commons.isRegular(sender),
        global.commons.isMod(sender),
        global.commons.isOwner(sender)
      ])
      debug('isRegular: %s', isRegular)
      debug('isMod: %s', isMod)
      debug('isOwner: %s', isOwner)

      // Don't run alias if its same as command e.g. alias !me -> command !me
      if (alias.command === alias.alias) {
        global.log.warning(`Cannot run alias !${alias.alias}, because it exec !${alias.command}`)
      } else if (alias.permission === constants.VIEWERS ||
        (alias.permission === constants.REGULAR && (isRegular || isMod || isOwner)) ||
        (alias.permission === constants.MODS && (isMod || isOwner)) ||
        (alias.permission === constants.OWNER_ONLY && isOwner)) {
        global.log.process({ type: 'parse', sender: sender, message: msg.replace(replace, `!${alias.command}`) })
        process.send({ type: 'parse', sender: sender, message: msg.replace(replace, `!${alias.command}`) })
      }
    }
    return true
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
    global.commons.sendMessage(global.translate('core.usage') + ': !alias add owner|mod|regular|viewer <!alias> <!command> | !alias edit owner|mod|regular|viewer <!alias> <!command> | !alias remove <!alias> | !alias list | !alias toggle <!alias> | !alias toggle-visibility <!alias>', sender)
  }

  async edit (self, sender, text) {
    debug('edit(%j, %j, %j)', self, sender, text)
    const match = XRegExp.exec(text, constants.ALIAS_REGEXP)

    if (_.isNil(match)) {
      let message = await global.commons.prepare('alias.alias-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    let item = await global.db.engine.findOne('alias', { alias: match.alias })
    if (_.isEmpty(item)) {
      let message = await global.commons.prepare('alias.alias-was-not-found', { alias: match.alias })
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    let permission = constants.VIEWERS
    switch (match.permission) {
      case 'owner':
        permission = constants.OWNER_ONLY
        break
      case 'mod':
        permission = constants.MODS
        break
      case 'regular':
        permission = constants.REGULAR
        break
    }

    await global.db.engine.update('alias', { alias: match.alias }, { command: match.command, permission: permission })

    let message = await global.commons.prepare('alias.alias-was-edited', { alias: match.alias, command: match.command })
    debug(message); global.commons.sendMessage(message, sender)
  }

  async add (self, sender, text) {
    debug('add(%j, %j, %j)', self, sender, text)
    const match = XRegExp.exec(text, constants.ALIAS_REGEXP)

    if (_.isNil(match)) {
      let message = await global.commons.prepare('alias.alias-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    let permission = constants.VIEWERS
    switch (match.permission) {
      case 'owner':
        permission = constants.OWNER_ONLY
        break
      case 'mod':
        permission = constants.MODS
        break
      case 'regular':
        permission = constants.REGULAR
        break
    }

    let alias = {
      alias: match.alias,
      command: match.command,
      enabled: true,
      visible: true,
      permission: permission
    }

    await global.db.engine.insert('alias', alias)
    let message = await global.commons.prepare('alias.alias-was-added', alias)
    debug(message); global.commons.sendMessage(message, sender)
  }

  async list (self, sender) {
    debug('list(%j, %j)', self, sender)
    let alias = await global.db.engine.find('alias', { visible: true })
    var output = (alias.length === 0 ? global.translate('alias.list-is-empty') : global.translate('alias.list-is-not-empty').replace(/\$list/g, '!' + (_.map(_.orderBy(alias, 'alias'), 'alias')).join(', !')))
    debug(output); global.commons.sendMessage(output, sender)
  }

  async togglePermission (self, sender, text) {
    debug('togglePermission(%j,%j,%j)', self, sender, text)
    const alias = await global.db.engine.findOne('alias', { alias: text.replace('!', '') })
    if (!_.isEmpty(alias)) {
      await global.db.engine.update('alias', { _id: alias._id.toString() }, { permission: alias.permission === 3 ? 0 : ++alias.permission })
    }
  }

  async toggle (self, sender, text) {
    debug('toggle(%j, %j, %j)', self, sender, text)
    const match = XRegExp.exec(text, constants.COMMAND_REGEXP_WITH_SPACES)

    if (_.isNil(match)) {
      let message = await global.commons.prepare('alias.alias-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }
    const alias = await global.db.engine.findOne('alias', { alias: match.command })
    if (_.isEmpty(alias)) {
      let message = await global.commons.prepare('alias.alias-was-not-found', { alias: match.command })
      debug(message); global.commons.sendMessage(message, sender)
      return
    }

    await global.db.engine.update('alias', { alias: match.command }, { enabled: !alias.enabled })
    let message = await global.commons.prepare(!alias.enabled ? 'alias.alias-was-enabled' : 'alias.alias-was-disabled', { alias: match.command })
    debug(message); global.commons.sendMessage(message, sender)
  }

  async visible (self, sender, text) {
    const match = XRegExp.exec(text, constants.COMMAND_REGEXP_WITH_SPACES)

    if (_.isNil(match)) {
      let message = await global.commons.prepare('alias.alias-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    const alias = await global.db.engine.findOne('alias', { alias: match.command })
    if (_.isEmpty(alias)) {
      let message = await global.commons.prepare('alias.alias-was-not-found', { alias: match.command })
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    await global.db.engine.update('alias', { alias: match.command }, { visible: !alias.visible })

    let message = await global.commons.prepare(!alias.visible ? 'alias.alias-was-exposed' : 'alias.alias-was-concealed', alias)
    debug(message); global.commons.sendMessage(message, sender)
  }

  async remove (self, sender, text) {
    debug('remove(%j, %j, %j)', self, sender, text)
    const match = XRegExp.exec(text, constants.COMMAND_REGEXP_WITH_SPACES)
    if (_.isNil(match)) {
      let message = await global.commons.prepare('alias.alias-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    let removed = await global.db.engine.remove('alias', { alias: match.command })
    if (!removed) {
      let message = await global.commons.prepare('alias.alias-was-not-found', { alias: match.command })
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    let message = await global.commons.prepare('alias.alias-was-removed', { alias: match.command })
    debug(message); global.commons.sendMessage(message, sender)
  }
}

module.exports = new Alias()

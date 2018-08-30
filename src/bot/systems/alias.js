'use strict'

// 3rdparty libraries
const _ = require('lodash')
const debug = require('debug')
const XRegExp = require('xregexp')

// bot libraries
const Parser = require('../parser')
const constants = require('../constants')
const System = require('./_interface')

/*
 * !alias                                               - gets an info about alias usage
 * !alias add owner|mod|regular|viewer ![alias] ![cmd]  - add alias for specified command
 * !alias edit owner|mod|regular|viewer ![alias] ![cmd] - add alias for specified command
 * !alias remove ![alias]                               - remove specified alias
 * !alias toggle ![alias]                               - enable/disable specified alias
 * !alias toggle-visibility ![alias]                    - enable/disable specified alias
 * !alias list                                          - get alias list
 */

class Alias extends System {
  constructor () {
    const settings = {
      commands: [
        { name: '!alias add', permission: constants.OWNER_ONLY },
        { name: '!alias edit', permission: constants.OWNER_ONLY },
        { name: '!alias list', permission: constants.OWNER_ONLY },
        { name: '!alias remove', permission: constants.OWNER_ONLY },
        { name: '!alias toggle-visibility', permission: constants.OWNER_ONLY },
        { name: '!alias toggle', permission: constants.OWNER_ONLY },
        { name: '!alias', permission: constants.OWNER_ONLY }
      ],
      parsers: [
        { name: 'run', fireAndForget: true }
      ]
    }
    super({ settings })

    this.addMenu({ category: 'manage', name: 'alias', id: 'alias/list' })
    this.addMenu({ category: 'settings', name: 'systems', id: 'systems' })
  }

  sockets () {
    this.socket.on('connection', (socket) => {
      socket.on('alias', async (cb) => {
        cb(null, await global.db.engine.find(this.collection.data))
      })
      socket.on('alias.get', async (_id, cb) => {
        cb(null, await global.db.engine.findOne(this.collection.data, { _id }))
      })
      socket.on('alias.delete', async (_id, cb) => {
        await global.db.engine.remove(this.collection.data, { _id })
        cb(null)
      })
      socket.on('alias.update', async (aliases, cb) => {
        for (let alias of aliases) {
          const _id = alias._id; delete alias._id
          let aliasFromDb = alias
          if (_.isNil(_id)) aliasFromDb = await global.db.engine.insert(this.collection.data, alias)
          else await global.db.engine.update(this.collection.data, { _id }, alias)

          if (_.isFunction(cb)) cb(null, aliasFromDb)
        }
      })
    })
  }

  async run (opts) {
    const d = debug('alias:run')
    const parser = new Parser()
    var alias

    // is it an command?
    if (!opts.message.startsWith('!')) return true

    let cmdArray = opts.message.toLowerCase().split(' ')
    for (let i in opts.message.toLowerCase().split(' ')) { // search for correct alias
      d(`${i} - Searching for ${cmdArray.join(' ')} in aliases`)
      alias = await global.db.engine.findOne(this.collection.data, { alias: cmdArray.join(' '), enabled: true })
      d(alias)
      if (!_.isEmpty(alias)) break
      cmdArray.pop() // remove last array item if not found
    }
    if (_.isEmpty(alias)) return true // no alias was found - return
    d('Alias found: %j', alias)

    let replace = new RegExp(`${alias.alias}`, 'i')
    cmdArray = opts.message.replace(replace, `${alias.command}`).split(' ')
    let tryingToBypass = false

    for (let i in opts.message.split(' ')) { // search if it is not trying to bypass permissions
      if (cmdArray.length === alias.command.split(' ').length) break // command is correct (have same number of parameters as command)
      d(`${i} - Searching if ${cmdArray.join(' ')} is registered as command`)

      const parsedCmd = await parser.find(cmdArray.join(' '))
      const isRegistered = !_.isNil(parsedCmd) && parsedCmd.command.split(' ').length === cmdArray.length
      d('Is registered: %s', isRegistered)

      if (isRegistered) {
        tryingToBypass = true
        break
      }
      cmdArray.pop() // remove last array item if not found
    }
    d('Is trying to bypass command permission: %s', tryingToBypass)

    d('Alias: %s', replace)
    d('Command: %s', `${alias.command}`)
    d('Running: %s', opts.message.replace(replace, `${alias.command}`))
    if (!tryingToBypass) {
      debug('Checking if permissions are ok')
      let [isRegular, isMod, isOwner] = await Promise.all([
        global.commons.isRegular(opts.sender),
        global.commons.isMod(opts.sender),
        global.commons.isOwner(opts.sender)
      ])
      debug('isRegular: %s', isRegular)
      debug('isMod: %s', isMod)
      debug('isOwner: %s', isOwner)

      // Don't run alias if its same as command e.g. alias !me -> command !me
      if (alias.command === alias.alias) {
        global.log.warning(`Cannot run alias ${alias.alias}, because it exec ${alias.command}`)
      } else if (alias.permission === constants.VIEWERS ||
        (alias.permission === constants.REGULAR && (isRegular || isMod || isOwner)) ||
        (alias.permission === constants.MODS && (isMod || isOwner)) ||
        (alias.permission === constants.OWNER_ONLY && isOwner)) {
        global.log.process({ type: 'parse', sender: opts.sender, message: opts.message.replace(replace, `${alias.command}`) })
        process.send({ type: 'parse', sender: opts.sender, message: opts.message.replace(replace, `${alias.command}`) })
      }
    }
    return true
  }

  main (opts) {
    global.commons.sendMessage(global.translate('core.usage') + ': !alias add owner|mod|regular|viewer <!alias> <!command> | !alias edit owner|mod|regular|viewer <!alias> <!command> | !alias remove <!alias> | !alias list | !alias toggle <!alias> | !alias toggle-visibility <!alias>', opts.sender)
  }

  async edit (opts) {
    debug('edit(%j)', opts)
    const match = XRegExp.exec(opts.parameters, constants.ALIAS_REGEXP)

    if (_.isNil(match)) {
      let message = await global.commons.prepare('alias.alias-parse-failed')
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    let item = await global.db.engine.findOne(this.collection.data, { alias: match.alias })
    if (_.isEmpty(item)) {
      let message = await global.commons.prepare('alias.alias-was-not-found', { alias: match.alias })
      debug(message); global.commons.sendMessage(message, opts.sender)
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

    await global.db.engine.update(this.collection.data, { alias: match.alias }, { command: match.command, permission: permission })

    let message = await global.commons.prepare('alias.alias-was-edited', { alias: match.alias, command: match.command })
    debug(message); global.commons.sendMessage(message, opts.sender)
  }

  async add (opts) {
    const match = XRegExp.exec(opts.parameters, constants.ALIAS_REGEXP)

    if (_.isNil(match)) {
      let message = await global.commons.prepare('alias.alias-parse-failed')
      debug(message); global.commons.sendMessage(message, opts.sender)
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
    await global.db.engine.insert(this.collection.data, alias)
    let message = await global.commons.prepare('alias.alias-was-added', alias)
    debug(message); global.commons.sendMessage(message, opts.sender)
  }

  async list (opts) {
    let alias = await global.db.engine.find(this.collection.data, { visible: true })
    var output = (alias.length === 0 ? global.translate('alias.list-is-empty') : global.translate('alias.list-is-not-empty').replace(/\$list/g, (_.map(_.orderBy(alias, 'alias'), 'alias')).join(', ')))
    debug(output); global.commons.sendMessage(output, opts.sender)
  }

  async toggle (opts) {
    const match = XRegExp.exec(opts.parameters, constants.COMMAND_REGEXP_WITH_SPACES)

    if (_.isNil(match)) {
      let message = await global.commons.prepare('alias.alias-parse-failed')
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }
    const alias = await global.db.engine.findOne(this.collection.data, { alias: match.command })
    if (_.isEmpty(alias)) {
      let message = await global.commons.prepare('alias.alias-was-not-found', { alias: match.command })
      debug(message); global.commons.sendMessage(message, opts.sender)
      return
    }

    await global.db.engine.update(this.collection.data, { alias: match.command }, { enabled: !alias.enabled })
    let message = await global.commons.prepare(!alias.enabled ? 'alias.alias-was-enabled' : 'alias.alias-was-disabled', { alias: match.command })
    debug(message); global.commons.sendMessage(message, opts.sender)
  }

  async toggleVisibility (opts) {
    const match = XRegExp.exec(opts.parameters, constants.COMMAND_REGEXP_WITH_SPACES)

    if (_.isNil(match)) {
      let message = await global.commons.prepare('alias.alias-parse-failed')
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    const alias = await global.db.engine.findOne(this.collection.data, { alias: match.command })
    if (_.isEmpty(alias)) {
      let message = await global.commons.prepare('alias.alias-was-not-found', { alias: match.command })
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    await global.db.engine.update(this.collection.data, { alias: match.command }, { visible: !alias.visible })

    let message = await global.commons.prepare(!alias.visible ? 'alias.alias-was-exposed' : 'alias.alias-was-concealed', alias)
    debug(message); global.commons.sendMessage(message, opts.sender)
  }

  async remove (opts) {
    const match = XRegExp.exec(opts.parameters, constants.COMMAND_REGEXP_WITH_SPACES)
    if (_.isNil(match)) {
      let message = await global.commons.prepare('alias.alias-parse-failed')
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    let removed = await global.db.engine.remove(this.collection.data, { alias: match.command })
    if (!removed) {
      let message = await global.commons.prepare('alias.alias-was-not-found', { alias: match.command })
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    let message = await global.commons.prepare('alias.alias-was-removed', { alias: match.command })
    debug(message); global.commons.sendMessage(message, opts.sender)
  }
}

module.exports = new Alias()

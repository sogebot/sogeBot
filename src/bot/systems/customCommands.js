// @flow

'use strict'

// 3rdparty libraries
const _ = require('lodash')
const debug = require('debug')('systems:commands')
const XRegExp = require('xregexp')
const cluster = require('cluster')

// bot libraries
const constants = require('../constants')
const System = require('./_interface')
const Timeout = require('../timeout')

/*
 * !command                                                 - gets an info about command usage
 * !command add owner|mod|regular|viewer ![cmd] [response]  - add command with specified response
 * !command edit owner|mod|regular|viewer ![cmd] [response] - edit command with specified response
 * !command remove ![cmd]                                   - remove specified command
 * !command toggle ![cmd]                                   - enable/disable specified command
 * !command toggle-visibility ![cmd]                        - enable/disable specified command
 * !command list                                            - get commands list
 */

type Response = {
  _id?: string,
  order: number,
  response: string
}

type Command = {
  _id?: string,
  command: string,
  enabled: boolean,
  visible: boolean,
  responses?: Array<Response>,
  permission: number,
  count?: number
}

class CustomCommands extends System {
  constructor () {
    const settings = {
      commands: [
        { name: '!command add', permission: constants.OWNER_ONLY },
        { name: '!command edit', permission: constants.OWNER_ONLY },
        { name: '!command list', permission: constants.OWNER_ONLY },
        { name: '!command remove', permission: constants.OWNER_ONLY },
        { name: '!command toggle-visibility', permission: constants.OWNER_ONLY },
        { name: '!command toggle', permission: constants.OWNER_ONLY },
        { name: '!command', permission: constants.OWNER_ONLY, isHelper: true }
      ],
      parsers: [
        { name: 'run', priority: constants.LOW, fireAndForget: true }
      ]
    }
    super({ settings })

    this.addMenu({ category: 'manage', name: 'customcommands', id: 'customcommands/list' })
    if (cluster.isMaster) this.compactCountDb()
  }

  sockets () {
    this.socket.on('connection', (socket) => {
      socket.on('find.commands', async (opts, cb) => {
        opts.collection = opts.collection || 'data'
        if (opts.collection.startsWith('_')) {
          opts.collection = opts.collection.replace('_', '')
        } else opts.collection = this.collection[opts.collection]

        opts.where = opts.where || {}

        let items: Array<Command> = await global.db.engine.find(opts.collection, opts.where)
        for (let i of items) {
          i.count = await this.getCountOf(i.command)
          i.responses = await global.db.engine.find(this.collection.responses, { cid: String(i._id) })
        }
        if (_.isFunction(cb)) cb(null, items)
      })
      socket.on('findOne.command', async (opts, cb) => {
        opts.collection = opts.collection || 'data'
        if (opts.collection.startsWith('_')) {
          opts.collection = opts.collection.replace('_', '')
        } else opts.collection = this.collection[opts.collection]

        opts.where = opts.where || {}

        let item: Command = await global.db.engine.findOne(opts.collection, opts.where)
        item.count = await this.getCountOf(item.command)
        item.responses = await global.db.engine.find(this.collection.responses, { cid: String(item._id) })
        if (_.isFunction(cb)) cb(null, item)
      })
      socket.on('update.command', async (opts, cb) => {
        opts.collection = opts.collection || 'data'
        if (opts.collection.startsWith('_')) {
          opts.collection = opts.collection.replace('_', '')
        } else opts.collection = this.collection[opts.collection]

        if (opts.items) {
          for (let item of opts.items) {
            const _id = item._id; delete item._id
            const count = item.count; delete item.count
            const responses = item.responses; delete item.responses

            let itemFromDb = item
            if (_.isNil(_id)) itemFromDb = await global.db.engine.insert(opts.collection, item)
            else await global.db.engine.update(opts.collection, { _id }, item)

            // set command count
            const cCount = await this.getCountOf(itemFromDb.command)
            if (count !== cCount && count === 0) {
              // we assume its always reset (set to 0)
              await global.db.engine.insert(this.collection.count, { command: itemFromDb.command, count: -cCount })
            }

            // update responses
            for (let r of responses) {
              if (!r.cid) r.cid = _id

              if (!r._id) await global.db.engine.insert(this.collection.responses, r)
              else {
                const _id = String(r._id); delete r._id
                await global.db.engine.update(this.collection.responses, { _id }, r)
              }
            }

            if (_.isFunction(cb)) cb(null, itemFromDb)
          }
        } else {
          if (_.isFunction(cb)) cb(null, [])
        }
      })
    })
  }

  main (opts: Object) {
    global.commons.sendMessage(global.translate('core.usage') + ': !command add owner|mod|regular|viewer <!command> <response> | !command edit owner|mod|regular|viewer <!command> <response> | !command remove <!command> | !command list', opts.sender)
  }

  async edit (opts: Object) {
    const match = XRegExp.exec(opts.parameters, constants.COMMAND_REGEXP_WITH_RESPONSE)

    if (_.isNil(match)) {
      let message = await global.commons.prepare('customcmds.commands-parse-failed')
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    let item = await global.db.engine.findOne(this.collection.data, { command: match.command })
    if (_.isEmpty(item)) {
      let message = await global.commons.prepare('customcmds.command-was-not-found', { command: match.command })
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

    await global.db.engine.update(this.collection.data, { command: match.command }, { response: match.response, permision: permission })
    let message = await global.commons.prepare('customcmds.command-was-edited', { command: match.command, response: match.response })
    debug(message); global.commons.sendMessage(message, opts.sender)
  }

  async add (opts: Object) {
    const match = XRegExp.exec(opts.parameters, constants.COMMAND_REGEXP_WITH_RESPONSE)

    if (_.isNil(match)) {
      let message = await global.commons.prepare('customcmds.commands-parse-failed')
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    debug(match)
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
    let command = { command: match.command, response: match.response, enabled: true, visible: true, permission: permission }

    await global.db.engine.update(this.collection.data, { command: command.command }, command)
    let message = await global.commons.prepare('customcmds.command-was-added', { command: match.command })
    debug(message); global.commons.sendMessage(message, opts.sender)
  }

  async run (opts: Object) {
    if (!opts.message.startsWith('!')) return true // do nothing if it is not a command

    var command: $Shape<Command> = {}
    let cmdArray = opts.message.toLowerCase().split(' ')
    for (let i in opts.message.toLowerCase().split(' ')) { // search for correct command
      debug(`${i} - Searching for ${cmdArray.join(' ')} in commands`)
      command = await global.db.engine.findOne(this.collection.data, { command: cmdArray.join(' '), enabled: true })
      debug(command)
      if (!_.isEmpty(command)) break
      cmdArray.pop() // remove last array item if not found
    }
    if (Object.keys(command) === 0) return true // no command was found - return
    debug('Command found: %j', command)

    debug('Checking if permissions are ok')
    let [isRegular, isMod, isOwner] = await Promise.all([
      global.commons.isRegular(opts.sender),
      global.commons.isMod(opts.sender),
      global.commons.isOwner(opts.sender)
    ])
    debug('isRegular: %s', isRegular)
    debug('isMod: %s', isMod)
    debug('isOwner: %s', isOwner)
    if (command.permission === constants.VIEWERS ||
      (command.permission === constants.REGULAR && (isRegular || isMod || isOwner)) ||
      (command.permission === constants.MODS && (isMod || isOwner)) ||
      (command.permission === constants.OWNER_ONLY && isOwner)) {
      // remove found command from message to get param
      const param = opts.message.replace(new RegExp('^(' + cmdArray.join(' ') + ')', 'i'), '').trim()
      global.db.engine.insert(this.collection.count, { command: command.command, count: 1 })

      const responses: Array<Response> = await global.db.engine.find(this.collection.responses, { cid: String(command._id) })
      for (let r of _.orderBy(responses, 'order', 'asc')) {
        if (responses.length > 1) {
          // slow down command send message to have proper order (every 100ms)
          setTimeout(() => global.commons.sendMessage(r.response, opts.sender, { 'param': param, 'cmd': command.command }), r.order * 100)
        } else {
          global.commons.sendMessage(r.response, opts.sender, { 'param': param, 'cmd': command.command })
        }
      }
    }
    return true
  }

  async list (opts: Object) {
    let commands = await global.db.engine.find(this.collection.data, { visible: true })
    var output = (commands.length === 0 ? global.translate('customcmds.list-is-empty') : global.translate('customcmds.list-is-not-empty').replace(/\$list/g, _.map(_.orderBy(commands, 'command'), 'command').join(', ')))
    debug(output); global.commons.sendMessage(output, opts.sender)
  }

  async togglePermission (opts: Object) {
    debug('togglePermission(%j,%j,%j)', opts)
    const command = await global.db.engine.findOne(this.collection.data, { command: opts.parameters })
    if (!_.isEmpty(command)) {
      await global.db.engine.update(this.collection.data, { _id: command._id.toString() }, { permission: command.permission === 3 ? 0 : ++command.permission })
    }
  }

  async toggle (opts: Object) {
    debug('toggle(%j,%j,%j)', opts)
    const match = XRegExp.exec(opts.parameters, constants.COMMAND_REGEXP)
    if (_.isNil(match)) {
      let message = await global.commons.prepare('customcmds.commands-parse-failed')
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    const command = await global.db.engine.findOne(this.collection.data, { command: match.command })
    if (_.isEmpty(command)) {
      let message = await global.commons.prepare('customcmds.command-was-not-found', { command: match.command })
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    await global.db.engine.update(this.collection.data, { command: match.command }, { enabled: !command.enabled })

    let message = await global.commons.prepare(!command.enabled ? 'customcmds.command-was-enabled' : 'customcmds.command-was-disabled', { command: command.command })
    debug(message); global.commons.sendMessage(message, opts.sender)
  }

  async toggleVisibility (opts: Object) {
    const match = XRegExp.exec(opts.parameters, constants.COMMAND_REGEXP)
    if (_.isNil(match)) {
      let message = await global.commons.prepare('customcmds.commands-parse-failed')
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    const command = await global.db.engine.findOne(this.collection.data, { command: match.command })
    if (_.isEmpty(command)) {
      let message = await global.commons.prepare('customcmds.command-was-not-found', { command: match.command })
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    await global.db.engine.update(this.collection.data, { command: match.command }, { visible: !command.visible })
    let message = await global.commons.prepare(!command.visible ? 'customcmds.command-was-exposed' : 'customcmds.command-was-concealed', { command: command.command })
    debug(message); global.commons.sendMessage(message, opts.sender)
  }

  async remove (opts: Object) {
    const match = XRegExp.exec(opts.parameters, constants.COMMAND_REGEXP)
    if (_.isNil(match)) {
      let message = await global.commons.prepare('customcmds.commands-parse-failed')
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    let removed = await global.db.engine.remove(this.collection.data, { command: match.command })
    if (!removed) {
      let message = await global.commons.prepare('customcmds.command-was-not-found', { command: match.command })
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }
    let message = await global.commons.prepare('customcmds.command-was-removed', { command: match.command })
    debug(message); global.commons.sendMessage(message, opts.sender)
  }

  async compactCountDb () {
    try {
      await global.commons.compactDb({ table: this.collection.count, index: 'command', values: 'count' })
    } catch (e) {
      global.log.error(e)
      global.log.error(e.stack)
    } finally {
      new Timeout().recursive({ uid: this.collection.count + '.compactCountDb', this: this, fnc: this.compactCountDb, wait: 60000 })
    }
  }

  async getCountOf (command: string) {
    let count = 0
    for (let item of await global.db.engine.find(this.collection.count, { command })) {
      let toAdd = !_.isNaN(parseInt(_.get(item, 'count', 0))) ? _.get(item, 'count', 0) : 0
      count = count + Number(toAdd)
    }
    if (Number(count) < 0) count = 0

    return parseInt(
      Number(count) <= Number.MAX_SAFE_INTEGER / 1000000
        ? count
        : Number.MAX_SAFE_INTEGER / 1000000, 10)
  }
}

module.exports = new CustomCommands()

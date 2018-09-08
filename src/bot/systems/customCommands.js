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
const Expects = require('../expects')

/*
 * !command                                                                              - gets an info about command usage
 * !command add ?-ul owner|mod|regular|viewer ?-s true|false ![cmd] [response]           - add command with specified response
 * !command edit ?-ul owner|mod|regular|viewer ?-s true|false ![cmd] [number] [response] - edit command with specified response
 * !command remove ![cmd]                                                                - remove specified command
 * !command remove ![cmd] [number]                                                       - remove specified response of command
 * !command toggle ![cmd]                                                                - enable/disable specified command
 * !command toggle-visibility ![cmd]                                                     - enable/disable specified command
 * !command list                                                                         - get commands list
 * !command list ![cmd]                                                                  - get responses of command
 */

type Response = {
  _id?: string,
  order: number,
  response: string,
  stopIfExecuted: boolean,
  permission: number
}

type Command = {
  _id?: string,
  command: string,
  enabled: boolean,
  visible: boolean,
  responses?: Array<Response>,
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
              if (!r.cid) r.cid = _id || itemFromDb._id

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
    global.commons.sendMessage(global.translate('core.usage') + ': !command add ?-ul=owner|mod|regular|viewer ?-s=true|false <!cmd> <response> | !command edit ?-ul=owner|mod|regular|viewer ?-s=true|false <!cmd> <number> <response> | !command remove <!command> | !command remove <!command> <number> | !command list | !command list <!command>', opts.sender)
  }

  async edit (opts: Object) {
    try {
      const [userlevel, stopIfExecuted, command, rId, response] = new Expects(opts.parameters)
        .argument({ optional: true, name: 'ul', default: null })
        .argument({ optional: true, name: 's', default: null, type: Boolean })
        .command()
        .number()
        .string()
        .toArray()

      let cDb = await global.db.engine.findOne(this.collection.data, { command })
      if (!cDb._id) return global.commons.sendMessage(global.commons.prepare('customcmds.command-was-not-found', { command }), opts.sender)

      let rDb = await global.db.engine.findOne(this.collection.responses, { cid: String(cDb._id), order: rId - 1 })
      if (!rDb._id) return global.commons.sendMessage(global.commons.prepare('customcmds.response-was-not-found', { command, response: rId }), opts.sender)

      const _id = rDb._id; delete rDb._id
      rDb.response = response
      if (userlevel) rDb.permission = userlevel
      if (stopIfExecuted) rDb.stopIfExecuted = stopIfExecuted

      await global.db.engine.update(this.collection.responses, { _id }, rDb)
      global.commons.sendMessage(global.commons.prepare('customcmds.command-was-edited', { command, response }), opts.sender)
    } catch (e) {
      global.commons.sendMessage(global.commons.prepare('customcmds.commands-parse-failed'), opts.sender)
    }
  }

  async add (opts: Object) {
    try {
      const [userlevel, stopIfExecuted, command, response] = new Expects(opts.parameters)
        .argument({ optional: true, name: 'ul', default: 'viewer' })
        .argument({ optional: true, name: 's', default: false, type: Boolean })
        .command()
        .string()
        .toArray()

      let cDb = await global.db.engine.findOne(this.collection.data, { command })
      if (!cDb._id) {
        cDb = await global.db.engine.insert(this.collection.data, {
          command, enabled: true, visible: true
        })
      }

      let rDb = await global.db.engine.find(this.collection.responses, { cid: String(cDb._id) })
      await global.db.engine.insert(this.collection.responses, {
        cid: String(cDb._id),
        order: rDb.length,
        permission: global.permissions.stringToNumber(userlevel),
        stopIfExecuted,
        response
      })
      global.commons.sendMessage(global.commons.prepare('customcmds.command-was-added', { command }), opts.sender)
    } catch (e) {
      global.commons.sendMessage(global.commons.prepare('customcmds.commands-parse-failed'), opts.sender)
    }
  }

  async run (opts: Object) {
    if (!opts.message.startsWith('!')) return true // do nothing if it is not a command

    let _responses = []
    var command: $Shape<Command> = {} // eslint-disable-line no-undef
    let cmdArray = opts.message.toLowerCase().split(' ')
    for (let i in opts.message.toLowerCase().split(' ')) { // search for correct command
      debug(`${i} - Searching for ${cmdArray.join(' ')} in commands`)
      command = await global.db.engine.findOne(this.collection.data, { command: cmdArray.join(' '), enabled: true })
      debug(command)
      if (!_.isEmpty(command)) break
      cmdArray.pop() // remove last array item if not found
    }
    if (Object.keys(command).length === 0) return true // no command was found - return
    debug('Command found: %j', command)

    let [isRegular, isMod, isOwner] = await Promise.all([
      global.commons.isRegular(opts.sender),
      global.commons.isMod(opts.sender),
      global.commons.isOwner(opts.sender)
    ])
    debug('isRegular: %s', isRegular)
    debug('isMod: %s', isMod)
    debug('isOwner: %s', isOwner)

    // remove found command from message to get param
    const param = opts.message.replace(new RegExp('^(' + cmdArray.join(' ') + ')', 'i'), '').trim()
    global.db.engine.insert(this.collection.count, { command: command.command, count: 1 })

    const responses: Array<Response> = await global.db.engine.find(this.collection.responses, { cid: String(command._id) })
    for (let r of _.orderBy(responses, 'order', 'asc')) {
      if (r.permission === constants.VIEWERS ||
        (r.permission === constants.REGULAR && (isRegular || isMod || isOwner)) ||
        (r.permission === constants.MODS && (isMod || isOwner)) ||
        (r.permission === constants.OWNER_ONLY && isOwner)) {
        _responses.push(r.response)
        if (responses.length > 1) {
          // slow down command send message to have proper order (every 100ms)
          setTimeout(() => global.commons.sendMessage(r.response, opts.sender, { 'param': param, 'cmd': command.command }), r.order * 100)
          if (r.stopIfExecuted) break
        } else {
          global.commons.sendMessage(r.response, opts.sender, { 'param': param, 'cmd': command.command })
        }
      }
    }
    return _responses
  }

  async list (opts: Object) {
    const command = new Expects(opts.parameters).command({ optional: true }).toArray()[0]

    if (!command) {
      // print commands
      let commands = await global.db.engine.find(this.collection.data, { visible: true })
      var output = (commands.length === 0 ? global.translate('customcmds.list-is-empty') : global.translate('customcmds.list-is-not-empty').replace(/\$list/g, _.map(_.orderBy(commands, 'command'), 'command').join(', ')))
      debug(output); global.commons.sendMessage(output, opts.sender)
    } else {
      // print responses
      const cid = String((await global.db.engine.findOne(this.collection.data, { command }))._id)
      const responses = _.orderBy((await global.db.engine.find(this.collection.responses, { cid })), 'order', 'asc')

      if (responses.length === 0) global.commons.sendMessage(global.commons.prepare('customcmdustomcmds.list-of-responses-is-empty', { command }), opts.sender)
      const permission = [
        { v: constants.VIEWERS, string: await global.commons.prepare('ui.systems.customcommands.forViewers') },
        { v: constants.REGULAR, string: await global.commons.prepare('ui.systems.customcommands.forRegulars') },
        { v: constants.MODS, string: await global.commons.prepare('ui.systems.customcommands.forMods') },
        { v: constants.OWNER_ONLY, string: await global.commons.prepare('ui.systems.customcommands.forOwners') }
      ]
      for (let r of responses) {
        let rPrmsn: any = permission.find(o => o.v === r.permission)
        const response = await global.commons.prepare('customcmds.response', { command, index: ++r.order, response: r.response, after: r.stopIfExecuted ? '_' : 'v', permission: rPrmsn.string })
        global.log.chatOut(response, { username: opts.sender.username })
        if ((await global.configuration.getValue('sendWithMe'))) {
          global.commons.message('me', global.commons.getOwner(), response)
        } else {
          global.commons.message('say', global.commons.getOwner(), response)
        }
      }
    }
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
    try {
      const [command, response] = new Expects(opts.parameters).command().number({ optional: true }).toArray()
      let cid = (await global.db.engine.findOne(this.collection.data, { command }))._id
      if (!cid) {
        global.commons.sendMessage(global.commons.prepare('customcmds.command-was-not-found', { command }), opts.sender)
      } else {
        cid = String(cid)
        if (response) {
          const order = Number(response) - 1
          let removed = await global.db.engine.remove(this.collection.responses, { cid, order })
          if (removed > 0) {
            global.commons.sendMessage(global.commons.prepare('customcmds.response-was-removed', { command, response }), opts.sender)

            // update order
            const responses = _.orderBy(await global.db.engine.find(this.collection.responses, { cid }), 'order', 'asc')
            if (responses.length === 0) {
              // remove command if 0 responses
              await global.db.engine.remove(this.collection.data, { command })
            }

            let order = 0
            for (let r of responses) {
              const _id = String(r._id); delete r._id
              r.order = order
              await global.db.engine.update(this.collection.responses, { _id }, r)
              order++
            }
          } else global.commons.sendMessage(global.commons.prepare('customcmds.response-was-not-found', { command, response }), opts.sender)
        } else {
          await global.db.engine.remove(this.collection.data, { command })
          global.commons.sendMessage(global.commons.prepare('customcmds.command-was-removed', { command }), opts.sender)
        }
      }
    } catch (e) {
      return global.commons.sendMessage(global.commons.prepare('customcmds.commands-parse-failed'), opts.sender)
    }
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

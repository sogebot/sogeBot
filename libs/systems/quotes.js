'use strict'

// 3rdparty libraries
const _ = require('lodash')
const chalk = require('chalk')
const debug = require('debug')
const Expects = require('../expects')

const constants = require('../constants.js')
const config = require('../../config.json')

class Quotes {
  constructor () {
    this.collection = 'systems.quotes'

    this.defaults = {
      enabled: true,
      command: '!quote',
      commandAdd: '!quote add',
      commandRemove: '!quote remove',
      commandSet: '!quote set',
      commandList: '!quote list',
      urlBase: config.panel.domain.split(',').map((o) => o.trim())[0]
    }

    if (require('cluster').isMaster) {
      this.status()
      this.webPanel()
      this.sockets()
    }
  }

  get urlBase () {
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne(`${this.collection}.settings`, { key: 'urlBase' }), 'value', this.defaults.urlBase)))
  }

  set urlBase (value) {
    if (_.isNil(value)) value = this.defaults.urlBase
    global.db.engine.update(`${this.collection}.settings`, { key: 'urlBase' }, { value })
  }

  get command () {
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne(`${this.collection}.settings`, { key: 'command' }), 'value', this.defaults.command)))
  }

  set command (value) {
    if (_.isNil(value)) value = this.defaults.command
    global.db.engine.update(`${this.collection}.settings`, { key: 'command' }, { value })
  }

  get commandAdd () {
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne(`${this.collection}.settings`, { key: 'commandAdd' }), 'value', this.defaults.commandAdd)))
  }

  set commandAdd (value) {
    if (_.isNil(value)) value = this.defaults.commandAdd
    global.db.engine.update(`${this.collection}.settings`, { key: 'commandAdd' }, { value })
  }

  get commandSet () {
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne(`${this.collection}.settings`, { key: 'commandSet' }), 'value', this.defaults.commandSet)))
  }

  set commandSet (value) {
    if (_.isNil(value)) value = this.defaults.commandSet
    global.db.engine.update(`${this.collection}.settings`, { key: 'commandSet' }, { value })
  }

  get commandRemove () {
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne(`${this.collection}.settings`, { key: 'commandRemove' }), 'value', this.defaults.commandRemove)))
  }

  set commandRemove (value) {
    if (_.isNil(value)) value = this.defaults.commandRemove
    global.db.engine.update(`${this.collection}.settings`, { key: 'commandRemove' }, { value })
  }

  get commandList () {
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne(`${this.collection}.settings`, { key: 'commandList' }), 'value', this.defaults.commandList)))
  }

  set commandList (value) {
    if (_.isNil(value)) value = this.defaults.commandList
    global.db.engine.update(`${this.collection}.settings`, { key: 'commandList' }, { value })
  }

  get enabled () {
    // return true if not set
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne(`${this.collection}.settings`, { key: 'enabled' }), 'value', this.defaults.enabled)))
  }

  set enabled (value) {
    if (_.isNil(value)) value = this.defaults.enabled
    global.db.engine.update(`${this.collection}.settings`, { key: 'enabled' }, { value })
  }

  async commands () {
    const [enabled, commandAdd, commandRemove, commandSet, commandList, command] =
      await Promise.all([this.enabled, this.commandAdd, this.commandRemove, this.commandSet, this.commandList, this.command])
    return !enabled
      ? []
      : [
        { id: '!quote add', command: `${commandAdd}`, fnc: this.add, permission: constants.OWNER_ONLY, this: this },
        { id: '!quote remove', command: `${commandRemove}`, fnc: this.remove, permission: constants.OWNER_ONLY, this: this },
        { id: '!quote set', command: `${commandSet}`, fnc: this.set, permission: constants.OWNER_ONLY, this: this },
        { id: '!quote list', command: `${commandList}`, fnc: this.list, permission: constants.VIEWERS, this: this },
        { id: '!quote', command: `${command}`, fnc: this.show, permission: constants.VIEWERS, this: this }
      ]
  }

  async webPanel () {
    if (_.isNil(global.panel)) return setTimeout(() => this.webPanel(), 100)
    global.panel.addMenu({category: 'manage', name: 'quotes', id: 'quotes'})
  }

  sockets () {
    if (_.isNil(global.panel)) return setTimeout(() => this.sockets(), 100)

    const d = debug('events:sockets')
    global.panel.io.of('/system/quotes').on('connection', (socket) => {
      d('Socket /system/quotes connected, registering sockets')
      socket.on('list', async (cb) => {
        let quotes = await global.db.engine.find(this.collection)
        let list = await global.users.getUsernamesFromIds(quotes.map((o) => o.quotedBy))
        quotes.forEach((quote) => { quote.quotedBy = list[quote.quotedBy] })
        cb(null, _.orderBy(quotes, 'id', 'asc'))
      })
      socket.on('settings', async (cb) => {
        let settings = [
          { key: 'enabled', value: await this.enabled, type: 'bool' },
          { key: 'command', value: await this.command, type: 'command', command: '!quote' },
          { key: 'commandAdd', value: await this.commandAdd, type: 'command', command: '!quote add' },
          { key: 'commandRemove', value: await this.commandRemove, type: 'command', command: '!quote remove' },
          { key: 'commandSet', value: await this.commandSet, type: 'command', command: '!quote set' },
          { key: 'commandList', value: await this.commandList, type: 'command', command: '!quote list' },
          { key: 'urlBase', value: await this.urlBase, type: 'array', list: config.panel.domain.split(',').map((o) => o.trim()) }
        ]
        cb(null, settings)
      })
      socket.on('settings.update', async (data, cb) => {
        const enabled = await this.enabled
        for (let item of data) {
          if (item.key === 'enabled' && item.value !== enabled) this.status(item.value)
          this[item.key] = item.value
        }
        setTimeout(() => cb(null), 1000)
      })
      socket.on('quote.save', async (data, cb) => {
        await global.db.engine.update(this.collection, { _id: data._id }, data)
        setTimeout(() => cb(null, data), 1000)
      })
      socket.on('quote.delete', async (id, cb) => {
        await global.db.engine.remove(this.collection, { id })
        cb(null, id)
      })
      socket.on('quote.get', async (_id, cb) => {
        const quote = await global.db.engine.findOne(this.collection, { _id })
        cb(null, quote)
      })
    })
  }

  async status (state) {
    let enabled
    if (_.isNil(state)) enabled = await this.enabled
    else enabled = state

    if (!enabled) {
      global.log.info(`${chalk.red('DISABLED')}: Quotes System`)
    } else {
      global.log.info(`${chalk.green('ENABLED')}: Quotes System`)
    }
    return enabled
  }

  async toggleEnable () {
    const state = !(await this.enabled)
    this.enabled = state
    return this.status(state)
  }

  async add (opts) {
    const expects = new Expects()

    try {
      if (opts.command.after.length === 0) throw new Error()
      let [tags, quote] = expects.check(opts.command.after).argument({ name: 'tags', optional: true, default: 'general' }).argument({ name: 'quote' }).toArray()
      tags = tags.split(',').map((o) => o.trim())

      let quotes = await global.db.engine.find(this.collection, {})
      let id
      if (!_.isEmpty(quotes)) id = _.maxBy(quotes, 'id').id + 1
      else id = 1

      await global.db.engine.insert(this.collection, { id, tags, quote, quotedBy: opts.sender['user-id'], createdAt: new Date() })

      const message = await global.commons.prepare('systems.quotes.add.ok', { id, quote, tags: tags.join(', ') })
      global.commons.sendMessage(message, opts.sender)
    } catch (e) {
      const command = await this.commandAdd
      const message = await global.commons.prepare('systems.quotes.add.error', { command })
      global.commons.sendMessage(message, opts.sender)
    }
  }

  async remove (opts) {
    const expects = new Expects()

    try {
      if (opts.command.after.length === 0) throw new Error()
      let id = expects.check(opts.command.after).argument({ type: Number, name: 'id' }).toArray()[0]
      if (_.isNaN(id)) throw new Error()

      let item = await global.db.engine.remove(this.collection, { id })
      if (item > 0) {
        const message = await global.commons.prepare('systems.quotes.remove.ok', { id })
        global.commons.sendMessage(message, opts.sender)
      } else {
        const message = await global.commons.prepare('systems.quotes.remove.not-found', { id })
        global.commons.sendMessage(message, opts.sender)
      }
    } catch (e) {
      const message = await global.commons.prepare('systems.quotes.remove.error')
      global.commons.sendMessage(message, opts.sender)
    }
  }

  async set (opts) {
    const expects = new Expects()

    try {
      if (opts.command.after.length === 0) throw new Error()
      let [id, tag] = expects.check(opts.command.after).argument({ type: Number, name: 'id' }).argument({ name: 'tag' }).toArray()
      if (_.isNaN(id)) {
        const message = await global.commons.prepare('systems.quotes.set.error.id-is-not-a-number')
        global.commons.sendMessage(message, opts.sender)
      } else {
        let quote = await global.db.engine.findOne(this.collection, { id })
        if (!_.isEmpty(quote)) {
          const tags = tag.split(',').map((o) => o.trim())
          await global.db.engine.update(this.collection, { id }, { tags })
          const message = await global.commons.prepare('systems.quotes.set.ok', { id, tags: tags.join(', ') })
          global.commons.sendMessage(message, opts.sender)
        } else {
          const message = await global.commons.prepare('systems.quotes.set.error.not-found-by-id', { id })
          global.commons.sendMessage(message, opts.sender)
        }
      }
    } catch (e) {
      const command = await this.commandSet
      const message = await global.commons.prepare('systems.quotes.set.error.no-parameters', { command })
      global.commons.sendMessage(message, opts.sender)
    }
  }

  async list (opts) {
    const urlBase = await this.urlBase
    const message = await global.commons.prepare(
      (['localhost', '127.0.0.1'].includes(urlBase) ? 'systems.quotes.list.is-localhost' : 'systems.quotes.list.ok'),
      { urlBase })
    return global.commons.sendMessage(message, opts.sender)
  }

  async show (opts) {
    const expects = new Expects()

    let [id, tag] = expects.check(opts.command.after).argument({ type: Number, name: 'id', optional: true }).argument({ name: 'tag', optional: true }).toArray()

    if (_.isNil(id) && _.isNil(tag)) {
      const command = await this.command
      const message = await global.commons.prepare('systems.quotes.show.error.no-parameters', { command })
      return global.commons.sendMessage(message, opts.sender)
    }

    if (!_.isNil(id)) {
      if (_.isNaN(id)) {
        const message = await global.commons.prepare('systems.quotes.show.error.id-is-not-a-number')
        global.commons.sendMessage(message, opts.sender)
      } else {
        let quote = await global.db.engine.findOne(this.collection, { id })
        if (!_.isEmpty(quote)) {
          const quotedBy = (await global.users.getUsernamesFromIds([quote.quotedBy]))[quote.quotedBy]
          const message = await global.commons.prepare('systems.quotes.show.ok', { quote: quote.quote, id: quote.id, quotedBy })
          global.commons.sendMessage(message, opts.sender)
        } else {
          const message = await global.commons.prepare('systems.quotes.show.error.not-found-by-id', { id })
          global.commons.sendMessage(message, opts.sender)
        }
      }
    } else {
      let quotes = await global.db.engine.find(this.collection)
      let quotesWithTags = []

      for (let quote of quotes) {
        if (quote.tags.includes(tag)) quotesWithTags.push(quote)
      }

      if (quotesWithTags.length > 0) {
        let quote = _.sample(quotesWithTags)
        const quotedBy = (await global.users.getUsernamesFromIds([quote.quotedBy]))[quote.quotedBy]
        const message = await global.commons.prepare('systems.quotes.show.ok', { quote: quote.quote, id: quote.id, quotedBy })
        global.commons.sendMessage(message, opts.sender)
      } else {
        const message = await global.commons.prepare('systems.quotes.show.error.not-found-by-tag', { tag })
        global.commons.sendMessage(message, opts.sender)
      }
    }
  }
}

module.exports = new Quotes()

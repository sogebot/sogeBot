'use strict'

// 3rdparty libraries
const _ = require('lodash')
const System = require('./_interface')
const Expects = require('../expects')

const constants = require('../constants.js')
const config = require('@config')

class Quotes extends System {
  constructor () {
    const settings = {
      urlBase: config.panel.domain.split(',').map((o) => o.trim())[0],
      commands: [
        { name: '!quote add', permission: constants.OWNER_ONLY },
        { name: '!quote remove', permission: constants.OWNER_ONLY },
        { name: '!quote set', permission: constants.OWNER_ONLY },
        '!quote list',
        '!quote'
      ]
    }
    super({ settings })

    this.addMenu({ category: 'manage', name: 'quotes', id: 'quotes/list' })
  }

  async add (opts) {
    try {
      if (opts.parameters.length === 0) throw new Error()
      let [tags, quote] = new Expects(opts.parameters).argument({ name: 'tags', optional: true, default: 'general', multi: true, delimiter: '' }).argument({ name: 'quote', multi: true, delimiter: '' }).toArray()
      tags = tags.split(',').map((o) => o.trim())

      let quotes = await global.db.engine.find(this.collection.data, {})
      let id
      if (!_.isEmpty(quotes)) id = _.maxBy(quotes, 'id').id + 1
      else id = 1

      await global.db.engine.insert(this.collection.data, { id, tags, quote, quotedBy: opts.sender['userId'], createdAt: new Date() })

      const message = await global.commons.prepare('systems.quotes.add.ok', { id, quote, tags: tags.join(', ') })
      global.commons.sendMessage(message, opts.sender)
    } catch (e) {
      const message = await global.commons.prepare('systems.quotes.add.error', { command: opts.command })
      global.commons.sendMessage(message, opts.sender)
    }
  }

  async remove (opts) {
    try {
      if (opts.parameters.length === 0) throw new Error()
      let id = new Expects(opts.parameters).argument({ type: Number, name: 'id' }).toArray()[0]
      if (_.isNaN(id)) throw new Error()

      let item = await global.db.engine.remove(this.collection.data, { id })
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
    try {
      if (opts.parameters.length === 0) throw new Error()
      let [id, tag] = new Expects(opts.parameters).argument({ type: Number, name: 'id' }).argument({ name: 'tag', multi: true, delimiter: '' }).toArray()
      let quote = await global.db.engine.findOne(this.collection.data, { id })
      if (!_.isEmpty(quote)) {
        const tags = tag.split(',').map((o) => o.trim())
        await global.db.engine.update(this.collection.data, { id }, { tags })
        const message = await global.commons.prepare('systems.quotes.set.ok', { id, tags: tags.join(', ') })
        global.commons.sendMessage(message, opts.sender)
      } else {
        const message = await global.commons.prepare('systems.quotes.set.error.not-found-by-id', { id })
        global.commons.sendMessage(message, opts.sender)
      }
    } catch (e) {
      const message = await global.commons.prepare('systems.quotes.set.error.no-parameters', { command: opts.command })
      global.commons.sendMessage(message, opts.sender)
    }
  }

  async list (opts) {
    const urlBase = await this.settings.urlBase
    const message = await global.commons.prepare(
      (['localhost', '127.0.0.1'].includes(urlBase) ? 'systems.quotes.list.is-localhost' : 'systems.quotes.list.ok'),
      { urlBase })
    return global.commons.sendMessage(message, opts.sender)
  }

  async main (opts) {
    let [id, tag] = new Expects(opts.parameters).argument({ type: Number, name: 'id', optional: true }).argument({ name: 'tag', optional: true, multi: true, delimiter: '' }).toArray()
    if (_.isNil(id) && _.isNil(tag)) {
      const message = await global.commons.prepare('systems.quotes.show.error.no-parameters', { command: opts.command })
      return global.commons.sendMessage(message, opts.sender)
    }

    if (!_.isNil(id)) {
      let quote = await global.db.engine.findOne(this.collection.data, { id })
      if (!_.isEmpty(quote)) {
        const quotedBy = (await global.users.getUsernamesFromIds([quote.quotedBy]))[quote.quotedBy]
        const message = await global.commons.prepare('systems.quotes.show.ok', { quote: quote.quote, id: quote.id, quotedBy })
        global.commons.sendMessage(message, opts.sender)
      } else {
        const message = await global.commons.prepare('systems.quotes.show.error.not-found-by-id', { id })
        global.commons.sendMessage(message, opts.sender)
      }
    } else {
      let quotes = await global.db.engine.find(this.collection.data)
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

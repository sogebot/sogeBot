'use strict'

// 3rdparty libraries
const _ = require('lodash')
import System from './_interface'
import { permission } from '../permissions';
import { command, default_permission } from '../decorators';
const Expects = require('../expects')
const config = require('@config')
const commons = require('../commons');

class Quotes extends System {
  constructor () {
    const settings = {
      urlBase: config.panel.domain.split(',').map((o) => o.trim())[0],
    }
    super({ settings })

    this.addMenu({ category: 'manage', name: 'quotes', id: 'quotes/list' })
  }

  @command('!quote add')
  @default_permission(permission.CASTERS)
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

      const message = await commons.prepare('systems.quotes.add.ok', { id, quote, tags: tags.join(', ') })
      commons.sendMessage(message, opts.sender)
    } catch (e) {
      const message = await commons.prepare('systems.quotes.add.error', { command: opts.command })
      commons.sendMessage(message, opts.sender)
    }
  }

  @command('!quote remove')
  @default_permission(permission.CASTERS)
  async remove (opts) {
    try {
      if (opts.parameters.length === 0) throw new Error()
      let id = new Expects(opts.parameters).argument({ type: Number, name: 'id' }).toArray()[0]
      if (_.isNaN(id)) throw new Error()

      let item = await global.db.engine.remove(this.collection.data, { id })
      if (item > 0) {
        const message = await commons.prepare('systems.quotes.remove.ok', { id })
        commons.sendMessage(message, opts.sender)
      } else {
        const message = await commons.prepare('systems.quotes.remove.not-found', { id })
        commons.sendMessage(message, opts.sender)
      }
    } catch (e) {
      const message = await commons.prepare('systems.quotes.remove.error')
      commons.sendMessage(message, opts.sender)
    }
  }

  @command('!quote set')
  @default_permission(permission.CASTERS)
  async set (opts) {
    try {
      if (opts.parameters.length === 0) throw new Error()
      let [id, tag] = new Expects(opts.parameters).argument({ type: Number, name: 'id' }).argument({ name: 'tag', multi: true, delimiter: '' }).toArray()
      let quote = await global.db.engine.findOne(this.collection.data, { id })
      if (!_.isEmpty(quote)) {
        const tags = tag.split(',').map((o) => o.trim())
        await global.db.engine.update(this.collection.data, { id }, { tags })
        const message = await commons.prepare('systems.quotes.set.ok', { id, tags: tags.join(', ') })
        commons.sendMessage(message, opts.sender)
      } else {
        const message = await commons.prepare('systems.quotes.set.error.not-found-by-id', { id })
        commons.sendMessage(message, opts.sender)
      }
    } catch (e) {
      const message = await commons.prepare('systems.quotes.set.error.no-parameters', { command: opts.command })
      commons.sendMessage(message, opts.sender)
    }
  }

  @command('!quote list')
  async list (opts) {
    const urlBase = this.settings.urlBase
    const message = await commons.prepare(
      (['localhost', '127.0.0.1'].includes(urlBase) ? 'systems.quotes.list.is-localhost' : 'systems.quotes.list.ok'),
      { urlBase })
    return commons.sendMessage(message, opts.sender)
  }

  @command('!quote')
  async main (opts) {
    let [id, tag] = new Expects(opts.parameters).argument({ type: Number, name: 'id', optional: true }).argument({ name: 'tag', optional: true, multi: true, delimiter: '' }).toArray()
    if (_.isNil(id) && _.isNil(tag)) {
      const message = await commons.prepare('systems.quotes.show.error.no-parameters', { command: opts.command })
      return commons.sendMessage(message, opts.sender)
    }

    if (!_.isNil(id)) {
      let quote = await global.db.engine.findOne(this.collection.data, { id })
      if (!_.isEmpty(quote)) {
        const quotedBy = (await global.users.getUsernamesFromIds([quote.quotedBy]))[quote.quotedBy]
        const message = await commons.prepare('systems.quotes.show.ok', { quote: quote.quote, id: quote.id, quotedBy })
        commons.sendMessage(message, opts.sender)
      } else {
        const message = await commons.prepare('systems.quotes.show.error.not-found-by-id', { id })
        commons.sendMessage(message, opts.sender)
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
        const message = await commons.prepare('systems.quotes.show.ok', { quote: quote.quote, id: quote.id, quotedBy })
        commons.sendMessage(message, opts.sender)
      } else {
        const message = await commons.prepare('systems.quotes.show.error.not-found-by-tag', { tag })
        commons.sendMessage(message, opts.sender)
      }
    }
  }
}

module.exports = new Quotes()

'use strict'

// 3rdparty libraries
const _ = require('lodash')
// bot libraries
const constants = require('../constants')
const Parser = require('../parser')
const System = require('./_interface')
const debug = require('debug')('systems:price')

/*
 * !price                     - gets an info about price usage
 * !price set [cmd] [price]   - add notice with specified response
 * !price unset [cmd] [price] - add notice with specified response
 * !price list                - get list of notices
 * !price toggle [cmd]        - remove notice by id
 */

class Price extends System {
  constructor () {
    const dependsOn = [
      'systems.points'
    ]
    const settings = {
      commands: [
        { name: '!price set', permission: constants.OWNER_ONLY },
        { name: '!price list', permission: constants.OWNER_ONLY },
        { name: '!price unset', permission: constants.OWNER_ONLY },
        { name: '!price toggle', permission: constants.OWNER_ONLY },
        { name: '!price', permission: constants.OWNER_ONLY }
      ],
      parsers: [
        { name: 'check', priority: constants.HIGH }
      ]
    }
    super({ settings, dependsOn })

    this.addMenu({ category: 'manage', name: 'price', id: 'price/list' })
  }

  main (opts) {
    global.commons.sendMessage(global.translate('core.usage') + ': !price set <cmd> <price> | !price unset <cmd> | !price list | !price toggle <cmd>', opts.sender)
  }

  async set (opts) {
    const parsed = opts.parameters.match(/^(![\S]+) ([0-9]+)$/)

    if (_.isNil(parsed)) {
      let message = await global.commons.prepare('price.price-parse-failed')
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    const [command, price] = parsed.slice(1)
    if (parseInt(price, 10) === 0) {
      this.unset(opts)
      return false
    }

    await global.db.engine.update(this.collection.data, { command: command }, { command: command, price: parseInt(price, 10), enabled: true })
    let message = await global.commons.prepare('price.price-was-set', { command, amount: parseInt(price, 10), pointsName: await global.systems.points.getPointsName(price) })
    debug(message); global.commons.sendMessage(message, opts.sender)
  }

  async unset (opts) {
    const parsed = opts.parameters.match(/^(![\S]+)$/)

    if (_.isNil(parsed)) {
      let message = await global.commons.prepare('price.price-parse-failed')
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    const command = parsed[1]
    await global.db.engine.remove(this.collection.data, { command: command })
    let message = await global.commons.prepare('price.price-was-unset', { command })
    debug(message); global.commons.sendMessage(message, opts.sender)
  }

  async toggle (opts) {
    debug('toggle(%j,%j,%j)', opts)
    const parsed = opts.parameters.match(/^(![\S]+)$/)

    if (_.isNil(parsed)) {
      let message = await global.commons.prepare('price.price-parse-failed')
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    const command = parsed[1]
    const price = await global.db.engine.findOne(this.collection.data, { command: command })
    if (_.isEmpty(price)) {
      let message = await global.commons.prepare('price.price-was-not-found', { command })
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    await global.db.engine.update(this.collection.data, { command: command }, { enabled: !price.enabled })
    let message = await global.commons.prepare(!price.enabled ? 'price.price-was-enabled' : 'price.price-was-disabled', { command })
    debug(message); global.commons.sendMessage(message, opts.sender)
  }

  async list (opts) {
    let prices = await global.db.engine.find(this.collection.data)
    var output = (prices.length === 0 ? global.translate('price.list-is-empty') : global.translate('price.list-is-not-empty').replace(/\$list/g, (_.map(_.orderBy(prices, 'command'), (o) => { return `${o.command} - ${o.price}` })).join(', ')))
    debug(output); global.commons.sendMessage(output, opts.sender)
  }

  async check (opts) {
    const parsed = opts.message.match(/^(![\S]+)/)
    const helpers = (await (new Parser()).getCommandsList()).filter(o => o.isHelper).map(o => o.command)
    if (
      _.isNil(parsed) ||
      global.commons.isOwner(opts.sender) ||
      helpers.includes(opts.message)
    ) return true

    const price = await global.db.engine.findOne(this.collection.data, { command: parsed[1], enabled: true })

    if (_.isEmpty(price)) { // no price set
      return true
    }

    var availablePts = await global.systems.points.getPointsOf(opts.sender.userId)
    var removePts = parseInt(price.price, 10)
    let haveEnoughPoints = availablePts >= removePts
    if (!haveEnoughPoints) {
      let message = await global.commons.prepare('price.user-have-not-enough-points', { amount: removePts, command: `${price.command}`, pointsName: await global.systems.points.getPointsName(removePts) })
      debug(message); global.commons.sendMessage(message, opts.sender)
    } else {
      await global.db.engine.insert('users.points', { id: opts.sender.userId, points: (removePts * -1) })
    }
    return haveEnoughPoints
  }
}

module.exports = new Price()

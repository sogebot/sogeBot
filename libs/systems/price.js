'use strict'

// 3rdparty libraries
const _ = require('lodash')
// bot libraries
const constants = require('../constants')
const debug = require('debug')('systems:price')

/*
 * !price                     - gets an info about price usage
 * !price set [cmd] [price]   - add notice with specified response
 * !price unset [cmd] [price] - add notice with specified response
 * !price list                - get list of notices
 * !price toggle [cmd]        - remove notice by id
 */

class Price {
  constructor () {
    if (global.commons.isSystemEnabled('points') && global.commons.isSystemEnabled(this) && require('cluster').isMaster) {
      global.panel.addMenu({category: 'manage', name: 'price', id: 'price'})
      global.panel.registerSockets({
        self: this,
        expose: ['set', 'unset', 'toggle', 'editCommand', 'send'],
        finally: this.send
      })
    }
  }

  commands () {
    return !global.commons.isSystemEnabled('price') && !global.commons.isSystemEnabled('points')
      ? []
      : [
        {this: this, command: '!price set', fnc: this.set, permission: constants.OWNER_ONLY},
        {this: this, command: '!price list', fnc: this.list, permission: constants.OWNER_ONLY},
        {this: this, command: '!price unset', fnc: this.unset, permission: constants.OWNER_ONLY},
        {this: this, command: '!price toggle', fnc: this.toggle, permission: constants.OWNER_ONLY},
        {this: this, command: '!price', fnc: this.help, permission: constants.OWNER_ONLY}
      ]
  }

  parsers () {
    return !global.commons.isSystemEnabled('price') && !global.commons.isSystemEnabled('points')
      ? []
      : [
        {this: this, name: 'price', fnc: this.check, permission: constants.VIEWERS, priority: constants.HIGH}
      ]
  }

  help (self, sender) {
    global.commons.sendMessage(global.translate('core.usage') + ': !price set <cmd> <price> | !price unset <cmd> | !price list | !price toggle <cmd>', sender)
  }

  async send (self, socket) {
    let prices = await global.db.engine.find('prices')
    socket.emit('price', _.orderBy(prices, 'command', 'asc'))
  }

  async set (self, sender, text) {
    const parsed = text.match(/^!?([\S]+) ([0-9]+)$/)

    if (_.isNil(parsed)) {
      let message = await global.commons.prepare('price.price-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    const [command, price] = parsed.slice(1)
    if (parseInt(price, 10) === 0) {
      this.unset(self, sender, command)
      return false
    }

    await global.db.engine.update('prices', { command: command }, { command: command, price: parseInt(price, 10), enabled: true })
    let message = await global.commons.prepare('price.price-was-set', { command: `!${command}`, amount: parseInt(price, 10), pointsName: await global.systems.points.getPointsName(price) })
    debug(message); global.commons.sendMessage(message, sender)
  }

  async unset (self, sender, text) {
    const parsed = text.match(/^!?([\S]+)$/)

    if (_.isNil(parsed)) {
      let message = await global.commons.prepare('price.price-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    const command = parsed[1]
    await global.db.engine.remove('prices', { command: command })
    let message = await global.commons.prepare('price.price-was-unset', { command: `!${command}` })
    debug(message); global.commons.sendMessage(message, sender)
  }

  async toggle (self, sender, text) {
    debug('toggle(%j,%j,%j)', self, sender, text)
    const parsed = text.match(/^!?([\S]+)$/)

    if (_.isNil(parsed)) {
      let message = await global.commons.prepare('price.price-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    const command = parsed[1]
    const price = await global.db.engine.findOne('prices', { command: command })
    if (_.isEmpty(price)) {
      let message = await global.commons.prepare('price.price-was-not-found', { command: `!${command}` })
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    await global.db.engine.update('prices', { command: command }, { enabled: !price.enabled })
    let message = await global.commons.prepare(!price.enabled ? 'price.price-was-enabled' : 'price.price-was-disabled', { command: `!${command}` })
    debug(message); global.commons.sendMessage(message, sender)
  }

  async list (self, sender) {
    debug('list(%j, %j)', self, sender)
    let prices = await global.db.engine.find('prices')
    var output = (prices.length === 0 ? global.translate('price.list-is-empty') : global.translate('price.list-is-not-empty').replace(/\$list/g, (_.map(_.orderBy(prices, 'command'), (o) => { return `!${o.command} - ${o.price}` })).join(', ')))
    debug(output); global.commons.sendMessage(output, sender)
  }

  async editCommand (self, socket, data) {
    debug('editCommand(%j, %j, %j)', self, socket, data)
    if (data.value.length === 0) await self.unset(self, null, '!' + data.id)
    else {
      if (data.value.startsWith('!')) data.value = data.value.replace('!', '')
      await global.db.engine.update('prices', { command: data.id }, { command: data.value })
    }
  }

  async check (self, sender, text) {
    const parsed = text.match(/^!([\S]+)/)
    if (_.isNil(parsed) || global.commons.isOwner(sender)) return true
    /* TODO: Add isHelper checks
    if (global.parser.registeredHelpers.includes(text.trim()) || global.parser.isOwner(sender) || _.isNil(parsed)) {
      return true
    }
    */

    const [user, price] = await Promise.all([global.users.get(sender.username), global.db.engine.findOne('prices', { command: parsed[1], enabled: true })])

    if (_.isEmpty(price)) { // no price set
      return true
    }

    var availablePts = await global.systems.points.getPointsOf(user.username)
    var removePts = parseInt(price.price, 10)
    let haveEnoughPoints = availablePts >= removePts
    if (!haveEnoughPoints) {
      let message = await global.commons.prepare('price.user-have-not-enough-points', { amount: removePts, command: `!${price.command}`, pointsName: await global.systems.points.getPointsName(removePts) })
      debug(message); global.commons.sendMessage(message, sender)
    } else {
      await global.db.engine.insert('users.points', { username: sender.username, points: (removePts * -1) })
    }
    return haveEnoughPoints
  }
}

module.exports = new Price()

'use strict'

// 3rdparty libraries
var _ = require('lodash')
// bot libraries
var constants = require('../constants')

/*
 * !price                     - gets an info about price usage
 * !price set [cmd] [price]   - add notice with specified response
 * !price unset [cmd] [price] - add notice with specified response
 * !price list                - get list of notices
 * !price toggle [cmd]        - remove notice by id
 */

function Price () {
  if (global.commons.isSystemEnabled('points') && global.commons.isSystemEnabled(this)) {
    global.parser.register(this, '!price set', this.set, constants.OWNER_ONLY)
    global.parser.register(this, '!price list', this.list, constants.OWNER_ONLY)
    global.parser.register(this, '!price unset', this.unset, constants.OWNER_ONLY)
    global.parser.register(this, '!price toggle', this.toggle, constants.OWNER_ONLY)
    global.parser.register(this, '!price', this.help, constants.OWNER_ONLY)

    global.parser.registerHelper('!price')
    global.parser.registerParser(this, 'price', this.checkPrice, constants.VIEWERS)

    this.webPanel()
  }
}

Price.prototype.webPanel = function () {
  global.panel.addMenu({category: 'manage', name: 'price', id: 'price'})
  global.panel.socketListening(this, 'price.get', this.sendPrices)
  global.panel.socketListening(this, 'price.delete', this.deletePrice)
  global.panel.socketListening(this, 'price.create', this.createPrice)
  global.panel.socketListening(this, 'price.toggle', this.togglePrice)
}

Price.prototype.sendPrices = async function (self, socket) {
  socket.emit('price', await global.db.engine.find('prices'))
}

Price.prototype.deletePrice = function (self, socket, data) {
  self.unset(self, null, data)
  self.sendPrices(self, socket)
}

Price.prototype.togglePrice = async function (self, socket, data) {
  await self.toggle(self, null, data)
  self.sendPrices(self, socket)
}

Price.prototype.createPrice = async function (self, socket, data) {
  await self.set(self, null, data.command + ' ' + data.price)
  self.sendPrices(self, socket)
}

Price.prototype.help = function (self, sender) {
  global.commons.sendMessage(global.translate('core.usage') + ': !price set <cmd> <price> | !price unset <cmd> | !price list | !price toggle <cmd>', sender)
}

Price.prototype.set = async function (self, sender, text) {
  try {
    let parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+) ([0-9]+)$/)
    let price = {command: parsed[1], price: parsed[2], enabled: true}

    global.db.engine.update('prices', { command: price.command }, price)
    global.commons.sendMessage(global.translate('price.success.set')
      .replace(/\$command/g, parsed[1])
      .replace(/\$amount/g, parsed[2])
      .replace(/\$pointsName/g, global.systems.points.getPointsName(parsed[2])), sender)
  } catch (e) {
    global.commons.sendMessage(global.translate('price.failed.parse'), sender)
  }
}

Price.prototype.unset = function (self, sender, text) {
  try {
    var parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+)$/)
    global.db.engine.remove('prices', { command: parsed[1] })
    global.commons.sendMessage(global.translate('price.success.remove')
      .replace(/\$command/g, parsed[1]), sender)
  } catch (e) {
    global.commons.sendMessage(global.translate('price.failed.parse'), sender)
  }
}

Price.prototype.toggle = async function (self, sender, text) {
  try {
    const id = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+)$/)[1]
    const price = await global.db.engine.findOne('prices', { command: id })
    if (_.isEmpty(price)) {
      global.commons.sendMessage(global.translate('price.failed.toggle')
        .replace(/\$command/g, id), sender)
      return
    }

    await global.db.engine.update('prices', { command: id }, { enabled: !price.enabled })

    global.commons.sendMessage(global.translate(price.enabled ? 'price.success.enabled' : 'price.success.disabled')
      .replace(/\$command/g, price.command), sender)
  } catch (e) {
    global.commons.sendMessage(global.translate('notice.failed.parse'), sender)
  }
}

Price.prototype.list = async function (self, sender, text) {
  let prices = await global.db.engine.find('prices')
  var output = (prices.length === 0 ? global.translate('price.failed.list') : global.translate('price.success.list') + ': ' + _.map(prices, 'command').join(', '))
  global.commons.sendMessage(output, sender)
}

Price.prototype.checkPrice = async function (self, id, sender, text) {
  if (global.parser.registeredHelpers.includes(text.trim()) || global.parser.isOwner(sender)) {
    global.updateQueue(id, true)
    return
  }
  try {
    var parsed = text.match(/^!([\u0500-\u052F\u0400-\u04FF\w]+)/)

    const user = await global.users.get(sender.username)
    const price = await global.db.engine.findOne('prices', { command: parsed[1], enabled: true })

    if (_.isEmpty(price)) { // no price set
      global.updateQueue(id, true)
      return
    }

    var availablePts = parseInt(user.points, 10)
    var removePts = parseInt(price.price, 10)
    if (!_.isFinite(availablePts) || !_.isNumber(availablePts) || availablePts < removePts) {
      global.updateQueue(id, false)
      global.commons.sendMessage(global.translate('price.failed.notEnough')
        .replace(/\$amount/g, removePts)
        .replace(/\$command/g, price.command)
        .replace(/\$pointsName/g, global.systems.points.getPointsName(removePts)), sender)
    } else {
      global.db.engine.increment('users', { username: sender.username }, { points: (removePts * -1) })
      global.updateQueue(id, true)
    }
  } catch (err) {
    global.updateQueue(id, true) // it's not a command -> no price
  }
}

module.exports = new Price()

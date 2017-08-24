'use strict'

// 3rdparty libraries
var _ = require('lodash')
// bot libraries
var constants = require('../constants')
var log = global.log

/*
 * !price                     - gets an info about price usage
 * !price set [cmd] [price]   - add notice with specified response
 * !price unset [cmd] [price] - add notice with specified response
 * !price list                - get list of notices
 * !price toggle [cmd]        - remove notice by id
 */

function Price () {
  this.prices = []

  if (global.commons.isSystemEnabled('points') && global.commons.isSystemEnabled(this)) {
    global.parser.register(this, '!price set', this.set, constants.OWNER_ONLY)
    global.parser.register(this, '!price list', this.list, constants.OWNER_ONLY)
    global.parser.register(this, '!price unset', this.unset, constants.OWNER_ONLY)
    global.parser.register(this, '!price toggle', this.toggle, constants.OWNER_ONLY)
    global.parser.register(this, '!price', this.help, constants.OWNER_ONLY)

    global.parser.registerHelper('!price')

    global.parser.registerParser(this, 'price', this.checkPrice, constants.VIEWERS)

    global.watcher.watch(this, 'prices', this._save)
    this._update(this)

    this.webPanel()
  }
}

Price.prototype._update = function (self) {
  global.botDB.findOne({ _id: 'prices' }, function (err, item) {
    if (err) return log.error(err, { fnc: 'Price.prototype._update' })
    if (_.isNull(item)) return

    self.prices = item.prices
  })
}

Price.prototype._save = function (self) {
  var prices = {
    prices: self.prices
  }
  global.botDB.update({ _id: 'prices' }, { $set: prices }, { upsert: true })
}

Price.prototype.webPanel = function () {
  global.panel.addMenu({category: 'manage', name: 'price', id: 'price'})
  global.panel.socketListening(this, 'price.get', this.sendPrices)
  global.panel.socketListening(this, 'price.delete', this.deletePrice)
  global.panel.socketListening(this, 'price.create', this.createPrice)
  global.panel.socketListening(this, 'price.toggle', this.togglePrice)
}

Price.prototype.sendPrices = function (self, socket) {
  socket.emit('price', self.prices)
}

Price.prototype.deletePrice = function (self, socket, data) {
  self.unset(self, null, data)
  self.sendPrices(self, socket)
}

Price.prototype.togglePrice = function (self, socket, data) {
  self.toggle(self, null, data)
  self.sendPrices(self, socket)
}

Price.prototype.createPrice = function (self, socket, data) {
  self.set(self, null, data.command + ' ' + data.price)
  self.sendPrices(self, socket)
}

Price.prototype.help = function (self, sender) {
  global.commons.sendMessage(global.translate('core.usage') + ': !price set <cmd> <price> | !price unset <cmd> | !price list | !price toggle <cmd>', sender)
}

Price.prototype.set = function (self, sender, text) {
  try {
    var parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+) ([0-9]+)$/)
    self.prices = _.filter(self.prices, function (o) { return o.command !== parsed[1] })
    self.prices.push({command: parsed[1], price: parsed[2], enabled: true})
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
    self.prices = _.filter(self.prices, function (o) { return o.command !== parsed[1] })
    global.commons.sendMessage(global.translate('price.success.remove').replace(/\$command/g, parsed[1]), sender)
  } catch (e) {
    global.commons.sendMessage(global.translate('price.failed.parse'), sender)
  }
}

Price.prototype.toggle = function (self, sender, text) {
  try {
    const id = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+)$/)[1]
    let price = _.find(self.prices, function (o) { return o.command === id })
    if (_.isUndefined(price)) {
      global.commons.sendMessage(global.translate('price.failed.toggle')
        .replace(/\$command/g, id), sender)
    }
    price.enabled = !price.enabled
    global.commons.sendMessage(global.translate(price.enabled ? 'price.success.enabled' : 'price.success.disabled')
      .replace(/\$command/g, price.command), sender)
  } catch (e) {
    global.commons.sendMessage(global.translate('notice.failed.parse'), sender)
  }
}

Price.prototype.list = function (self, sender, text) {
  var prices = []
  _.each(self.prices, function (element) { prices.push('!' + element.command) })
  var output = (prices.length === 0 ? global.translate('price.failed.list') : global.translate('price.success.list') + ': ' + prices.join(', '))
  global.commons.sendMessage(output, sender)
}

Price.prototype.checkPrice = function (self, id, sender, text) {
  if (global.parser.registeredHelpers.includes(text.trim()) || global.parser.isOwner(sender)) {
    global.updateQueue(id, true)
    return
  }
  try {
    var parsed = text.match(/^!([\u0500-\u052F\u0400-\u04FF\w]+)/)

    var price = _.find(self.prices, function (o) { return o.command === parsed[1] && o.enabled })
    if (_.isUndefined(price)) { // no price set
      global.updateQueue(id, true)
      return
    }
    const user = global.users.get(sender.username)
    var availablePts = parseInt(user.points, 10)
    var removePts = parseInt(price.price, 10)
    if (!_.isFinite(availablePts) || !_.isNumber(availablePts) || availablePts < removePts) {
      global.updateQueue(id, false)
      global.commons.sendMessage(global.translate('price.failed.notEnough')
        .replace(/\$amount/g, removePts)
        .replace(/\$command/g, price.command)
        .replace(/\$pointsName/g, global.systems.points.getPointsName(removePts)), sender)
    } else {
      global.users.set(sender.username, { points: availablePts - removePts })
      global.updateQueue(id, true)
    }
  } catch (err) {
    global.updateQueue(id, true) // it's not a command -> no price
  }
}

module.exports = new Price()

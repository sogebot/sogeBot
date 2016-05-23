'use strict'

var chalk = require('chalk')
var constants = require('../constants')
var _ = require('underscore')

function Price () {
  if (global.configuration.get().systems.points === true && global.configuration.get().systems.price === true) {
    global.parser.register(this, '!price set', this.setPrice, constants.OWNER_ONLY)
    global.parser.register(this, '!price list', this.listPrices, constants.OWNER_ONLY)
    global.parser.register(this, '!price unset', this.unsetPrice, constants.OWNER_ONLY)
    global.parser.register(this, '!price', this.help, constants.OWNER_ONLY)

    global.parser.registerParser('price', this.checkPrice, constants.VIEWERS)
  }

  console.log('Price system (dependency on Points system) loaded and ' + (global.configuration.get().systems.price === true && global.configuration.get().systems.points === true ? chalk.green('enabled') : chalk.red('disabled')))
}

Price.prototype.help = function () {
  var text = 'Usage: !price set <cmd> <price> | !price unset <cmd> | !price list'
  global.client.action(global.configuration.get().twitch.owner, text)
}

Price.prototype.setPrice = function (self, user, text) {
  if (text.length < 1) {
    global.client.action(global.configuration.get().twitch.owner, 'Price error: Cannot set price for empty command')
    return
  }

  // check if response after keyword is set
  if (text.split(' ').length <= 1) {
    global.client.action(global.configuration.get().twitch.owner, 'Price error: Cannot set empty price for command')
    return
  }

  var cmd = text.split(' ')[0]
  var price = parseInt(text.replace(cmd, '').trim(), 10)

  if (!Number.isInteger(price)) {
    global.client.action(global.configuration.get().twitch.owner, 'Price error: Cannot set NaN price.')
    return
  }

  global.botDB.find({type: 'price', command: cmd}, function (err, docs) {
    if (err) console.log(err)
    if (docs.length === 0) {
      global.botDB.insert({type: 'price', command: cmd, price: price})
    } else {
      global.botDB.update({type: 'price', command: cmd}, {$set: {price: price}}, {})
    }
    global.client.action(global.configuration.get().twitch.owner, 'Price#' + cmd + ' succesfully set to ' + price)
  })
}

Price.prototype.unsetPrice = function (self, user, msg) {
  global.botDB.remove({type: 'price', command: msg}, {}, function (err, numRemoved) {
    if (err) console.log(err)
    var output = (numRemoved === 0 ? 'Price#' + msg + " wasn't set." : 'Price#' + msg + ' is succesfully unset.')
    global.client.action(global.configuration.get().twitch.owner, output)
  })
}

Price.prototype.listPrices = function (self, user, msg) {
  global.botDB.find({type: 'price'}, function (err, docs) {
    if (err) console.log(err)
    var ids = []
    docs.forEach(function (e, i, ar) { ids.push(e.command + ':' + e.price) })
    var output = (docs.length === 0 ? 'Price list is empty.' : 'Price list: ' + ids.join(', ') + '.')
    global.client.action(global.configuration.get().twitch.owner, output)
  })
}

Price.prototype.checkPrice = function (id, user, msg) {
  global.botDB.find({$or: [{type: 'price', $where: function () { return msg.search(new RegExp('(?:^\\!)(' + this.command + ')(?=\\s|$|\\?|\\!|\\.|\\,)', 'g')) >= 0 }}, {type: 'points', username: user.username}]}, function (err, items) {
    if (err) console.log(err)
    var price = !_.isUndefined(items[0]) && items[0].type === 'price' ? parseInt(items[0].price, 10) : 0
    var points = !_.isUndefined(items[1]) && items[1].type === 'points' ? parseInt(items[1].points, 10) : 0
    global.updateQueue(id, price === 0 || points >= price)
    price === 0 || points >= price ? global.botDB.update({type: 'points', username: user.username}, {$set: {points: points - price}}, {}) : global.commons.sendMessage('Sorry, ' + user.username + ', you need ' + price + ' Points for !' + items[0].command)
  })
}

module.exports = new Price()

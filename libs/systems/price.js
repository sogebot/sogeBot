'use strict'

var chalk = require('chalk')
var constants = require('../constants')

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
  if (!msg.startsWith('!')) {
    global.updateQueue(id, true) // we want to parse _ONLY_ commands
    return true
  }

  global.botDB.find({type: 'price'}, function (err, items) {
    if (err) console.log(err)
    var itemFound = false
    for (var item in items) {
      if (items.hasOwnProperty(item)) {
        var position = msg.toLowerCase().indexOf('!' + items[item].command)
        var kwLength = items[item].command.length + 1
        var price = items[item].price
        var command = items[item].command

        if (position >= 0 && typeof msg[position - 1] === 'undefined' &&
          (msg[position + kwLength] === ' ' || typeof msg[position + kwLength] === 'undefined')) {
          itemFound = true
          global.botDB.findOne({type: 'points', username: user.username}, function (err, item) {
            if (err) console.log(err)
            var points = (typeof item !== 'undefined' && item !== null ? item.points : 0)
            if (points >= price) {
              global.botDB.update({type: 'points', username: user.username}, {$set: {points: points - price}}, {})
              global.updateQueue(id, true)
            } else {
              global.client.action(global.configuration.get().twitch.owner, 'Sorry, ' + user.username + ', you need ' + price + ' Points for !' + command)
              global.updateQueue(id, false)
            }
          })
        }
        break
      }
    }
    if (!itemFound) global.updateQueue(id, true)
  })
}

module.exports = new Price()

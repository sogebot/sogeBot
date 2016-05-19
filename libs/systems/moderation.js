'use strict'

var chalk = require('chalk')
var constants = require('../constants')

function Moderation () {
  if (global.configuration.get().systems.moderation === true) {
    global.parser.register(this, '!permit', this.permitLink, constants.OWNER_ONLY)

    global.parser.registerParser('moderationLinks', this.containsLink, constants.VIEWERS)
    global.parser.registerParser('moderationSymbols', this.symbols, constants.VIEWERS)
  }

  console.log('Moderation system loaded and ' + (global.configuration.get().systems.moderation === true ? chalk.green('enabled') : chalk.red('disabled')))
}

Moderation.prototype.permitLink = function (self, sender, text) {
  if (text.length < 1) return
  global.botDB.insert({type: 'permitLink', username: text.trim()})
  global.client.action(global.configuration.get().twitch.owner, 'User ' + text.trim() + ' is permitted to post a link.')
}

Moderation.prototype.containsLink = function (id, sender, text) {
  var urlRegex = /(https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/ig
  if (text.search(urlRegex) >= 0 && sender.username !== global.configuration.get().owner) {
    global.botDB.findOne({type: 'permitLink', username: sender.username}, function (err, item) {
      if (err) console.log(err)
      try {
        global.botDB.remove({_id: item._id}, {}, function (err, numRemoved) {
          if (err) console.log(err)
          console.log(numRemoved)
          if (numRemoved === 1) global.updateQueue(id, true)
          else global.updateQueue(id, false)
        })
      } catch (err) {
        global.client.timeout(global.configuration.get().twitch.owner, sender.username, 5)
        global.client.action(global.configuration.get().twitch.owner, 'Sorry, ' + sender.username + ', no links allowed. Ask for !permit first')
        global.updateQueue(id, false)
      }
    })
  } else {
    global.updateQueue(id, true)
  }
}

Moderation.prototype.symbols = function (id, sender, text) {
  var timeout = 20
  var triggerLength = 10
  var msgLength = text.trim().length
  var maxSymbolsConsecutively = 10
  var maxSymbolsPercent = 20
  if (msgLength <= triggerLength) {
    global.updateQueue(id, true)
    return
  }

  var symbolRegex = /([^\s\w]+)/g
  var symbolsLength = 0
  var out = text.match(symbolRegex)
  for (var item in out) {
    if (out.hasOwnProperty(item)) {
      var symbols = out[item]
      if (symbols.length >= maxSymbolsConsecutively) {
        global.updateQueue(id, false)
        global.client.timeout(global.configuration.get().twitch.owner, sender.username, timeout)
        global.client.action(global.configuration.get().twitch.owner, 'Sorry, ' + sender.username + ', no excessive symbols usage')
        return
      }
      symbolsLength = symbolsLength + symbols.length
    }
  }
  if (symbolsLength / (msgLength / 100) >= maxSymbolsPercent) {
    global.updateQueue(id, false)
    global.client.timeout(global.configuration.get().twitch.owner, sender.username, timeout)
    global.client.action(global.configuration.get().twitch.owner, 'Sorry, ' + sender.username + ', no excessive symbols usage')
    return
  }

  global.updateQueue(id, true)
}

module.exports = new Moderation()

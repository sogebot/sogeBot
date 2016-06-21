'use strict'

var chalk = require('chalk')
var constants = require('../constants')
var _ = require('lodash')
var log = global.log

function Moderation () {
  if (global.configuration.get().systems.moderation === true) {
    global.parser.register(this, '!permit', this.permitLink, constants.OWNER_ONLY)

    global.parser.registerParser('moderationLinks', this.containsLink, constants.VIEWERS)
    global.parser.registerParser('moderationSymbols', this.symbols, constants.VIEWERS)
    global.parser.registerParser('moderationLongMessage', this.longMessage, constants.VIEWERS)
    global.parser.registerParser('moderationCaps', this.caps, constants.VIEWERS)
    global.parser.registerParser('moderationSpam', this.spam, constants.VIEWERS)
  }

  log.info('Moderation system ' + global.translate('core.loaded') + ' ' + (global.configuration.get().systems.moderation === true ? chalk.green(global.translate('core.enabled')) : chalk.red(global.translate('core.disabled'))))
}

Moderation.prototype.permitLink = function (self, sender, text) {
  try {
    var parsed = text.match(/^(\w+)$/)
    global.botDB.insert({type: 'permitLink', username: parsed[0].toLowerCase()})
    global.commons.sendMessage(global.translate('moderation.permit').replace('(who)', parsed[0]))
  } catch (e) {
    global.commons.sendMessage(global.translate('moderation.failed.parsePermit'), sender)
  }
}

Moderation.prototype.containsLink = function (id, sender, text) {
  if (global.parser.isOwner(sender)) {
    global.updateQueue(id, true)
    return
  }

  var urlRegex = /(https?:\/\/(?:www\.(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,}|[^\s]+\.[^\s]{2,})/ig
  if (text.search(urlRegex) >= 0) {
    global.botDB.findOne({type: 'permitLink', username: sender.username}, function (err, item) {
      if (err) log.error(err)
      try {
        global.botDB.remove({_id: item._id}, {}, function (err, numRemoved) {
          if (err) log.error(err)
          if (numRemoved === 1) global.updateQueue(id, true)
          else global.updateQueue(id, false)
        })
      } catch (err) {
        log.info(sender.username + ' [link] timeout: ' + text)
        global.commons.timeout(sender.username, global.translate('moderation.links'), 5)
        global.updateQueue(id, false)
      }
    })
  } else {
    global.updateQueue(id, true)
  }
}

Moderation.prototype.symbols = function (id, sender, text) {
  var timeout = 20
  var triggerLength = 15
  var msgLength = text.trim().length
  var maxSymbolsConsecutively = 10
  var maxSymbolsPercent = 50
  var symbolsLength = 0

  if (global.parser.isOwner(sender) || msgLength <= triggerLength) {
    global.updateQueue(id, true)
    return
  }

  var out = text.match(/([^\s\w]+)/g)
  for (var item in out) {
    if (out.hasOwnProperty(item)) {
      var symbols = out[item]
      if (symbols.length >= maxSymbolsConsecutively) {
        global.updateQueue(id, false)
        log.info(sender.username + ' [symbols] timeout: ' + text)
        global.commons.timeout(sender.username, global.translate('moderation.symbols'), timeout)
        return
      }
      symbolsLength = symbolsLength + symbols.length
    }
  }
  if (Math.ceil(symbolsLength / (msgLength / 100)) >= maxSymbolsPercent) {
    global.updateQueue(id, false)
    log.info(sender.username + ' [symbols] timeout: ' + text)
    global.commons.timeout(sender.username, global.translate('moderation.symbols'), timeout)
    return
  }
  global.updateQueue(id, true)
}

Moderation.prototype.longMessage = function (id, sender, text) {
  var timeout = 20
  var triggerLength = 300
  var msgLength = text.trim().length
  if (global.parser.isOwner(sender) || msgLength < triggerLength) {
    global.updateQueue(id, true)
  } else {
    global.updateQueue(id, false)
    log.info(sender.username + ' [longMessage] timeout: ' + text)
    global.commons.timeout(sender.username, global.translate('moderation.longMessage'), timeout)
  }
}

Moderation.prototype.caps = function (id, sender, text) {
  var timeout = 20
  var triggerLength = 15
  var msgLength = text.trim().length
  var maxCapsPercent = 50
  var capsLength = 0

  if (global.parser.isOwner(sender) || msgLength <= triggerLength) {
    global.updateQueue(id, true)
    return
  }
  var out = text.match(/([A-Z]+)/g)
  for (var item in out) {
    if (out.hasOwnProperty(item)) {
      capsLength = capsLength + out[item].length
    }
  }
  if (Math.ceil(capsLength / (msgLength / 100)) >= maxCapsPercent) {
    global.updateQueue(id, false)
    log.info(sender.username + ' [caps] timeout: ' + text)
    global.commons.timeout(sender.username, global.translate('moderation.caps'), timeout)
    return
  }
  global.updateQueue(id, true)
}

Moderation.prototype.spam = function (id, sender, text) {
  var timeout = 300
  var triggerLength = 15
  var msgLength = text.trim().length
  var maxSpamLength = 15

  if (global.parser.isOwner(sender) || msgLength <= triggerLength) {
    global.updateQueue(id, true)
    return
  }
  var out = text.match(/(.+)(\1+)/g)
  for (var item in out) {
    if (out.hasOwnProperty(item) && out[item].length >= maxSpamLength) {
      global.updateQueue(id, false)
      log.info(sender.username + ' [spam] timeout: ' + text)
      global.commons.timeout(sender.username, global.translate('moderation.spam'), timeout)
      break
    }
  }
  global.updateQueue(id, true)
}

module.exports = new Moderation()

'use strict'

var chalk = require('chalk')
var constants = require('../constants')
var _ = require('lodash')
var log = global.log
var translate = global.translate

function Moderation () {
  if (global.configuration.get().systems.moderation === true) {
    global.parser.register(this, '!permit', this.permitLink, constants.OWNER_ONLY)

    global.parser.registerParser(this, 'moderationLinks', this.containsLink, constants.VIEWERS)
    global.parser.registerParser(this, 'moderationSymbols', this.symbols, constants.VIEWERS)
    global.parser.registerParser(this, 'moderationLongMessage', this.longMessage, constants.VIEWERS)
    global.parser.registerParser(this, 'moderationCaps', this.caps, constants.VIEWERS)
    global.parser.registerParser(this, 'moderationSpam', this.spam, constants.VIEWERS)

    global.configuration.register('moderationLinks', translate('moderation.settings.moderationLinks'), 'bool', true)
    global.configuration.register('moderationSymbols', translate('moderation.settings.moderationSymbols'), 'bool', true)
    global.configuration.register('moderationLongMessage', translate('moderation.settings.moderationLongMessage'), 'bool', true)
    global.configuration.register('moderationCaps', translate('moderation.settings.moderationCaps'), 'bool', true)
    global.configuration.register('moderationSpam', translate('moderation.settings.moderationSpam'), 'bool', true)
  }

  log.info('Moderation system ' + translate('core.loaded') + ' ' + (global.configuration.get().systems.moderation === true ? chalk.green(translate('core.enabled')) : chalk.red(translate('core.disabled'))))
}

Moderation.prototype.whitelisted = function (text) {
  // TODO: it's hardcoded now just for youtube
  var urlRegex = /^!.*(?:youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)[^#&\?]*.*/
  var match = text.trim().match(urlRegex)
  return !_.isNull(match)
}

Moderation.prototype.permitLink = function (self, sender, text) {
  try {
    var parsed = text.match(/^(\w+)$/)
    global.botDB.insert({type: 'permitLink', username: parsed[0].toLowerCase()})
    global.commons.sendMessage(translate('moderation.permit').replace('(who)', parsed[0]))
  } catch (e) {
    global.commons.sendMessage(translate('moderation.failed.parsePermit'), sender)
  }
}

Moderation.prototype.containsLink = function (self, id, sender, text) {
  if (global.parser.isOwner(sender) || !global.configuration.getValue('moderationLinks') || self.whitelisted(text)) {
    global.updateQueue(id, true)
    return
  }

  var urlRegex = /[a-zA-Z0-9]+([a-zA-Z0-9-.]+)?\.(aero|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|ac|ad|ae|af|ag|ai|al|am|an|ao|aq|ar|as|at|au|aw|az|ba|bb|bd|be|bf|bg|bh|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|cr|cs|cu|cv|cx|cy|cz|de|dj|dk|dm|do|dz|ec|ee|eg|eh|er|es|et|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|in|io|iq|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|mg|mh|mk|ml|mm|mn|mo|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|mz|na|nc|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|ps|pt|pw|py|qa|re|ro|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|sk|sl|sm|sn|so|sr|st|su|sv|sy|sz|tc|td|tf|tg|th|tj|tk|tm|tn|to|tp|tr|tt|tv|tw|tz|ua|ug|uk|um|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|ye|yt|yu|za|zm|zr|zw)\b/ig
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
        global.commons.timeout(sender.username, translate('moderation.links'), 5)
        global.updateQueue(id, false)
      }
    })
  } else {
    global.updateQueue(id, true)
  }
}

Moderation.prototype.symbols = function (self, id, sender, text) {
  var timeout = 20
  var triggerLength = 15
  var msgLength = text.trim().length
  var maxSymbolsConsecutively = 10
  var maxSymbolsPercent = 50
  var symbolsLength = 0

  if (global.parser.isOwner(sender) || msgLength <= triggerLength || !global.configuration.getValue('moderationSymbols')) {
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
        global.commons.timeout(sender.username, translate('moderation.symbols'), timeout)
        return
      }
      symbolsLength = symbolsLength + symbols.length
    }
  }
  if (Math.ceil(symbolsLength / (msgLength / 100)) >= maxSymbolsPercent) {
    global.updateQueue(id, false)
    log.info(sender.username + ' [symbols] timeout: ' + text)
    global.commons.timeout(sender.username, translate('moderation.symbols'), timeout)
    return
  }
  global.updateQueue(id, true)
}

Moderation.prototype.longMessage = function (self, id, sender, text) {
  var timeout = 20
  var triggerLength = 300
  var msgLength = text.trim().length
  if (global.parser.isOwner(sender) || msgLength < triggerLength || !global.configuration.getValue('moderationLongMessage')) {
    global.updateQueue(id, true)
  } else {
    global.updateQueue(id, false)
    log.info(sender.username + ' [longMessage] timeout: ' + text)
    global.commons.timeout(sender.username, translate('moderation.longMessage'), timeout)
  }
}

Moderation.prototype.caps = function (self, id, sender, text) {
  var timeout = 20
  var triggerLength = 15
  var msgLength = text.trim().length
  var maxCapsPercent = 50
  var capsLength = 0

  if (global.parser.isOwner(sender) || msgLength <= triggerLength || !global.configuration.getValue('moderationCaps')) {
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
    global.commons.timeout(sender.username, translate('moderation.caps'), timeout)
    return
  }
  global.updateQueue(id, true)
}

Moderation.prototype.spam = function (self, id, sender, text) {
  var timeout = 300
  var triggerLength = 15
  var msgLength = text.trim().length
  var maxSpamLength = 15

  if (global.parser.isOwner(sender) || msgLength <= triggerLength || !global.configuration.getValue('moderationSpam')) {
    global.updateQueue(id, true)
    return
  }
  var out = text.match(/(.+)(\1+)/g)
  for (var item in out) {
    if (out.hasOwnProperty(item) && out[item].length >= maxSpamLength) {
      global.updateQueue(id, false)
      log.info(sender.username + ' [spam] timeout: ' + text)
      global.commons.timeout(sender.username, translate('moderation.spam'), timeout)
      break
    }
  }
  global.updateQueue(id, true)
}

module.exports = new Moderation()

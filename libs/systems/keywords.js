'use strict'

var chalk = require('chalk')
var constants = require('../constants')
var _ = require('lodash')
var log = global.log

function Keywords () {
  if (global.configuration.get().systems.keywords === true) {
    global.parser.register(this, '!keyword add', this.add, constants.OWNER_ONLY)
    global.parser.register(this, '!keyword list', this.list, constants.OWNER_ONLY)
    global.parser.register(this, '!keyword remove', this.remove, constants.OWNER_ONLY)
    global.parser.register(this, '!keyword', this.help, constants.OWNER_ONLY)

    global.parser.registerParser('keywords', this.run, constants.VIEWERS)
  }
  log.info('Keywords system ' + global.translate('core.loaded') + ' ' + (global.configuration.get().systems.keywords === true ? chalk.green(global.translate('core.enabled')) : chalk.red(global.translate('core.disabled'))))
}

Keywords.prototype.help = function (self, sender) {
  global.commons.sendMessage(global.translate('core.usage') + ': !keyword add <keyword> <response> | !keyword remove <keyword> | !keyword list', sender)
}

Keywords.prototype.add = function (self, sender, text) {
  try {
    var parsed = text.match(/^(\w+) (\w+)$/)
    global.commons.insertIfNotExists({__id: 'kwd_' + parsed[1], _keyword: parsed[1], response: parsed[2], success: global.translate('keywords.success.add'), error: global.translate('keywords.failed.add')})
  } catch (e) {
    global.commons.sendMessage(global.translate('keywords.failed.parse'), sender)
  }
}

Keywords.prototype.run = function (id, user, msg) {
  global.botDB.find({$where: function () { return this._id.startsWith('kwd') && msg.search(new RegExp('^(?!\\!)(?:^|\\s).*(' + this.keyword + ')(?=\\s|$|\\?|\\!|\\.|\\,)', 'g')) >= 0 }}, function (err, items) {
    if (err) log.error(err)
    _.each(items, function (item) { global.commons.sendMessage(item.response) })
    global.updateQueue(id, true)
  })
}

Keywords.prototype.list = function (self, sender, text) {
  var parsed = text.match(/^(\w+)$/)
  if (_.isNull(parsed)) {
    global.botDB.find({$where: function () { return this._id.startsWith('kwd') }}, function (err, docs) {
      if (err) { log.error(err) }
      var keywords = []
      docs.forEach(function (e, i, ar) { keywords.push(e.keyword) })
      var output = (docs.length === 0 ? global.translate('keywords.failed.list') : global.translate('keywords.success.list') + ': ' + keywords.join(', '))
      global.commons.sendMessage(output, sender)
    })
  } else {
    global.commons.sendMessage(global.translate('keywords.failed.parse', sender))
  }
}

Keywords.prototype.remove = function (self, sender, text) {
  try {
    var parsed = text.match(/^(\w+)$/)
    global.commons.remove({__id: 'kwd_' + parsed[1], success: global.translate('keywords.success.remove'), error: global.translate('keywords.failed.remove')})
  } catch (e) {
    global.commons.sendMessage(global.translate('keywords.failed.parse'), sender)
  }
}

module.exports = new Keywords()

'use strict'

// 3rdparty libraries
var _ = require('lodash')
// bot libraries
var constants = require('../constants')
var log = global.log

function Keywords () {
  if (global.commons.isSystemEnabled(this)) {
    global.parser.register(this, '!keyword add', this.add, constants.OWNER_ONLY)
    global.parser.register(this, '!keyword list', this.list, constants.OWNER_ONLY)
    global.parser.register(this, '!keyword remove', this.remove, constants.OWNER_ONLY)
    global.parser.register(this, '!keyword', this.help, constants.OWNER_ONLY)

    global.parser.registerHelper('!keyword')

    global.parser.registerParser(this, 'keywords', this.run, constants.VIEWERS)

    this.webPanel()
  }
}

Keywords.prototype.webPanel = function () {
  global.panel.addMenu({category: 'systems', name: 'Keywords', id: 'keywords'})
  global.panel.socketListening(this, 'getKeywords', this.sendKeywords)
  global.panel.socketListening(this, 'deleteKeyword', this.deleteKeywords)
  global.panel.socketListening(this, 'createKeyword', this.createKeywords)
}

Keywords.prototype.sendKeywords = function (self, socket) {
  global.botDB.find({$where: function () { return this._id.startsWith('kwd') }}, function (err, items) {
    if (err) { log.error(err) }
    socket.emit('Keywords', items)
  })
}

Keywords.prototype.deleteKeywords = function (self, socket, data) {
  self.remove(self, null, data)
  self.sendKeywords(self, socket)
}

Keywords.prototype.createKeywords = function (self, socket, data) {
  self.add(self, null, data.keyword + ' ' + data.response)
  self.sendKeywords(self, socket)
}

Keywords.prototype.help = function (self, sender) {
  global.commons.sendMessage(global.translate('core.usage') + ': !keyword add <keyword> <response> | !keyword remove <keyword> | !keyword list', sender)
}

Keywords.prototype.add = function (self, sender, text) {
  try {
    var parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+) (.*)$/)
    if (parsed[2].trim().length === 0) throw Boolean(true)
    global.commons.insertIfNotExists({__id: 'kwd_' + parsed[1], _keyword: parsed[1], response: parsed[2].trim(), success: 'keywords.success.add', error: 'keywords.failed.add'})
  } catch (e) {
    global.commons.sendMessage(global.translate('keywords.failed.parse'), sender)
  }
}

Keywords.prototype.run = function (self, id, sender, text) {
  global.botDB.find({$where: function () { return this._id.startsWith('kwd') && text.search(new RegExp('^(?!\\!)(?:^|\\s).*(' + this.keyword + ')(?=\\s|$|\\?|\\!|\\.|\\,)', 'g')) >= 0 }}, function (err, items) {
    if (err) log.error(err)
    _.each(items, function (item) { global.commons.sendMessage(item.response) })
    global.updateQueue(id, true)
  })
}

Keywords.prototype.list = function (self, sender, text) {
  var parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+)$/)
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
    var parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+)$/)
    global.commons.remove({__id: 'kwd_' + parsed[1], success: 'keywords.success.remove', error: 'keywords.failed.remove'})
  } catch (e) {
    global.commons.sendMessage(global.translate('keywords.failed.parse'), sender)
  }
}

module.exports = new Keywords()

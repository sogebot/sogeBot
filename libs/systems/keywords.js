'use strict'

// 3rdparty libraries
var _ = require('lodash')
// bot libraries
var constants = require('../constants')
var log = global.log

const ERROR_ALREADY_EXISTS = '0'
const ERROR_DOESNT_EXISTS = '1'

/*
 * !keyword                      - gets an info about keyword usage
 * !keyword add [kwd] [response] - add keyword with specified response
 * !keyword remove [kwd]         - remove specified keyword
 * !keyword toggle [kwd]         - enable/disable specified keyword
 * !keyword list                 - get keywords list
 */

function Keywords () {
  this.keywords = []

  if (global.commons.isSystemEnabled(this)) {
    global.parser.register(this, '!keyword add', this.add, constants.OWNER_ONLY)
    global.parser.register(this, '!keyword list', this.list, constants.OWNER_ONLY)
    global.parser.register(this, '!keyword remove', this.remove, constants.OWNER_ONLY)
    global.parser.register(this, '!keyword toggle', this.toggle, constants.OWNER_ONLY)
    global.parser.register(this, '!keyword', this.help, constants.OWNER_ONLY)

    global.parser.registerHelper('!keyword')

    global.watcher.watch(this, 'keywords', this._save)
    this._update(this)

    global.parser.registerParser(this, 'keywords', this.run, constants.VIEWERS)

    this.webPanel()
  }
}

Keywords.prototype._update = function (self) {
  global.botDB.findOne({ _id: 'keywords' }, function (err, item) {
    if (err) return log.error(err, { fnc: 'Keywords.prototype._update' })
    if (_.isNull(item)) return
    self.keywords = item.keywords
  })
}

Keywords.prototype._save = function (self) {
  let keywords = { keywords: self.keywords }
  global.botDB.update({ _id: 'keywords' }, { $set: keywords }, { upsert: true })
}

Keywords.prototype.webPanel = function () {
  global.panel.addMenu({category: 'manage', name: 'keywords', id: 'keywords'})
  global.panel.socketListening(this, 'keywords.get', this.sendKeywords)
  global.panel.socketListening(this, 'keywords.delete', this.deleteKeywords)
  global.panel.socketListening(this, 'keywords.create', this.createKeywords)
  global.panel.socketListening(this, 'keywords.toggle', this.toggleKeywords)
  global.panel.socketListening(this, 'keywords.edit', this.editKeywords)
}

Keywords.prototype.sendKeywords = function (self, socket) {
  socket.emit('keywords.update', self.keywords)
}

Keywords.prototype.deleteKeywords = function (self, socket, data) {
  self.remove(self, null, data)
  self.sendKeywords(self, socket)
}

Keywords.prototype.toggleKeywords = function (self, socket, data) {
  self.toggle(self, null, data)
  self.sendKeywords(self, socket)
}

Keywords.prototype.createKeywords = function (self, socket, data) {
  self.add(self, null, data.keyword + ' ' + data.response)
  self.sendKeywords(self, socket)
}

Keywords.prototype.editKeywords = function (self, socket, data) {
  if (data.value.length === 0) self.remove(self, null, data.id)
  else _.find(self.keywords, function (o) { return o.keyword === data.id }).response = data.value
  self.sendKeywords(self, socket)
}

Keywords.prototype.help = function (self, sender) {
  global.commons.sendMessage(global.translate('core.usage') + ': !keyword add <keyword> <response> | !keyword remove <keyword> | !keyword list', sender)
}

Keywords.prototype.add = function (self, sender, text) {
  try {
    let parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w\S]+) (.*)$/)
    let keyword = { keyword: parsed[1], response: parsed[2], enabled: true }
    if (!_.isUndefined(_.find(self.keywords, function (o) { return o.keyword === keyword.keyword }))) throw Error(ERROR_ALREADY_EXISTS)
    self.keywords.push(keyword)
    global.commons.sendMessage(global.translate('keywords.success.add'), sender)
  } catch (e) {
    switch (e.message) {
      case ERROR_ALREADY_EXISTS:
        global.commons.sendMessage(global.translate('keywords.failed.add'), sender)
        break
      default:
        global.commons.sendMessage(global.translate('keywords.failed.parse'), sender)
    }
  }
}

Keywords.prototype.run = function (self, id, sender, text) {
  let keywords = _.filter(self.keywords, function (o) {
    return text.search(new RegExp('^(?!\\!)(?:^|\\s).*(' + _.escapeRegExp(o.keyword) + ')(?=\\s|$|\\?|\\!|\\.|\\,)', 'gi')) >= 0
  })
  _.each(keywords, function (o) { if (o.enabled) global.commons.sendMessage(o.response, sender) })
  global.updateQueue(id, true)
}

Keywords.prototype.list = function (self, sender, text) {
  let keywords = []
  _.each(self.keywords, function (element) { keywords.push(element.keyword) })
  let output = (keywords.length === 0 ? global.translate('keywords.failed.list') : global.translate('keywords.success.list') + ': ' + keywords.join(', '))
  global.commons.sendMessage(output, sender)
}

Keywords.prototype.toggle = function (self, sender, text) {
  try {
    let parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w\S]+)$/)[1]
    let keyword = _.find(self.keywords, function (o) { return o.keyword === parsed })
    if (_.isUndefined(keyword)) {
      global.commons.sendMessage(global.translate('keywords.failed.toggle')
        .replace('(keyword)', parsed), sender)
      return
    }

    keyword.enabled = !keyword.enabled
    global.commons.sendMessage(global.translate(keyword.enabled ? 'keywords.success.enabled' : 'keywords.success.disabled')
      .replace('(keyword)', keyword.keyword), sender)
  } catch (e) {
    global.commons.sendMessage(global.translate('keywords.failed.parse'), sender)
  }
}

Keywords.prototype.remove = function (self, sender, text) {
  try {
    let parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w\S]+)$/)
    if (_.isUndefined(_.find(self.keywords, function (o) { return o.keyword === parsed[1] }))) throw Error(ERROR_DOESNT_EXISTS)
    self.keywords = _.filter(self.keywords, function (o) { return o.keyword !== parsed[1] })
    global.commons.sendMessage(global.translate('keywords.success.remove'), sender)
  } catch (e) {
    switch (e.message) {
      case ERROR_DOESNT_EXISTS:
        global.commons.sendMessage(global.translate('keywords.failed.remove'), sender)
        break
      default:
        global.commons.sendMessage(global.translate('keywords.failed.parse'), sender)
    }
  }
}

module.exports = new Keywords()

'use strict'

// 3rdparty libraries
var _ = require('lodash')
// bot libraries
var constants = require('../constants')

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
  if (global.commons.isSystemEnabled(this)) {
    global.parser.register(this, '!keyword add', this.add, constants.OWNER_ONLY)
    global.parser.register(this, '!keyword list', this.list, constants.OWNER_ONLY)
    global.parser.register(this, '!keyword remove', this.remove, constants.OWNER_ONLY)
    global.parser.register(this, '!keyword toggle', this.toggle, constants.OWNER_ONLY)
    global.parser.register(this, '!keyword', this.help, constants.OWNER_ONLY)

    global.parser.registerHelper('!keyword')

    global.parser.registerParser(this, 'keywords', this.run, constants.VIEWERS)

    this.webPanel()
  }
}

Keywords.prototype.webPanel = function () {
  global.panel.addMenu({category: 'manage', name: 'keywords', id: 'keywords'})
  global.panel.socketListening(this, 'keywords.get', this.sendKeywords)
  global.panel.socketListening(this, 'keywords.delete', this.deleteKeywords)
  global.panel.socketListening(this, 'keywords.create', this.createKeywords)
  global.panel.socketListening(this, 'keywords.toggle', this.toggleKeywords)
  global.panel.socketListening(this, 'keywords.edit', this.editKeywords)
}

Keywords.prototype.sendKeywords = async function (self, socket) {
  socket.emit('keywords.update', await global.db.engine.find('keywords'))
}

Keywords.prototype.deleteKeywords = function (self, socket, data) {
  self.remove(self, null, data)
  self.sendKeywords(self, socket)
}

Keywords.prototype.toggleKeywords = async function (self, socket, data) {
  await self.toggle(self, null, data)
  self.sendKeywords(self, socket)
}

Keywords.prototype.createKeywords = function (self, socket, data) {
  self.add(self, null, data.keyword + ' ' + data.response)
  self.sendKeywords(self, socket)
}

Keywords.prototype.editKeywords = async function (self, socket, data) {
  if (data.value.length === 0) self.remove(self, null, data.id)
  else await global.db.engine.update('keywords', { keyword: data.id }, { response: data.value })
  self.sendKeywords(self, socket)
}

Keywords.prototype.help = function (self, sender) {
  global.commons.sendMessage(global.translate('core.usage') + ': !keyword add <keyword> <response> | !keyword remove <keyword> | !keyword list', sender)
}

Keywords.prototype.add = async function (self, sender, text) {
  try {
    let parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w\S]+) (.*)$/)
    let keyword = { keyword: parsed[1], response: parsed[2], enabled: true }

    if (!_.isEmpty(await global.db.engine.findOne('keywords', { keyword: parsed[1] }))) throw Error(ERROR_ALREADY_EXISTS)

    global.db.engine.update('keywords', { keyword: parsed[1] }, keyword)
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

Keywords.prototype.run = async function (self, id, sender, text) {
  let keywords = await global.db.engine.find('keywords')
  keywords = _.filter(keywords, function (o) {
    return text.search(new RegExp('^(?!\\!)(?:^|\\s).*(' + _.escapeRegExp(o.keyword) + ')(?=\\s|$|\\?|\\!|\\.|\\,)', 'gi')) >= 0
  })
  _.each(keywords, function (o) { if (o.enabled) global.commons.sendMessage(o.response, sender) })
  global.updateQueue(id, true)
}

Keywords.prototype.list = async function (self, sender, text) {
  let keywords = await global.db.engine.find('keywords')
  var output = (keywords.length === 0 ? global.translate('keywords.failed.list') : global.translate('keywords.success.list') + ': ' + _.map(keywords, 'keyword').join(', '))
  global.commons.sendMessage(output, sender)
}

Keywords.prototype.toggle = async function (self, sender, text) {
  try {
    const id = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+)$/)[1]
    const keyword = await global.db.engine.findOne('keywords', { keyword: id })
    if (_.isEmpty(keyword)) {
      global.commons.sendMessage(global.translate('keywords.failed.toggle')
        .replace(/\$keyword/g, id), sender)
      return
    }

    await global.db.engine.update('keywords', { keyword: id }, { enabled: !keyword.enabled })

    global.commons.sendMessage(global.translate(keyword.enabled ? 'keywords.success.enabled' : 'keywords.success.disabled')
      .replace(/\$keyword/g, keyword.keyword), sender)
  } catch (e) {
    global.commons.sendMessage(global.translate('keywords.failed.parse'), sender)
  }
}

Keywords.prototype.remove = async function (self, sender, text) {
  try {
    let id = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+)$/)[1]
    let removed = await global.db.engine.remove('keywords', { keyword: id })
    if (!removed) throw Error(ERROR_DOESNT_EXISTS)
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

'use strict'

// 3rdparty libraries
const _ = require('lodash')
const debug = require('debug')('systems:keywords')
const XRegExp = require('xregexp')

// bot libraries
var constants = require('../constants')
const Message = require('../message')

/*
 * !keyword                      - gets an info about keyword usage
 * !keyword add [kwd] [response] - add keyword with specified response
 * !keyword edit [kwd] [response] - add keyword with specified response
 * !keyword remove [kwd]         - remove specified keyword
 * !keyword toggle [kwd]         - enable/disable specified keyword
 * !keyword list                 - get keywords list
 */

class Keywords {
  constructor () {
    if (global.commons.isSystemEnabled(this) && require('cluster').isMaster) {
      global.panel.addMenu({category: 'manage', name: 'keywords', id: 'keywords'})
      global.panel.registerSockets({
        self: this,
        expose: ['add', 'remove', 'toggle', 'editKeyword', 'editResponse', 'send'],
        finally: this.send
      })
    }
  }

  commands () {
    return !global.commons.isSystemEnabled('keywords')
      ? []
      : [
        {this: this, command: '!keyword add', fnc: this.add, permission: constants.OWNER_ONLY},
        {this: this, command: '!keyword edit', fnc: this.edit, permission: constants.OWNER_ONLY},
        {this: this, command: '!keyword list', fnc: this.list, permission: constants.OWNER_ONLY},
        {this: this, command: '!keyword remove', fnc: this.remove, permission: constants.OWNER_ONLY},
        {this: this, command: '!keyword toggle', fnc: this.toggle, permission: constants.OWNER_ONLY},
        {this: this, command: '!keyword', fnc: this.help, permission: constants.OWNER_ONLY}
      ]
  }

  parsers () {
    return [
      {this: this, name: 'keywords', fnc: this.run, permission: constants.VIEWERS, priority: constants.LOW}
    ]
  }

  async edit (self, sender, text) {
    debug('edit(%j, %j, %j)', self, sender, text)
    const match = XRegExp.exec(text, constants.KEYWORD_REGEXP)

    if (_.isNil(match)) {
      let message = global.commons.prepare('keywords.keyword-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    let item = await global.db.engine.findOne('keywords', { keyword: match.keyword })
    if (_.isEmpty(item)) {
      let message = global.commons.prepare('keywords.keyword-was-not-found', { keyword: match.keyword })
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    await global.db.engine.update('keywords', { keyword: match.keyword }, { response: match.response })
    let message = global.commons.prepare('keywords.keyword-was-edited', { keyword: match.keyword, response: match.response })
    debug(message); global.commons.sendMessage(message, sender)
  }

  async send (self, socket) {
    socket.emit('keywords', await global.db.engine.find('keywords'))
  }

  async editKeyword (self, socket, data) {
    if (data.value.length === 0) self.remove(self, null, data.id)
    else await global.db.engine.update('keywords', { keyword: data.id }, { keyword: data.value })
  }

  async editResponse (self, socket, data) {
    if (data.value.length === 0) self.remove(self, null, data.id)
    else await global.db.engine.update('keywords', { keyword: data.id }, { response: data.value })
  }

  help (self, sender) {
    global.commons.sendMessage(global.translate('core.usage') + ': !keyword add <keyword> <response> | !keyword edit <keyword> <response> | !keyword remove <keyword> | !keyword list', sender)
  }

  async add (self, sender, text) {
    debug('add(%j,%j,%j)', self, sender, text)
    const match = XRegExp.exec(text, constants.KEYWORD_REGEXP)

    if (_.isNil(match)) {
      let message = global.commons.prepare('keywords.keyword-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    if (match.keyword.startsWith('!')) match.keyword = match.keyword.replace('!', '')
    let keyword = { keyword: match.keyword, response: match.response, enabled: true }

    if (!_.isEmpty(await global.db.engine.findOne('keywords', { keyword: match.keyword }))) {
      let message = global.commons.prepare('keywords.keyword-already-exist', { keyword: match.keyword })
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    await global.db.engine.update('keywords', { keyword: match.keyword }, keyword)
    let message = global.commons.prepare('keywords.keyword-was-added', { keyword: match.keyword })
    debug(message); global.commons.sendMessage(message, sender)
  }

  async run (self, sender, text) {
    let keywords = await global.db.engine.find('keywords')
    keywords = _.filter(keywords, function (o) {
      return text.search(new RegExp('^(?!\\!)(?:^|\\s).*(' + _.escapeRegExp(o.keyword) + ')(?=\\s|$|\\?|\\!|\\.|\\,)', 'gi')) >= 0
    })
    for (let keyword of keywords) {
      if (!keyword.enabled) continue
      let message = await new Message(keyword.response).parse({ sender: sender })
      global.commons.sendMessage(message, sender)
    }
    return true
  }

  async list (self, sender) {
    debug('list(%j,%j)', self, sender)
    let keywords = await global.db.engine.find('keywords')
    var output = (keywords.length === 0 ? global.translate('keywords.list-is-empty') : global.translate('keywords.list-is-not-empty').replace(/\$list/g, _.map(_.orderBy(keywords, 'keyword'), 'keyword').join(', ')))
    debug(output); global.commons.sendMessage(output, sender)
  }

  async toggle (self, sender, text) {
    debug('toggle(%j,%j,%j)', self, sender, text)

    if (text.trim().length === 0) {
      let message = global.commons.prepare('keywords.keyword-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }
    let id = text.trim()

    const keyword = await global.db.engine.findOne('keywords', { keyword: id })
    if (_.isEmpty(keyword)) {
      let message = global.commons.prepare('keywords.keyword-was-not-found', { keyword: id })
      debug(message); global.commons.sendMessage(message, sender)
      return
    }

    await global.db.engine.update('keywords', { keyword: id }, { enabled: !keyword.enabled })

    let message = global.commons.prepare(!keyword.enabled ? 'keywords.keyword-was-enabled' : 'keywords.keyword-was-disabled', { keyword: keyword.keyword })
    debug(message); global.commons.sendMessage(message, sender)
  }

  async remove (self, sender, text) {
    debug('remove(%j,%j,%j)', self, sender, text)

    if (text.trim().length === 0) {
      let message = global.commons.prepare('keywords.keyword-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }
    let id = text.trim()

    let removed = await global.db.engine.remove('keywords', { keyword: id })
    if (!removed) {
      let message = global.commons.prepare('keywords.keyword-was-not-found', { keyword: id })
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }
    let message = global.commons.prepare('keywords.keyword-was-removed', { keyword: id })
    debug(message); global.commons.sendMessage(message, sender)
  }
}

module.exports = new Keywords()

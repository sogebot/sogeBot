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
        {this: this, id: '!keyword add', command: '!keyword add', fnc: this.add, permission: constants.OWNER_ONLY},
        {this: this, id: '!keyword edit', command: '!keyword edit', fnc: this.edit, permission: constants.OWNER_ONLY},
        {this: this, id: '!keyword list', command: '!keyword list', fnc: this.list, permission: constants.OWNER_ONLY},
        {this: this, id: '!keyword remove', command: '!keyword remove', fnc: this.remove, permission: constants.OWNER_ONLY},
        {this: this, id: '!keyword toggle', command: '!keyword toggle', fnc: this.toggle, permission: constants.OWNER_ONLY},
        {this: this, id: '!keyword', command: '!keyword', fnc: this.help, permission: constants.OWNER_ONLY}
      ]
  }

  parsers () {
    return !global.commons.isSystemEnabled('keywords')
      ? []
      : [
        {this: this, name: 'keywords', fnc: this.run, permission: constants.VIEWERS, priority: constants.LOW}
      ]
  }

  async edit (opts) {
    debug('edit(%j, %j, %j)', opts)
    const match = XRegExp.exec(opts.parameters, constants.KEYWORD_REGEXP)

    if (_.isNil(match)) {
      let message = await global.commons.prepare('keywords.keyword-parse-failed')
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    let item = await global.db.engine.findOne('keywords', { keyword: match.keyword })
    if (_.isEmpty(item)) {
      let message = await global.commons.prepare('keywords.keyword-was-not-found', { keyword: match.keyword })
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    await global.db.engine.update('keywords', { keyword: match.keyword }, { response: match.response })
    let message = await global.commons.prepare('keywords.keyword-was-edited', { keyword: match.keyword, response: match.response })
    debug(message); global.commons.sendMessage(message, opts.sender)
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

  help (opts) {
    global.commons.sendMessage(global.translate('core.usage') + ': !keyword add <keyword> <response> | !keyword edit <keyword> <response> | !keyword remove <keyword> | !keyword list', opts.sender)
  }

  async add (opts) {
    debug('add(%j,%j,%j)', opts)
    const match = XRegExp.exec(opts.parameters, constants.KEYWORD_REGEXP)

    if (_.isNil(match)) {
      let message = await global.commons.prepare('keywords.keyword-parse-failed')
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    if (match.keyword.startsWith('!')) match.keyword = match.keyword.replace('!', '')
    let keyword = { keyword: match.keyword, response: match.response, enabled: true }

    if (!_.isEmpty(await global.db.engine.findOne('keywords', { keyword: match.keyword }))) {
      let message = await global.commons.prepare('keywords.keyword-already-exist', { keyword: match.keyword })
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }

    await global.db.engine.update('keywords', { keyword: match.keyword }, keyword)
    let message = await global.commons.prepare('keywords.keyword-was-added', { keyword: match.keyword })
    debug(message); global.commons.sendMessage(message, opts.sender)
  }

  async run (opts) {
    let keywords = await global.db.engine.find('keywords')
    keywords = _.filter(keywords, function (o) {
      return opts.message.search(new RegExp('^(?!\\!)(?:^|\\s).*(' + _.escapeRegExp(o.keyword) + ')(?=\\s|$|\\?|\\!|\\.|\\,)', 'gi')) >= 0
    })
    for (let keyword of keywords) {
      if (!keyword.enabled) continue
      let message = await new Message(keyword.response).parse({ sender: opts.sender.username })
      global.commons.sendMessage(message, opts.sender)
    }
    return true
  }

  async list (opts) {
    debug('list(%j,%j)', opts)
    let keywords = await global.db.engine.find('keywords')
    var output = (keywords.length === 0 ? global.translate('keywords.list-is-empty') : global.translate('keywords.list-is-not-empty').replace(/\$list/g, _.map(_.orderBy(keywords, 'keyword'), 'keyword').join(', ')))
    debug(output); global.commons.sendMessage(output, opts.sender)
  }

  async toggle (opts) {
    debug('toggle(%j,%j,%j)', opts)

    if (opts.parameters.trim().length === 0) {
      let message = await global.commons.prepare('keywords.keyword-parse-failed')
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }
    let id = opts.parameters.trim()

    const keyword = await global.db.engine.findOne('keywords', { keyword: id })
    if (_.isEmpty(keyword)) {
      let message = await global.commons.prepare('keywords.keyword-was-not-found', { keyword: id })
      debug(message); global.commons.sendMessage(message, opts.sender)
      return
    }

    await global.db.engine.update('keywords', { keyword: id }, { enabled: !keyword.enabled })

    let message = await global.commons.prepare(!keyword.enabled ? 'keywords.keyword-was-enabled' : 'keywords.keyword-was-disabled', { keyword: keyword.keyword })
    debug(message); global.commons.sendMessage(message, opts.sender)
  }

  async remove (opts) {
    debug('remove(%j,%j,%j)', opts)

    if (opts.parameters.trim().length === 0) {
      let message = await global.commons.prepare('keywords.keyword-parse-failed')
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }
    let id = opts.parameters.trim()

    let removed = await global.db.engine.remove('keywords', { keyword: id })
    if (!removed) {
      let message = await global.commons.prepare('keywords.keyword-was-not-found', { keyword: id })
      debug(message); global.commons.sendMessage(message, opts.sender)
      return false
    }
    let message = await global.commons.prepare('keywords.keyword-was-removed', { keyword: id })
    debug(message); global.commons.sendMessage(message, opts.sender)
  }
}

module.exports = new Keywords()

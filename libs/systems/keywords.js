'use strict'

// 3rdparty libraries
const _ = require('lodash')
const debug = require('debug')('systems:keywords')

// bot libraries
var constants = require('../constants')

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
    if (global.commons.isSystemEnabled(this)) {
      global.parser.register(this, '!keyword add', this.add, constants.OWNER_ONLY)
      global.parser.register(this, '!keyword edit', this.edit, constants.OWNER_ONLY)
      global.parser.register(this, '!keyword list', this.list, constants.OWNER_ONLY)
      global.parser.register(this, '!keyword remove', this.remove, constants.OWNER_ONLY)
      global.parser.register(this, '!keyword toggle', this.toggle, constants.OWNER_ONLY)
      global.parser.register(this, '!keyword', this.help, constants.OWNER_ONLY)

      global.parser.registerHelper('!keyword')

      global.parser.registerParser(this, 'keywords', this.run, constants.VIEWERS)

      global.panel.addMenu({category: 'manage', name: 'keywords', id: 'keywords'})
      global.panel.registerSockets({
        self: this,
        expose: ['add', 'remove', 'toggle', 'editKeyword', 'editResponse', 'send'],
        finally: this.send
      })
    }
  }

  async edit (self, sender, text) {
    debug('edit(%j, %j, %j)', self, sender, text)
    let parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w\S]+) (.*)$/)

    if (_.isNil(parsed)) {
      let message = global.commons.prepare('keywords.keyword-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    const keyword = parsed[1]
    const response = parsed[2]

    let item = await global.db.engine.findOne('keywords', { keyword: keyword })
    if (_.isEmpty(item)) {
      let message = global.commons.prepare('keywords.keyword-was-not-found', { keyword: keyword })
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    await global.db.engine.update('keywords', { keyword: keyword }, { response: response })
    let message = global.commons.prepare('keywords.keyword-was-edited', { keyword: keyword, response: response })
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
    let parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w\S]+) (.*)$/)

    if (_.isNil(parsed)) {
      let message = global.commons.prepare('keywords.keyword-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    if (parsed[1].startsWith('!')) parsed[1] = parsed[1].replace('!', '')
    let keyword = { keyword: parsed[1], response: parsed[2], enabled: true }

    if (!_.isEmpty(await global.db.engine.findOne('keywords', { keyword: parsed[1] }))) {
      let message = global.commons.prepare('keywords.keyword-already-exist', { keyword: parsed[1] })
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    await global.db.engine.update('keywords', { keyword: parsed[1] }, keyword)
    let message = global.commons.prepare('keywords.keyword-was-added', { keyword: parsed[1] })
    debug(message); global.commons.sendMessage(message, sender)
  }

  async run (self, id, sender, text) {
    let keywords = await global.db.engine.find('keywords')
    keywords = _.filter(keywords, function (o) {
      return text.search(new RegExp('^(?!\\!)(?:^|\\s).*(' + _.escapeRegExp(o.keyword) + ')(?=\\s|$|\\?|\\!|\\.|\\,)', 'gi')) >= 0
    })
    _.each(keywords, function (o) { if (o.enabled) global.commons.sendMessage(o.response, sender) })
    global.updateQueue(id, true)
  }

  async list (self, sender) {
    debug('list(%j,%j)', self, sender)
    let keywords = await global.db.engine.find('keywords')
    var output = (keywords.length === 0 ? global.translate('keywords.list-is-empty') : global.translate('keywords.list-is-not-empty').replace(/\$list/g, _.map(_.orderBy(keywords, 'keyword'), 'keyword').join(', ')))
    debug(output); global.commons.sendMessage(output, sender)
  }

  async toggle (self, sender, text) {
    debug('toggle(%j,%j,%j)', self, sender, text)
    let id = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+)$/)

    if (_.isNil(id)) {
      let message = global.commons.prepare('keywords.keyword-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }
    id = id[1]

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
    let id = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+)$/)

    if (_.isNil(id)) {
      let message = global.commons.prepare('keywords.keyword-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }
    id = id[1]

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

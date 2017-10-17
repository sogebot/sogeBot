'use strict'

// 3rdparty libraries
const _ = require('lodash')
const debug = require('debug')('systems:timers')

// bot libraries
var constants = require('../constants')

/*
 * !timers                                                                                                                      - gets an info about timers usage
 * !timers set -name [name-of-timer] -messages [num-of-msgs-to-trigger|default:0] -seconds [trigger-every-x-seconds|default:60] - add new timer
 * !timers unset -name [name-of-timer]                                                                                          - remove timer
 * !timers add -name [name-of-timer] -response '[response]'                                                                     - add new response to timer
 * !timers rm -id [response-id]                                                                                                 - remove response by id
 * !timers toggle -name [name-of-timer]                                                                                         - enable/disable timer by name
 * !timers toggle -id [id-of-response]                                                                                          - enable/disable response by id
 * !timers list                                                                                                                 - get timers list
 * !timers list -name [name-of-timer]                                                                                           - get list of responses on timer
 */

class Timers {
  constructor () {
    if (global.commons.isSystemEnabled(this)) {
      this.init()

      global.parser.register(this, '!timers set', this.set, constants.OWNER_ONLY)
      global.parser.register(this, '!timers unset', this.unset, constants.OWNER_ONLY)
      global.parser.register(this, '!timers add', this.add, constants.OWNER_ONLY)
      global.parser.register(this, '!timers rm', this.rm, constants.OWNER_ONLY)
      global.parser.register(this, '!timers list', this.list, constants.OWNER_ONLY)
      global.parser.register(this, '!timers toggle', this.toggle, constants.OWNER_ONLY)
      global.parser.register(this, '!timers', this.help, constants.OWNER_ONLY)

      global.parser.registerHelper('!timers')

      global.panel.addMenu({category: 'manage', name: 'timers', id: 'timers'})
      global.panel.registerSockets({
        self: this,
        expose: ['set', 'unset', 'add', 'rm', 'toggle', 'editResponse', 'send'],
        finally: this.send
      })
    }
  }

  async send (self, socket) {
    socket.emit('timers', { timers: await global.db.engine.find('timers'), responses: await global.db.engine.find('timersResponses') })
  }

  help (self, sender) {
    global.commons.sendMessage(global.translate('core.usage') + ': TBD', sender)
  }

  async init () {
    let timers = await global.db.engine.find('timers')
    for (let timer of timers) { global.db.engine.update('timers', { _id: timer._id }, { trigger: { messages: global.parser.linesParsed, timestamp: new Date().getTime() } }) }
    setInterval(() => this.check(), 1000)
  }

  async check () {
    let timers = await global.db.engine.find('timers', { enabled: true })
    for (let timer of timers) {
      if (timer.messages > 0 && timer.trigger.messages - global.parser.linesParsed + timer.messages > 0) continue // not ready to trigger with messages
      if (timer.seconds > 0 && new Date().getTime() - timer.trigger.timestamp < timer.seconds * 1000) continue // not ready to trigger with seconds

      debug('ready to fire - %j', timer)
      let responses = await global.db.engine.find('timersResponses', { timerId: timer._id, enabled: true })
      let response = _.orderBy(responses, 'timestamp', 'asc')[0]

      if (!_.isNil(response)) {
        debug(response.response, global.parser.getOwner())
        global.commons.sendMessage(response.response, global.parser.getOwner())
        global.db.engine.update('timersResponses', { _id: response._id }, { timestamp: new Date().getTime() })
      }

      global.db.engine.update('timers', { _id: timer._id }, { trigger: { messages: global.parser.linesParsed, timestamp: new Date().getTime() } })
    }
  }

  async editResponse (self, socket, data) {
    if (data.value.length === 0) await self.rm(self, null, `-id ${data.id}`)
    else global.db.engine.update('timersResponses', { _id: data.id }, { response: data.value })
  }

  async set (self, sender, text) {
    // -name [name-of-timer] -messages [num-of-msgs-to-trigger|default:0] -seconds [trigger-every-x-seconds|default:60]
    debug('set(%j, %j, %j)', self, sender, text)

    let name = text.match(/-name ([a-zA-Z0-9]+)/)
    let messages = text.match(/-messages ([0-9]+)/)
    let seconds = text.match(/-seconds ([0-9]+)/)

    if (_.isNil(name)) {
      global.commons.sendMessage('$sender, timer name must be defined.', sender)
      return false
    } else {
      name = name[1]
    }

    messages = _.isNil(messages) ? 0 : parseInt(messages[1], 10)
    seconds = _.isNil(seconds) ? 60 : parseInt(seconds[1], 10)

    if (messages === 0 && seconds === 0) {
      global.commons.sendMessage('$sender, you cannot set both messages and seconds to 0', sender)
      return false
    }
    debug(name, messages, seconds)

    await global.db.engine.update('timers', { name: name }, { name: name, messages: messages, seconds: seconds, enabled: true, trigger: { messages: global.parser.linesParsed, timestamp: new Date().getTime() } })
    global.commons.sendMessage('$sender, timer $name was set with $messages messages and $seconds seconds to trigger'
      .replace(/\$name/g, name)
      .replace(/\$messages/g, messages)
      .replace(/\$seconds/g, seconds), sender)
  }

  async unset (self, sender, text) {
    // -name [name-of-timer]
    debug('unset(%j, %j, %j)', self, sender, text)

    let name = text.match(/-name ([a-zA-Z0-9]+)/)

    if (_.isNil(name)) {
      global.commons.sendMessage('$sender, timer name must be defined.', sender)
      return false
    } else {
      name = name[1]
    }

    let timer = await global.db.engine.findOne('timers', { name: name })
    if (_.isEmpty(timer)) {
      global.commons.sendMessage('$sender, timer (name: $name) was not found in database'.replace(/\$name/g, name), global.parser.getOwner())
      return false
    }

    await global.db.engine.remove('timers', { name: name })
    await global.db.engine.remove('timersResponses', { timerId: timer._id })
    global.commons.sendMessage('$sender, timer $name and its responses was deleted.'
      .replace(/\$name/g, name), sender)
  }

  async rm (self, sender, text) {
    // -id [id-of-response]
    debug('rm(%j, %j, %j)', self, sender, text)

    let id = text.match(/-id ([a-zA-Z0-9]+)/)

    if (_.isNil(id)) {
      global.commons.sendMessage('$sender, response id must be defined.', sender)
      return false
    } else {
      id = id[1]
    }

    await global.db.engine.remove('timersResponses', { _id: id })
    global.commons.sendMessage('$sender, response (id: $id) was deleted.'
      .replace(/\$id/g, id), sender)
  }

  async add (self, sender, text) {
    // -name [name-of-timer] -response '[response]'
    debug('add(%j, %j, %j)', self, sender, text)

    let name = text.match(/-name ([a-zA-Z0-9]+)/)
    let response = text.match(/-response ['"](.+)['"]/)

    if (_.isNil(name)) {
      global.commons.sendMessage('$sender, timer name must be defined.', sender)
      return false
    } else {
      name = name[1]
    }

    if (_.isNil(response)) {
      global.commons.sendMessage('$sender, timer response must be defined.', sender)
      return false
    } else {
      response = response[1]
    }
    debug(name, response)

    let timer = await global.db.engine.findOne('timers', { name: name })
    if (_.isEmpty(timer)) {
      global.commons.sendMessage('$sender, timer (name: $name) was not found in database. Check timers with !timers list'
        .replace(/\$name/g, name), sender)
      return false
    }

    let item = await global.db.engine.insert('timersResponses', { response: response, timestamp: new Date().getTime(), enabled: true, timerId: timer._id })
    global.commons.sendMessage('$sender, response (id: $id) for timer (name: $name) was added - \'$response\''
      .replace(/\$id/g, item._id)
      .replace(/\$name/g, name)
      .replace(/\$response/g, response), sender)
  }

  async list (self, sender, text) {
    // !timers list -name [name-of-timer]
    debug('list(%j, %j, %j)', self, sender, text)

    let name = text.match(/-name ([a-zA-Z0-9]+)/)

    if (_.isNil(name)) {
      let timers = await global.db.engine.find('timers')
      global.commons.sendMessage('$sender, timers list: $list'.replace(/\$list/g, _.map(timers, (o) => (o.enabled ? `⚫ ` : `⚪ `) + ' ' + o.name).join(', ')), sender)
      return true
    } else { name = name[1] }

    global.commons.sendMessage('$sender, timer (name: $name) list'.replace(/\$name/g, name), sender)

    let timer = await global.db.engine.findOne('timers', { name: name })
    if (_.isEmpty(timer)) {
      global.commons.sendMessage('$sender, timer (name: $name) was not found in database. Check timers with !timers list'
        .replace(/\$name/g, name), sender)
      return false
    }

    let responses = await global.db.engine.find('timersResponses', { timerId: timer._id })
    for (let response of responses) { global.commons.sendMessage((response.enabled ? `⚫ ` : `⚪ `) + `${response._id} - ${response.response}`, sender) }
    return true
  }

  async toggle (self, sender, text) {
    // -name [name-of-timer] or -id [id-of-response]
    debug('toggle(%j, %j, %j)', self, sender, text)

    let id = text.match(/-id ([a-zA-Z0-9]+)/)
    let name = text.match(/-name ([a-zA-Z0-9]+)/)

    if (_.isNil(id) && _.isNil(name)) {
      global.commons.sendMessage('$sender, timer name or response id must be defined.', sender)
      return false
    }

    if (!_.isNil(id)) {
      debug('toggle response - %s', id)
      id = id[1]
      let response = await global.db.engine.findOne('timersResponses', { _id: id })
      if (_.isEmpty(response)) {
        debug('$sender, response (id: $id) was not found in database'.replace(/\$id/g, id))
        global.commons.sendMessage('$sender, response (id: $id) was not found in database'.replace(/\$id/g, id), sender)
        return false
      }

      await global.db.engine.update('timersResponses', { _id: id }, { enabled: !response.enabled })
      debug((!response.enabled ? '$sender, response (id: $id) was enabled' : '$sender, response (id: $id) was disabled').replace(/\$id/g, id))
      global.commons.sendMessage((!response.enabled ? '$sender, response (id: $id) was enabled' : '$sender, response (id: $id) was disabled')
        .replace(/\$id/g, id), sender)
      return true
    }

    if (!_.isNil(name)) {
      name = name[1]
      let timer = await global.db.engine.findOne('timers', { name: name })
      if (_.isEmpty(timer)) {
        global.commons.sendMessage('$sender, response (id: $id) was not found in database'.replace(/\$id/g, id), sender)
        return false
      }

      await global.db.engine.update('timers', { name: name }, { enabled: !timer.enabled })
      global.commons.sendMessage((!timer.enabled ? '$sender, timer (name: $name) was enabled' : '$sender, response (name: $name) was disabled')
        .replace(/\$name/g, name), sender)
      return true
    }

    await global.db.engine.remove('timersResponses', { _id: id })
    global.commons.sendMessage('$sender, response (id: $id) was deleted.'
      .replace(/\$id/g, id), sender)
  }
}

module.exports = new Timers()

'use strict'

// 3rdparty libraries
const _ = require('lodash')
const debug = require('debug')
const crypto = require('crypto')
const cluster = require('cluster')

// bot libraries
var constants = require('../constants')
const Timeout = require('../timeout')
const System = require('./_interface')

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

class Timers extends System {
  constructor () {
    const settings = {
      commands: [
        {name: '!timers set', permission: constants.OWNER_ONLY},
        {name: '!timers unset', permission: constants.OWNER_ONLY},
        {name: '!timers add', permission: constants.OWNER_ONLY},
        {name: '!timers rm', permission: constants.OWNER_ONLY},
        {name: '!timers list', permission: constants.OWNER_ONLY},
        {name: '!timers toggle', permission: constants.OWNER_ONLY},
        {name: '!timers', permission: constants.OWNER_ONLY}
      ]
    }

    super({settings})

    this.addMenu({category: 'manage', name: 'timers', id: 'timers/list'})
    if (cluster.isMaster) this.init()
  }

  sockets () {
    this.socket.on('connection', (socket) => {
      socket.on('find.timers', async (callback) => {
        let [timers, responses] = await Promise.all([
          global.db.engine.find(this.collection.data),
          global.db.engine.find(this.collection.responses)
        ])
        callback(null, { timers: timers, responses: responses })
      })
      socket.on('findOne.timer', async (opts, callback) => {
        let [timer, responses] = await Promise.all([
          global.db.engine.findOne(this.collection.data, { _id: opts._id }),
          global.db.engine.find(this.collection.responses, { timerId: opts._id })
        ])
        callback(null, { timer: timer, responses: responses })
      })
      socket.on('delete.timer', async (_id, callback) => {
        await Promise.all([
          global.db.engine.remove(this.collection.data, { _id }),
          global.db.engine.remove(this.collection.responses, { timerId: _id })
        ])
        callback(null)
      })
      socket.on('update.timer', async (data, callback) => {
        const name = data.timer.name && data.timer.name.trim().length ? data.timer.name.replace(/ /g, '_') : crypto.createHash('md5').update(new Date().getTime().toString()).digest('hex').slice(0, 5)
        _.remove(data.responses, (o) => o.response.trim().length === 0)

        const timer = {
          name: name,
          messages: _.toNumber(data.timer.messages),
          seconds: _.toNumber(data.timer.seconds),
          enabled: data.timer.enabled,
          trigger: {
            messages: 0,
            timestamp: new Date().getTime()
          }
        }
        if (_.isNil(data.timer._id)) data.timer._id = (await global.db.engine.insert(this.collection.data, timer))._id.toString()
        else {
          await Promise.all([
            global.db.engine.update(this.collection.data, { _id: data.timer._id }, timer),
            global.db.engine.remove(this.collection.responses, { timerId: data.timer._id })
          ])
        }
        var insertArray = []
        for (let response of data.responses) {
          insertArray.push(global.db.engine.insert(this.collection.responses, {
            timerId: data.timer._id,
            response: response.response,
            enabled: response.enabled,
            timestamp: 0
          }))
        }
        await Promise.all(insertArray)

        callback(null, {
          timer: await global.db.engine.findOne(this.collection.data, { _id: data.timer._id }),
          responses: await global.db.engine.find(this.collection.responses, { timerId: data.timer._id })
        })
      })
    })
  }

  async send (self, socket) {
    socket.emit(this.collection.data, { timers: await global.db.engine.find(this.collection.data), responses: await global.db.engine.find(this.collection.responses) })
  }

  async main (opts) {
    const [main, set, unset, add, rm, toggle, list] = await Promise.all([
      this.settings.commands['!timers'],
      this.settings.commands['!timers set'],
      this.settings.commands['!timers unset'],
      this.settings.commands['!timers add'],
      this.settings.commands['!timers rm'],
      this.settings.commands['!timers toggle'],
      this.settings.commands['!timers list']
    ])
    global.commons.sendMessage('╔ ' + global.translate('core.usage'), opts.sender)
    global.commons.sendMessage(`║ ${main} - gets an info about timers usage`, opts.sender)
    global.commons.sendMessage(`║ ${set} -name [name-of-timer] -messages [num-of-msgs-to-trigger|default:0] -seconds [trigger-every-x-seconds|default:60] - add new timer`, opts.sender)
    global.commons.sendMessage(`║ ${unset} -name [name-of-timer] - remove timer`, opts.sender)
    global.commons.sendMessage(`║ ${add} -name [name-of-timer] -response '[response]' - add new response to timer`, opts.sender)
    global.commons.sendMessage(`║ ${rm} -id [response-id] - remove response by id`, opts.sender)
    global.commons.sendMessage(`║ ${toggle} -name [name-of-timer] - enable/disable timer by name`, opts.sender)
    global.commons.sendMessage(`║ ${toggle} -id [id-of-response] - enable/disable response by id`, opts.sender)
    global.commons.sendMessage(`║ ${list} - get timers list`, opts.sender)
    global.commons.sendMessage(`╚ ${list} -name [name-of-timer] - get list of responses on timer`, opts.sender)
  }

  async init () {
    let timers = await global.db.engine.find(this.collection.data)
    for (let timer of timers) await global.db.engine.update(this.collection.data, { _id: timer._id.toString() }, { trigger: { messages: 0, timestamp: new Date().getTime() } })
    this.check()
  }

  async check () {
    const d = debug('timers:check')
    d('checking timers')
    let timers = await global.db.engine.find(this.collection.data, { enabled: true })
    for (let timer of timers) {
      if (timer.messages > 0 && timer.trigger.messages - global.linesParsed + timer.messages > 0) continue // not ready to trigger with messages
      if (timer.seconds > 0 && new Date().getTime() - timer.trigger.timestamp < timer.seconds * 1000) continue // not ready to trigger with seconds

      d('ready to fire - %j', timer)
      let responses = await global.db.engine.find(this.collection.responses, { timerId: timer._id.toString(), enabled: true })
      let response = _.orderBy(responses, 'timestamp', 'asc')[0]

      if (!_.isNil(response)) {
        d(response.response, global.commons.getOwner())
        global.commons.sendMessage(response.response, global.commons.getOwner())
        await global.db.engine.update(this.collection.responses, { _id: response._id }, { timestamp: new Date().getTime() })
      }
      await global.db.engine.update(this.collection.data, { _id: timer._id.toString() }, { trigger: { messages: global.linesParsed, timestamp: new Date().getTime() } })
    }
    new Timeout().recursive({ uid: 'timersCheck', this: this, fnc: this.check, wait: 1000 }) // this will run check 1s after full check is correctly done
  }

  async editName (self, socket, data) {
    if (data.value.length === 0) await self.unset(self, null, `-name ${data.id}`)
    else {
      let name = data.value.match(/([a-zA-Z0-9_]+)/)
      if (_.isNil(name)) return
      await global.db.engine.update(this.collection.data, { name: data.id.toString() }, { name: name[0] })
    }
  }

  async editResponse (self, socket, data) {
    if (data.value.length === 0) await self.rm(self, null, `-id ${data.id}`)
    else global.db.engine.update(this.collection.responses, { _id: data.id }, { response: data.value })
  }

  async set (opts) {
    // -name [name-of-timer] -messages [num-of-msgs-to-trigger|default:0] -seconds [trigger-every-x-seconds|default:60]
    const d = debug('timers:set')
    d('set(%j, %j, %j)', opts)

    let name = opts.parameters.match(/-name ([a-zA-Z0-9_]+)/)
    let messages = opts.parameters.match(/-messages ([0-9]+)/)
    let seconds = opts.parameters.match(/-seconds ([0-9]+)/)

    if (_.isNil(name)) {
      global.commons.sendMessage(global.translate('timers.name-must-be-defined'), opts.sender)
      return false
    } else {
      name = name[1]
    }

    messages = _.isNil(messages) ? 0 : parseInt(messages[1], 10)
    seconds = _.isNil(seconds) ? 60 : parseInt(seconds[1], 10)

    if (messages === 0 && seconds === 0) {
      global.commons.sendMessage(global.translate('timers.cannot-set-messages-and-seconds-0'), opts.sender)
      return false
    }
    d(name, messages, seconds)

    await global.db.engine.update(this.collection.data, { name: name }, { name: name, messages: messages, seconds: seconds, enabled: true, trigger: { messages: global.linesParsed, timestamp: new Date().getTime() } })
    global.commons.sendMessage(global.translate('timers.timer-was-set')
      .replace(/\$name/g, name)
      .replace(/\$messages/g, messages)
      .replace(/\$seconds/g, seconds), opts.sender)
  }

  async unset (opts) {
    // -name [name-of-timer]
    const d = debug('timers:unset')
    d('unset(%j, %j, %j)', opts)

    let name = opts.parameters.match(/-name ([\S]+)/)

    if (_.isNil(name)) {
      global.commons.sendMessage(global.translate('timers.name-must-be-defined'), opts.sender)
      return false
    } else {
      name = name[1]
    }

    let timer = await global.db.engine.findOne(this.collection.data, { name: name })
    if (_.isEmpty(timer)) {
      d(global.translate('timers.timer-not-found').replace(/\$name/g, name))
      global.commons.sendMessage(global.translate('timers.timer-not-found').replace(/\$name/g, name), opts.sender)
      return false
    }

    await global.db.engine.remove(this.collection.data, { name: name })
    await global.db.engine.remove(this.collection.responses, { timerId: timer._id.toString() })
    d(global.translate('timers.timer-deleted').replace(/\$name/g, name))
    global.commons.sendMessage(global.translate('timers.timer-deleted')
      .replace(/\$name/g, name), opts.sender)
  }

  async rm (opts) {
    // -id [id-of-response]
    const d = debug('timers:rm')
    d('rm(%j, %j, %j)', opts)

    let id = opts.parameters.match(/-id ([a-zA-Z0-9]+)/)

    if (_.isNil(id)) {
      global.commons.sendMessage(global.translate('timers.id-must-be-defined'), opts.sender)
      return false
    } else {
      id = id[1]
    }

    await global.db.engine.remove(this.collection.responses, { _id: id })
    global.commons.sendMessage(global.translate('timers.response-deleted')
      .replace(/\$id/g, id), opts.sender)
  }

  async add (opts) {
    // -name [name-of-timer] -response '[response]'
    const d = debug('timers:add')
    d('add(%j, %j, %j)', opts)

    let name = opts.parameters.match(/-name ([\S]+)/)
    let response = opts.parameters.match(/-response ['"](.+)['"]/)

    if (_.isNil(name)) {
      global.commons.sendMessage(global.translate('timers.name-must-be-defined'), opts.sender)
      return false
    } else {
      name = name[1]
    }

    if (_.isNil(response)) {
      global.commons.sendMessage(global.translate('timers.response-must-be-defined'), opts.sender)
      return false
    } else {
      response = response[1]
    }
    d(name, response)

    let timer = await global.db.engine.findOne(this.collection.data, { name: name })
    if (_.isEmpty(timer)) {
      global.commons.sendMessage(global.translate('timers.timer-not-found')
        .replace(/\$name/g, name), opts.sender)
      return false
    }

    let item = await global.db.engine.insert(this.collection.responses, { response: response, timestamp: new Date().getTime(), enabled: true, timerId: timer._id.toString() })
    d(item)
    global.commons.sendMessage(global.translate('timers.response-was-added')
      .replace(/\$id/g, item._id)
      .replace(/\$name/g, name)
      .replace(/\$response/g, response), opts.sender)
  }

  async list (opts) {
    // !timers list -name [name-of-timer]
    const d = debug('timers:list')
    d('list(%j, %j, %j)', opts)

    let name = opts.parameters.match(/-name ([\S]+)/)

    if (_.isNil(name)) {
      let timers = await global.db.engine.find(this.collection.data)
      global.commons.sendMessage(global.translate('timers.timers-list').replace(/\$list/g, _.map(_.orderBy(timers, 'name'), (o) => (o.enabled ? '⚫' : '⚪') + ' ' + o.name).join(', ')), opts.sender)
      return true
    } else { name = name[1] }

    let timer = await global.db.engine.findOne(this.collection.data, { name: name })
    if (_.isEmpty(timer)) {
      global.commons.sendMessage(global.translate('timers.timer-not-found')
        .replace(/\$name/g, name), opts.sender)
      return false
    }

    let responses = await global.db.engine.find(this.collection.responses, { timerId: timer._id.toString() })
    d(responses)
    await global.commons.sendMessage(global.translate('timers.responses-list').replace(/\$name/g, name), opts.sender)
    for (let response of responses) await global.commons.sendMessage((response.enabled ? '⚫ ' : '⚪ ') + `${response._id} - ${response.response}`, opts.sender)
    return true
  }

  async toggle (opts) {
    // -name [name-of-timer] or -id [id-of-response]
    const d = debug('timers:toggle')
    d('toggle(%j, %j, %j)', opts)

    let id = opts.parameters.match(/-id ([a-zA-Z0-9]+)/)
    let name = opts.parameters.match(/-name ([\S]+)/)

    if ((_.isNil(id) && _.isNil(name)) || (!_.isNil(id) && !_.isNil(name))) {
      global.commons.sendMessage(global.translate('timers.id-or-name-must-be-defined'), opts.sender)
      return false
    }

    if (!_.isNil(id)) {
      id = id[1]
      d('toggle response - %s', id)
      let response = await global.db.engine.findOne(this.collection.responses, { _id: id })
      if (_.isEmpty(response)) {
        d(global.translate('timers.response-not-found').replace(/\$id/g, id))
        global.commons.sendMessage(global.translate('timers.response-not-found').replace(/\$id/g, id), opts.sender)
        return false
      }

      await global.db.engine.update(this.collection.responses, { _id: id }, { enabled: !response.enabled })
      d(global.translate(!response.enabled ? 'timers.response-enabled' : 'timers.response-disabled').replace(/\$id/g, id))
      global.commons.sendMessage(global.translate(!response.enabled ? 'timers.response-enabled' : 'timers.response-disabled')
        .replace(/\$id/g, id), opts.sender)
      return true
    }

    if (!_.isNil(name)) {
      name = name[1]
      let timer = await global.db.engine.findOne(this.collection.data, { name: name })
      if (_.isEmpty(timer)) {
        global.commons.sendMessage(global.translate('timers.timer-not-found').replace(/\$name/g, name), opts.sender)
        return false
      }

      await global.db.engine.update(this.collection.data, { name: name }, { enabled: !timer.enabled })
      global.commons.sendMessage(global.translate(!timer.enabled ? 'timers.timer-enabled' : 'timers.timer-disabled')
        .replace(/\$name/g, name), opts.sender)
      return true
    }
  }
}

module.exports = new Timers()

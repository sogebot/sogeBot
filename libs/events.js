'use strict'

const _ = require('lodash')
const debug = require('debug')
const crypto = require('crypto')
const safeEval = require('safe-eval')

class Events {
  constructor () {
    this.supportedEventsList = [
      { id: 'user-joined-channel', variables: [ 'username', 'userObject' ] },
      { id: 'user-parted-channel', variables: [ 'username', 'userObject' ] },
      { id: 'follow', variables: [ 'username', 'userObject' ] },
      { id: 'unfollow', variables: [ 'username', 'userObject' ] },
      { id: 'subscription', variables: [ 'username', 'userObject', 'method' ] },
      { id: 'resub', variables: [ 'username', 'userObject', 'months', 'monthsName', 'message' ] },
      { id: 'command-send-x-times', variables: [ 'command', 'count' ], definitions: { runEveryXCommands: 10, commandToWatch: '', runInterval: 0 }, check: this.checkCommandSendXTimes }, // runInterval 0 or null - disabled; > 0 every x seconds
      { id: 'number-of-viewers-is-at-least-x', variables: [ 'count' ], definitions: { viewersAtLeast: 100, runInterval: 0 } }, // runInterval 0 or null - disabled; > 0 every x seconds
      { id: 'stream-started' },
      { id: 'stream-stopped' },
      { id: 'stream-is-running-x-minutes', definitions: { runAfterXMinutes: 100 } },
      { id: 'cheer', variables: [ 'username', 'userObject', 'bits', 'message' ] },
      { id: 'clearchat' },
      { id: 'action', variables: [ 'username', 'userObject' ] },
      { id: 'ban', variables: [ 'username', 'userObject', 'reason' ] },
      { id: 'hosting', variables: [ 'target', 'viewers' ] },
      { id: 'hosted', variables: [ 'username', 'userObject', 'viewers', 'autohost' ] },
      { id: 'mod', variables: [ 'username', 'userObject' ] },
      { id: 'commercial', variables: [ 'duration' ] },
      { id: 'timeout', variables: [ 'username', 'userObject', 'reason', 'duration' ] },
      { id: 'every-x-minutes', definitions: { runEveryXMinutes: 100 } },
      { id: 'game-changed', variables: [ 'oldGame', 'game' ] }
    ]

    this.supportedOperationsList = [
      { id: 'send-chat-message', definitions: { messageToSend: '' }, fire: this.fireSendChatMessage },
      { id: 'send-whisper', definitions: { messageToSend: '' } },
      { id: 'run-command', definitions: { commandToRun: '', isCommandQuiet: false } },
      { id: 'play-sound', definitions: { urlOfSoundFile: '' } },
      { id: 'emote-explosion', definitions: { emotesToExplode: '' } },
      { id: 'start-commercial', definitions: { durationOfCommercial: [30, 60, 90, 120, 150, 180] } }
      // TODO: don't forget twitter op
    ]

    global.panel.addMenu({category: 'manage', name: 'event-listeners', id: 'events'})
    this.sockets()
  }

  async fire (eventId, attributes) {
    const d = debug('events:fire')
    if (!_.isNil(_.get(attributes, 'username', null))) attributes.userObject = await global.users.get(attributes.username)
    d('Firing event %s with attrs: %j', eventId, attributes)

    if (attributes.reset) return this.reset(eventId)

    let events = await global.db.engine.find('events', { key: eventId })
    for (let event of events) {
      let [shouldRunByFilter, shouldRunByDefinition] = await Promise.all([
        this.checkFilter(event._id.toString(), attributes),
        this.checkDefinition(event, attributes)
      ])
      d('Should run by filter', shouldRunByFilter)
      d('Should run by definition', shouldRunByDefinition)
      if (!shouldRunByFilter || !shouldRunByDefinition) continue

      for (let operation of (await global.db.engine.find('events.operations', { eventId: event._id.toString() }))) {
        d('Firing %j', operation)
        _.find(this.supportedOperationsList, (o) => o.id === operation.key).fire(operation, attributes)
      }
    }
  }

  // set triggered attribute to empty object
  async reset (eventId) {
    const d = debug('events:reset')
    let events = await global.db.engine.find('events', { key: eventId })
    for (let event of events) {
      d('Resetting %j', event)
      event.triggered = {}
      await global.db.engine.find('events', { _id: event._id.toString() }, event)
    }
  }

  async fireSendChatMessage (operation, attributes) {
    const d = debug('events:fireSendChatMessage')
    d('Sending chat message with attrs:', attributes)

    let username = _.get(attributes, 'username', global.parser.getOwner())
    let message = operation.definitions.messageToSend
    _.each(attributes, function (val, name) {
      d(`Replacing $${name} with ${val}`)
      let replace = new RegExp(`\\$${name}`, 'g')
      message = message.replace(replace, val)
    })
    message = await global.parser.parseMessage(message)
    global.commons.sendMessage(message, { username: username })
  }

  async checkCommandSendXTimes (event, attributes) {
    const d = debug('events:checkCommandSendXTimes')
    var shouldTrigger = false
    if (attributes.message.startsWith(event.definitions.commandToWatch)) {
      event.triggered = _.get(event, 'triggered', { runEveryXCommands: 0, runInterval: 0 })
      event.triggered.runEveryXCommands++
      shouldTrigger = event.triggered.runEveryXCommands >= event.definitions.runEveryXCommands && _.now() - event.triggered.runInterval >= event.definitions.runInterval * 1000
      if (shouldTrigger) {
        event.triggered.runInterval = _.now()
        event.triggered.runEveryXCommands = 0
      }
      d('Updating event to %j', event)
      await global.db.engine.update('events', { _id: event._id.toString() }, event)
    }
    d('Attributes for check', attributes)
    d('Should Trigger?', shouldTrigger)
    return shouldTrigger
  }

  async checkDefinition (event, attributes) {
    const d = debug('events:checkDefinition')

    d('Searching check fnc for %j', event)
    const check = (_.find(this.supportedEventsList, (o) => o.id === event.key)).check
    if (_.isNil(check)) return true

    d('Running check on %s', check.name)
    return check(event, attributes)
  }

  async checkFilter (eventId, attributes) {
    const d = debug('events:checkFilter')

    const filter = (await global.db.engine.findOne('events.filters', { eventId: eventId })).filters
    if (filter.trim().length === 0) return true

    let toEval = `(function evaluation () { return ${filter} })()`
    const context = {
      _: _,
      $username: _.get(attributes, 'username', null),
      $userObject: _.get(attributes, 'userObject', null),
      $method: _.get(attributes, 'method', null),
      $months: _.get(attributes, 'months', null),
      $monthsName: _.get(attributes, 'monthsName', null),
      $message: _.get(attributes, 'message', null),
      $command: _.get(attributes, 'command', null),
      $count: _.get(attributes, 'count', null),
      $bits: _.get(attributes, 'bits', null),
      $reason: _.get(attributes, 'reason', null),
      $target: _.get(attributes, 'target', null),
      $viewers: _.get(attributes, 'viewers', null),
      $autohost: _.get(attributes, 'autohost', null),
      $duration: _.get(attributes, 'duration', null),
      // add global variables
      $game: global.twitch.current.game,
      $title: global.twitch.current.status,
      $views: global.twitch.current.views,
      $followers: global.twitch.current.followers,
      $hosts: global.twitch.current.hosts,
      $subscribers: global.twitch.current.subscribers
    }
    var result = false
    try {
      result = safeEval(toEval, context)
    } catch (e) {
      // do nothing
    }
    d(toEval, context, result)
    return !!result // force boolean
  }

  sockets () {
    const d = debug('events:sockets')
    const io = global.panel.io.of('/events')

    io.on('connection', (socket) => {
      d('Socket /events connected, registering sockets')
      socket.on('list.supported.events', (callback) => {
        callback(this.supportedEventsList); d('list.supported.events => %s, %j', null, this.supportedEventsList)
      })
      socket.on('list.supported.operations', (callback) => {
        callback(this.supportedOperationsList); d('list.supported.operations => %s, %j', null, this.supportedOperationsList)
      })
      socket.on('save-changes', async (data, callback) => {
        d('save-changes - %j', data)
        var eventId = data._id
        try {
          const event = {
            name: data.name.trim().length ? data.name : 'events#' + crypto.createHash('md5').update(new Date().getTime().toString()).digest('hex').slice(0, 5),
            key: data.event.key,
            enabled: true,
            definitions: data.event.definitions
          }
          if (_.isNil(eventId)) eventId = (await global.db.engine.insert('events', event))._id.toString()
          else {
            await Promise.all([
              global.db.engine.update('events', { _id: eventId }, event),
              global.db.engine.remove('events.filters', { eventId: eventId }),
              global.db.engine.remove('events.operations', { eventId: eventId })
            ])
          }

          let insertArray = []
          insertArray.push(global.db.engine.insert('events.filters', {
            eventId: eventId,
            filters: data.filters
          }))
          for (let operation of Object.entries(data.operations)) {
            operation = operation[1]
            insertArray.push(global.db.engine.insert('events.operations', {
              eventId: eventId,
              key: operation.key,
              definitions: operation.definitions
            }))
          }
          await Promise.all(insertArray)

          callback(null, true)
        } catch (e) {
          global.log.error(e.message)

          if (!_.isNil(eventId)) { // eventId is created, rollback all changes
            await Promise.all([
              global.db.engine.remove('events', { _id: eventId }),
              global.db.engine.remove('events.filters', { eventId: eventId }),
              global.db.engine.remove('events.operations', { eventId: eventId })
            ])
          }
          callback(e, e.message)
        }
      })
      socket.on('list.events', async (callback) => {
        let [events, operations, filters] = await Promise.all([
          global.db.engine.find('events'),
          global.db.engine.find('events.operations'),
          global.db.engine.find('events.filters')
        ])
        callback(null, { events: events, operations: operations, filters: filters })
      })
      socket.on('toggle.event', async (eventId, callback) => {
        let eventFromDb = await global.db.engine.findOne('events', { _id: eventId })
        if (_.isEmpty(eventFromDb)) return callback(new Error('Event not found'), null)

        let updatedEvent = await global.db.engine.update('events', { _id: eventId }, { enabled: !eventFromDb.enabled })
        callback(null, updatedEvent)
      })
      socket.on('delete.event', async (eventId, callback) => {
        await Promise.all([
          global.db.engine.remove('events', { _id: eventId }),
          global.db.engine.remove('events.filters', { eventId: eventId }),
          global.db.engine.remove('events.operations', { eventId: eventId })
        ])
        callback(null, eventId)
      })
    })
  }
}

module.exports = Events

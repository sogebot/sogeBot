'use strict'

const _ = require('lodash')
const debug = require('debug')
const crypto = require('crypto')
const safeEval = require('safe-eval')
const flatten = require('flat')
const moment = require('moment')
const config = require('../config.json')

class Events {
  constructor () {
    this.supportedEventsList = [
      { id: 'user-joined-channel', variables: [ 'username', 'userObject' ] },
      { id: 'user-parted-channel', variables: [ 'username', 'userObject' ] },
      { id: 'follow', variables: [ 'username', 'userObject' ] },
      { id: 'unfollow', variables: [ 'username', 'userObject' ] },
      { id: 'subscription', variables: [ 'username', 'userObject', 'method' ] },
      { id: 'subgift', variables: [ 'username', 'userObject', 'recipient', 'recipientObject' ] },
      { id: 'resub', variables: [ 'username', 'userObject', 'months', 'monthsName', 'message' ] },
      { id: 'command-send-x-times', variables: [ 'username', 'userObject', 'command', 'count' ], definitions: { runEveryXCommands: 10, commandToWatch: '', runInterval: 0 }, check: this.checkCommandSendXTimes }, // runInterval 0 or null - disabled; > 0 every x seconds
      { id: 'number-of-viewers-is-at-least-x', variables: [ 'count' ], definitions: { viewersAtLeast: 100, runInterval: 0 }, check: this.checkNumberOfViewersIsAtLeast }, // runInterval 0 or null - disabled; > 0 every x seconds
      { id: 'stream-started' },
      { id: 'stream-stopped' },
      { id: 'stream-is-running-x-minutes', definitions: { runAfterXMinutes: 100 }, check: this.checkStreamIsRunningXMinutes },
      { id: 'cheer', variables: [ 'username', 'userObject', 'bits', 'message' ] },
      { id: 'clearchat' },
      { id: 'action', variables: [ 'username', 'userObject' ] },
      { id: 'ban', variables: [ 'username', 'userObject', 'reason' ] },
      { id: 'hosting', variables: [ 'target', 'viewers' ] },
      { id: 'hosted', variables: [ 'username', 'userObject', 'viewers', 'autohost' ] },
      { id: 'mod', variables: [ 'username', 'userObject' ] },
      { id: 'commercial', variables: [ 'duration' ] },
      { id: 'timeout', variables: [ 'username', 'userObject', 'reason', 'duration' ] },
      { id: 'every-x-minutes-of-stream', definitions: { runEveryXMinutes: 100 }, check: this.everyXMinutesOfStream },
      { id: 'game-changed', variables: [ 'oldGame', 'game' ] }
    ]

    this.supportedOperationsList = [
      { id: 'send-chat-message', definitions: { messageToSend: '' }, fire: this.fireSendChatMessage },
      { id: 'send-whisper', definitions: { messageToSend: '' }, fire: this.fireSendWhisper },
      { id: 'run-command', definitions: { commandToRun: '', isCommandQuiet: false }, fire: this.fireRunCommand },
      { id: 'play-sound', definitions: { urlOfSoundFile: '' }, fire: this.firePlaySound },
      { id: 'emote-explosion', definitions: { emotesToExplode: '' }, fire: this.fireEmoteExplosion },
      { id: 'start-commercial', definitions: { durationOfCommercial: [30, 60, 90, 120, 150, 180] }, fire: this.fireStartCommercial },
      { id: 'bot-will-join-channel', definitions: {}, fire: this.fireBotWillJoinChannel },
      { id: 'bot-will-leave-channel', definitions: {}, fire: this.fireBotWillLeaveChannel }
    ]

    global.panel.addMenu({category: 'manage', name: 'event-listeners', id: 'events'})
    this.sockets()
  }

  async fire (eventId, attributes) {
    const d = debug('events:fire')

    attributes = attributes || {}

    if (!_.isNil(_.get(attributes, 'username', null))) attributes.userObject = await global.users.get(attributes.username)
    if (!_.isNil(_.get(attributes, 'recipient', null))) attributes.recipientObject = await global.users.get(attributes.recipient)
    d('Firing event %s with attrs: %j', eventId, attributes)

    if (_.get(attributes, 'reset', false)) return this.reset(eventId)

    let events = await global.db.engine.find('events', { key: eventId, enabled: true })
    for (let event of events) {
      const eventId = event._id.toString()
      let [shouldRunByFilter, shouldRunByDefinition] = await Promise.all([
        this.checkFilter(eventId, attributes),
        this.checkDefinition(_.clone(event), attributes)
      ])
      d('Should run by filter', shouldRunByFilter)
      d('Should run by definition', shouldRunByDefinition)
      if ((!shouldRunByFilter || !shouldRunByDefinition)) continue

      for (let operation of (await global.db.engine.find('events.operations', { eventId: eventId }))) {
        d('Firing %j', operation)
        if (!_.isNil(attributes.userObject)) {
          // flatten userObject
          let userObject = attributes.userObject
          _.merge(attributes, flatten({userObject: userObject}))
        }
        if (!_.isNil(attributes.recipientObject)) {
          // flatten recipientObject
          let recipientObject = attributes.recipientObject
          _.merge(attributes, flatten({recipientObject: recipientObject}))
        }
        const isOperationSupported = !_.isNil(_.find(this.supportedOperationsList, (o) => o.id === operation.key))
        if (isOperationSupported) _.find(this.supportedOperationsList, (o) => o.id === operation.key).fire(operation.definitions, attributes)
        else d(`Operation ${operation.key} is not supported!`)
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

  async fireBotWillJoinChannel (operation, attributes) {
    global.client.join('#' + config.settings.broadcaster_username)
  }

  async fireBotWillLeaveChannel (operation, attributes) {
    global.client.part('#' + config.settings.broadcaster_username)
    global.users.setAll({ is: { online: false } }) // force all users offline
  }

  async fireStartCommercial (operation, attributes) {
    const d = debug('events:fireStartCommercial')
    d('Start commercials with attrs:', operation, attributes)
    global.client.commercial(config.settings.broadcaster_username, operation.durationOfCommercial)
  }

  async fireEmoteExplosion (operation, attributes) {
    const d = debug('events:fireEmoteExplosion')
    d('Emote explosion with attrs:', operation, attributes)
    global.overlays.emotes.explode(global.overlays.emotes, global.panel.io, operation.emotesToExplode.split(' '))
  }

  async firePlaySound (operation, attributes) {
    const d = debug('events:firePlaySound')
    d('Play a sound with attrs:', operation, attributes)
    // attr.sound can be filename or url
    let sound = operation.urlOfSoundFile
    if (!_.includes(sound, 'http')) {
      sound = 'dist/soundboard/' + sound + '.mp3'
    }
    global.panel.io.emit('play-sound', sound)
  }

  async fireRunCommand (operation, attributes) {
    const d = debug('events:fireRunCommand')
    d('Run command with attrs:', operation, attributes)

    let command = operation.commandToRun
    _.each(attributes, function (val, name) {
      if (_.isObject(val) && _.size(val) === 0) return true // skip empty object
      d(`Replacing $${name} with ${val}`)
      let replace = new RegExp(`\\$${name}`, 'g')
      command = command.replace(replace, val)
    })
    command = await global.parser.parseMessage(command)
    d('Running command:', command)
    global.parser.parseCommands((_.get(operation, 'isCommandQuiet', false) ? null : { username: global.parser.getOwner() }), command, true)
  }

  async fireSendChatMessageOrWhisper (operation, attributes, whisper) {
    const d = debug('events:fireSendChatMessageOrWhisper')
    let username = _.get(attributes, 'username', global.parser.getOwner())
    let message = operation.messageToSend
    console.log(attributes)
    _.each(attributes, function (val, name) {
      if (_.isObject(val) && _.size(val) === 0) return true // skip empty object
      d(`Replacing $${name} with ${val}`)
      let replace = new RegExp(`\\$${name}`, 'g')
      message = message.replace(replace, val)
    })
    message = await global.parser.parseMessage(message)
    d('Sending message:', message)
    global.commons.sendMessage(message, { username: username, 'message-type': (whisper ? 'whisper' : 'chat') })
  }

  async fireSendWhisper (operation, attributes) {
    const d = debug('events:fireSendWhisper')
    d('Sending whisper with attrs:', operation, attributes)
    global.events.fireSendChatMessageOrWhisper(operation, attributes, true)
  }

  async fireSendChatMessage (operation, attributes) {
    const d = debug('events:fireSendChatMessage')
    d('Sending chat message with attrs:', operation, attributes)
    global.events.fireSendChatMessageOrWhisper(operation, attributes, false)
  }

  async everyXMinutesOfStream (event, attributes) {
    const d = debug('events:everyXMinutesOfStream')

    // set to _.now() because 0 will trigger event immediatelly after stream start
    let shouldSave = _.get(event, 'triggered.runEveryXMinutes', 0) === 0
    event.triggered.runEveryXMinutes = _.get(event, 'triggered.runEveryXMinutes', _.now())

    let shouldTrigger = _.now() - event.triggered.runEveryXMinutes >= event.definitions.runEveryXMinutes * 60 * 1000
    if (shouldTrigger || shouldSave) {
      event.triggered.runEveryXMinutes = _.now()
      d('Updating event to %j', event)
      await global.db.engine.update('events', { _id: event._id.toString() }, event)
    }
    return shouldTrigger
  }

  async checkStreamIsRunningXMinutes (event, attributes) {
    const d = debug('events:checkStreamIsRunningXMinutes')
    event.triggered.runAfterXMinutes = _.get(event, 'triggered.runAfterXMinutes', 0)

    let shouldTrigger = event.triggered.runAfterXMinutes === 0 &&
                        moment(global.twitch.when.online).format('X') * 1000 > event.definitions.runAfterXMinutes * 60 * 1000
    if (shouldTrigger) {
      event.triggered.runAfterXMinutes = event.definitions.runAfterXMinutes
      d('Updating event to %j', event)
      await global.db.engine.update('events', { _id: event._id.toString() }, event)
    }
    return shouldTrigger
  }

  async checkNumberOfViewersIsAtLeast (event, attributes) {
    const d = debug('events:checkNumberOfViewersIsAtLeast')
    event.triggered.runInterval = _.get(event, 'triggered.runInterval', 0)

    event.definitions.runInterval = parseInt(event.definitions.runInterval, 10) // force Integer
    event.definitions.viewersAtLeast = parseInt(event.definitions.viewersAtLeast, 10) // force Integer

    d('Current viewers: %s, expected viewers: %s', global.twitch.current.viewers, event.definitions.viewersAtLeast)
    d('Run Interval: %s, triggered: %s', event.definitions.runInterval, event.triggered.runInterval)

    var shouldTrigger = global.twitch.current.viewers >= event.definitions.viewersAtLeast &&
                        ((event.definitions.runInterval > 0 && _.now() - event.triggered.runInterval >= event.definitions.runInterval * 1000) ||
                        (event.definitions.runInterval === 0 && event.triggered.runInterval === 0))
    if (shouldTrigger) {
      event.triggered.runInterval = _.now()
      d('Updating event to %j', event)
      await global.db.engine.update('events', { _id: event._id.toString() }, event)
    }
    d('Attributes for check', attributes)
    d('Should Trigger?', shouldTrigger)
    return shouldTrigger
  }

  async checkCommandSendXTimes (event, attributes) {
    const d = debug('events:checkCommandSendXTimes')
    var shouldTrigger = false
    if (attributes.message.startsWith(event.definitions.commandToWatch)) {
      event.triggered.runEveryXCommands = _.get(event, 'triggered.runEveryXCommands', 0)
      event.triggered.runInterval = _.get(event, 'triggered.runInterval', 0)

      event.definitions.runInterval = parseInt(event.definitions.runInterval, 10) // force Integer
      event.triggered.runInterval = parseInt(event.triggered.runInterval, 10) // force Integer

      event.triggered.runEveryXCommands++
      shouldTrigger =
        event.triggered.runEveryXCommands >= event.definitions.runEveryXCommands &&
        ((event.definitions.runInterval > 0 && _.now() - event.triggered.runInterval >= event.definitions.runInterval * 1000) ||
        (event.definitions.runInterval === 0 && event.triggered.runInterval === 0))
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
    delete context._; d(context, result)
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
        var errors = {
          definitions: {},
          operations: {}
        }
        try {
          const event = {
            name: data.name.trim().length ? data.name : 'events#' + crypto.createHash('md5').update(new Date().getTime().toString()).digest('hex').slice(0, 5),
            key: data.event.key,
            enabled: true,
            definitions: data.event.definitions,
            triggered: {}
          }

          // check all definitions are correctly set -> no empty values
          for (let [key, value] of Object.entries(event.definitions)) {
            if (value.length === 0) _.set(errors, `definitions.${key}`, global.translate('webpanel.events.errors.value_cannot_be_empty'))
            else if (key === 'commandToWatch' && !value.startsWith('!')) _.set(errors, 'definitions.commandToWatch', global.translate('webpanel.events.errors.command_must_start_with_!'))
            else if (key !== 'commandToWatch' && !value.match(/^\d+$/g)) _.set(errors, `definitions.${key}`, global.translate('webpanel.events.errors.this_value_must_be_a_positive_number_or_0'))
          }

          // check all operations definitions are correctly set -> no empty values
          for (let [timestamp, operation] of Object.entries(data.operations)) {
            for (let [key, value] of Object.entries(operation.definitions)) {
              if (value.length === 0) _.set(errors, `operations.${timestamp}.${key}`, global.translate('webpanel.events.errors.value_cannot_be_empty'))
              else if (key === 'commandToRun' && !value.startsWith('!')) _.set(errors, `operations.${timestamp}.${key}`, global.translate('webpanel.events.errors.command_must_start_with_!'))
            }
          }

          if (_.size(errors.definitions) > 0 || _.size(errors.operations) > 0) throw Error(JSON.stringify(errors))

          if (_.isNil(eventId)) eventId = (await global.db.engine.insert('events', event))._id.toString()
          else {
            await Promise.all([
              global.db.engine.remove('events', { _id: eventId }, event),
              global.db.engine.remove('events.filters', { eventId: eventId }),
              global.db.engine.remove('events.operations', { eventId: eventId })
            ])
            eventId = (await global.db.engine.insert('events', event))._id.toString()
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
          global.log.warning(e.message)

          if (!_.isNil(eventId) && _.isNil(data._id)) { // eventId is __newly__ created, rollback all changes
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
      socket.on('test.event', async (eventId) => {
        let generateUsername = () => {
          const adject = ['Encouraging', 'Plucky', 'Glamorous', 'Endearing', 'Fast', 'Agitated', 'Mushy', 'Muddy', 'Sarcastic', 'Real', 'Boring']
          const subject = ['Sloth', 'Beef', 'Fail', 'Fish', 'Fast', 'Raccoon', 'Dog', 'Man', 'Pepperonis', 'RuleFive', 'Slug', 'Cat', 'SogeBot']
          return _.sample(adject) + _.sample(subject)
        }

        const username = _.sample(['short', 'someFreakingLongUsername', generateUsername()])
        const recipient = _.sample(['short', 'someFreakingLongUsername', generateUsername()])
        const months = _.random(0, 99, false)
        let attributes = {
          username: username,
          userObject: await global.users.get(username),
          recipient: recipient,
          recipientObject: await global.users.get(recipient),
          months: months,
          monthsName: global.parser.getLocalizedName(months, 'core.months'),
          message: _.sample(['', 'Lorem Ipsum Dolor Sit Amet']),
          viewers: _.random(0, 9999, false),
          autohost: _.random(0, 1, false) === 0,
          bits: _.random(1, 1000000, false),
          duration: _.sample([30, 60, 90, 120, 150, 180]),
          reason: _.sample(['', 'Lorem Ipsum Dolor Sit Amet']),
          command: '!testcommand',
          count: _.random(0, 9999, false),
          method: _.random(0, 1, false) === 0 ? 'Twitch Prime' : ''
        }
        for (let operation of (await global.db.engine.find('events.operations', { eventId: eventId }))) {
          d('Firing %j', operation)
          if (!_.isNil(attributes.userObject)) {
            // flatten userObject
            let userObject = attributes.userObject
            _.merge(attributes, flatten({userObject: userObject}))
          }
          const isOperationSupported = !_.isNil(_.find(this.supportedOperationsList, (o) => o.id === operation.key))
          if (isOperationSupported) _.find(this.supportedOperationsList, (o) => o.id === operation.key).fire(operation.definitions, attributes)
          else d(`Operation ${operation.key} is not supported!`)
        }
      })
    })
  }
}

module.exports = Events

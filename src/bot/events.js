'use strict'

const _ = require('lodash')
const debug = require('debug')
const crypto = require('crypto')
const safeEval = require('safe-eval')
const flatten = require('flat')
const moment = require('moment')
const cluster = require('cluster')
const config = require('@config')
const axios = require('axios')

const Message = require('./message')
const Timeout = require('./timeout')

class Events {
  constructor () {
    this.timeouts = {}

    if (cluster.isWorker) return // dont do anything on worker

    this.supportedEventsList = [
      { id: 'user-joined-channel', variables: [ 'username', 'userObject' ] },
      { id: 'user-parted-channel', variables: [ 'username', 'userObject' ] },
      { id: 'follow', variables: [ 'username', 'userObject' ] },
      { id: 'unfollow', variables: [ 'username', 'userObject' ] },
      { id: 'subscription', variables: [ 'username', 'userObject', 'method' ] },
      { id: 'subgift', variables: [ 'username', 'userObject', 'recipient', 'recipientObject' ] },
      { id: 'subcommunitygift', variables: [ 'username', 'count' ] },
      { id: 'resub', variables: [ 'username', 'userObject', 'months', 'monthsName', 'message' ] },
      { id: 'tip', variables: [ 'username', 'amount', 'currency', 'message' ] },
      { id: 'command-send-x-times', variables: [ 'username', 'userObject', 'command', 'count' ], definitions: { fadeOutXCommands: 0, fadeOutInterval: 0, runEveryXCommands: 10, commandToWatch: '', runInterval: 0 }, check: this.checkCommandSendXTimes }, // runInterval 0 or null - disabled; > 0 every x seconds
      { id: 'keyword-send-x-times', variables: [ 'username', 'userObject', 'command', 'count' ], definitions: { fadeOutXKeywords: 0, fadeOutInterval: 0, runEveryXKeywords: 10, keywordToWatch: '', runInterval: 0, resetCountEachMessage: false }, check: this.checkKeywordSendXTimes }, // runInterval 0 or null - disabled; > 0 every x seconds
      { id: 'number-of-viewers-is-at-least-x', variables: [ 'count' ], definitions: { viewersAtLeast: 100, runInterval: 0 }, check: this.checkNumberOfViewersIsAtLeast }, // runInterval 0 or null - disabled; > 0 every x seconds
      { id: 'stream-started' },
      { id: 'stream-stopped' },
      { id: 'stream-is-running-x-minutes', definitions: { runAfterXMinutes: 100 }, check: this.checkStreamIsRunningXMinutes },
      { id: 'cheer', variables: [ 'username', 'userObject', 'bits', 'message' ] },
      { id: 'clearchat' },
      { id: 'action', variables: [ 'username', 'userObject' ] },
      { id: 'ban', variables: [ 'username', 'userObject', 'reason' ] },
      { id: 'hosting', variables: [ 'target', 'viewers' ] },
      { id: 'hosted', variables: [ 'username', 'userObject', 'viewers', 'autohost' ], definitions: { viewersAtLeast: 1, ignoreAutohost: false }, check: this.checkHosted },
      { id: 'raid', variables: [ 'username', 'userObject', 'viewers' ], definitions: { viewersAtLeast: 1 }, check: this.checkRaid },
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
      { id: 'bot-will-leave-channel', definitions: {}, fire: this.fireBotWillLeaveChannel },
      { id: 'create-a-clip', definitions: { announce: false, hasDelay: true }, fire: this.fireCreateAClip },
      { id: 'create-a-clip-and-play-replay', definitions: { announce: false, hasDelay: true }, fire: this.fireCreateAClipAndPlayReplay },
      { id: 'increment-custom-variable', definitions: { customVariable: '', numberToIncrement: '' }, fire: this.fireIncrementCustomVariable },
      { id: 'decrement-custom-variable', definitions: { customVariable: '', numberToDecrement: '' }, fire: this.fireDecrementCustomVariable }
    ]

    this.panel()
    this.fadeOut()

    cluster.on('message', (worker, data) => {
      if (data !== 'event') return // throw away another events
      this.fire(data.eventId, data.attributes)
    })
  }

  async panel () {
    if (_.isNil(global.panel)) return setTimeout(() => this.panel(), 10)
    global.panel.addMenu({ category: 'manage', name: 'event-listeners', id: 'events' })
    this.sockets()
  }

  async fadeOut () {
    const d = debug('events:fadeout')

    try {
      let commands = await global.db.engine.find('events', { key: 'command-send-x-times' }); d(commands)
      let keywords = await global.db.engine.find('events', { key: 'keyword-send-x-times' }); d(keywords)
      for (let event of _.merge(commands, keywords)) {
        if (_.isNil(_.get(event, 'triggered.fadeOutInterval', null))) {
          // fadeOutInterval init
          await global.db.engine.update('events', { _id: event._id.toString() }, { triggered: { fadeOutInterval: _.now() } })
        } else {
          if (_.now() - event.triggered.fadeOutInterval >= event.definitions.fadeOutInterval * 1000) {
            // fade out commands
            if (event.key === 'command-send-x-times') {
              if (!_.isNil(_.get(event, 'triggered.runEveryXCommands', null))) {
                if (event.triggered.runEveryXCommands <= 0) continue
                await global.db.engine.update('events', { _id: event._id.toString() }, { triggered: { fadeOutInterval: _.now(), runEveryXCommands: event.triggered.runEveryXCommands - event.definitions.fadeOutXCommands } })
              }
            } else if (event.key === 'keyword-send-x-times') {
              if (!_.isNil(_.get(event, 'triggered.runEveryXKeywords', null))) {
                if (event.triggered.runEveryXKeywords <= 0) continue
                await global.db.engine.update('events', { _id: event._id.toString() }, { triggered: { fadeOutInterval: _.now(), runEveryXKeywords: event.triggered.runEveryXKeywords - event.definitions.fadeOutXKeywords } })
              }
            }
          }
        }
      }
    } catch (e) {
      console.error(e.stack)
    } finally {
      new Timeout().recursive({ uid: 'fadeOut', this: this, fnc: this.fadeOut, wait: 1000 })
    }
  }

  async fire (eventId, attributes) {
    const d = debug('events:fire')
    attributes = _.clone(attributes) || {}

    if (cluster.isWorker) { // emit process to master
      process.send({ type: 'event', eventId: eventId, attributes: attributes })
      return
    }

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
          _.merge(attributes, flatten({ userObject: userObject }))
        }
        if (!_.isNil(attributes.recipientObject)) {
          // flatten recipientObject
          let recipientObject = attributes.recipientObject
          _.merge(attributes, flatten({ recipientObject: recipientObject }))
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
      await global.db.engine.update('events', { _id: event._id.toString() }, event)
    }
  }

  async fireCreateAClip (operation, attributes) {
    const d = debug('events:fireCreateAClip')
    d('Clip creation with attrs:', operation, attributes)
    let cid = await global.api.createClip({ hasDelay: operation.hasDelay })
    if (cid) { // OK
      if (Boolean(operation.announce) === true) {
        let message = await global.commons.prepare('api.clips.created', { link: `https://clips.twitch.tv/${cid}` })
        global.commons.sendMessage(message, { username: global.commons.getOwner() })
      }
      return cid
    } else { // NG
      return null
    }
  }

  async fireCreateAClipAndPlayReplay (operation, attributes) {
    const d = debug('events:fireCreateAClipAndPlayReplay')
    d('Waiting for clip creation')
    let cid = await global.events.fireCreateAClip(operation, attributes)
    if (cid) { // clip created ok
      const clip = [
        'type=clip',
        'id=' + cid,
        'position=' + await global.configuration.getValue('replayPosition'),
        'x-offset=' + await global.configuration.getValue('replayOffsetX'),
        'y-offset=' + await global.configuration.getValue('replayOffsetY'),
        'size=' + await global.configuration.getValue('replaySize'),
        'volume=' + await global.configuration.getValue('replayVolume'),
        'label=' + await global.configuration.getValue('replayLabel'),
        'filter=' + await global.configuration.getValue('replayFilter'),
        'class=replay'
      ]
      global.overlays.alerts.overlay({ sender: { username: global.commons.getOwner() }, parameters: clip.join(' ') })
    }
  }

  async fireBotWillJoinChannel (operation, attributes) {
    global.client.join('#' + config.settings.broadcaster_username)
  }

  async fireBotWillLeaveChannel (operation, attributes) {
    global.client.part('#' + config.settings.broadcaster_username)
    global.db.engine.remove('users.online', {}) // force all users offline
  }

  async fireStartCommercial (operation, attributes) {
    const d = debug('events:fireStartCommercial')
    d('Start commercials with attrs:', operation, attributes)

    const cid = await global.cache.channelId()
    const url = `https://api.twitch.tv/kraken/channels/${cid}/commercial`

    await axios({
      method: 'post',
      url,
      data: { length: operation.durationOfCommercial },
      headers: {
        'Authorization': 'OAuth ' + config.settings.bot_oauth.split(':')[1],
        'Client-ID': config.settings.client_id,
        'Accept': 'application/vnd.twitchtv.v5+json',
        'Content-Type': 'application/json'
      }
    })
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
    attributes = _(attributes).toPairs().sortBy((o) => -o[0].length).fromPairs().value() // reorder attributes by key length
    _.each(attributes, function (val, name) {
      if (_.isObject(val) && _.size(val) === 0) return true // skip empty object
      d(`Replacing $${name} with ${val}`)
      let replace = new RegExp(`\\$${name}`, 'g')
      command = command.replace(replace, val)
    })
    command = await new Message(command).parse({ username: global.commons.getOwner() })
    _.sample(cluster.workers).send({ type: 'message', sender: (_.get(operation, 'isCommandQuiet', false) ? null : { username: global.commons.getOwner() }), message: command, skip: true })
  }

  async fireSendChatMessageOrWhisper (operation, attributes, whisper) {
    const d = debug('events:fireSendChatMessageOrWhisper')
    let username = _.isNil(attributes.username) ? global.commons.getOwner() : attributes.username
    let message = operation.messageToSend
    const atUsername = await global.configuration.getValue('atUsername')

    attributes = _(attributes).toPairs().sortBy((o) => -o[0].length).fromPairs().value() // reorder attributes by key length
    for (let [name, val] of Object.entries(attributes)) {
      if (_.isObject(val) && _.size(val) === 0) continue // skip empty object
      if (name.includes('username') || name.includes('recipient')) val = atUsername ? `@${val}` : val
      d(`Replacing $${name} with ${val}`)
      let replace = new RegExp(`\\$${name}`, 'g')
      message = message.replace(replace, val)
    }
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

  async fireIncrementCustomVariable (operation, attributes) {
    debug('events:fireIncrementCustomVariable')('Sending chat message with attrs:', operation, attributes)
    const customVariableName = operation.customVariable
    const numberToIncrement = operation.numberToIncrement

    // check if value is number
    let cvFromDb = await global.db.engine.findOne('customvars', { key: customVariableName })
    let value = null
    if (_.isEmpty(cvFromDb)) {
      await global.db.engine.insert('customvars', { key: customVariableName, value: numberToIncrement })
    } else {
      if (!_.isFinite(parseInt(cvFromDb.value, 10))) value = numberToIncrement
      else value = parseInt(cvFromDb.value, 10) + parseInt(numberToIncrement, 10)
      await global.db.engine.update('customvars', { _id: cvFromDb._id.toString() }, { value: value.toString() })
    }

    // Update widgets and titles
    global.widgets.custom_variables.io.emit('refresh')
    const regexp = new RegExp(`\\$_${customVariableName}`, 'ig')
    let title = await global.cache.rawStatus()
    if (title.match(regexp)) global.api.setTitleAndGame(null)
  }

  async fireDecrementCustomVariable (operation, attributes) {
    debug('events:fireDecrementCustomVariable')('Sending chat message with attrs:', operation, attributes)
    const customVariableName = operation.customVariable
    const numberToDecrement = operation.numberToDecrement

    // check if value is number
    let cvFromDb = await global.db.engine.findOne('customvars', { key: customVariableName })
    let value = null
    if (_.isEmpty(cvFromDb)) {
      await global.db.engine.insert('customvars', { key: customVariableName, value: numberToDecrement })
    } else {
      if (!_.isFinite(parseInt(cvFromDb.value, 10))) value = numberToDecrement * -1
      else value = parseInt(cvFromDb.value, 10) - parseInt(numberToDecrement, 10)
      await global.db.engine.update('customvars', { _id: cvFromDb._id.toString() }, { value: value.toString() })
    }

    // Update widgets and titles
    global.widgets.custom_variables.io.emit('refresh')
    const regexp = new RegExp(`\\$_${customVariableName}`, 'ig')
    let title = await global.cache.rawStatus()
    if (title.match(regexp)) global.api.setTitleAndGame(null)
  }

  async everyXMinutesOfStream (event, attributes) {
    const d = debug('events:everyXMinutesOfStream')

    // set to new Date() because 0 will trigger event immediatelly after stream start
    let shouldSave = _.get(event, 'triggered.runEveryXMinutes', 0) === 0
    event.triggered.runEveryXMinutes = _.get(event, 'triggered.runEveryXMinutes', new Date())

    let shouldTrigger = _.now() - new Date(event.triggered.runEveryXMinutes).getTime() >= event.definitions.runEveryXMinutes * 60 * 1000
    d('Should save: %s', shouldSave)
    d('Should trigger: %s', shouldTrigger)
    d('Minutes to trigger: %s', -Number((_.now() - new Date(event.triggered.runEveryXMinutes).getTime() - (event.definitions.runEveryXMinutes * 60 * 1000)) / 60000).toFixed(2))
    if (shouldTrigger || shouldSave) {
      event.triggered.runEveryXMinutes = new Date()
      d('Updating event to %j', event)
      await global.db.engine.update('events', { _id: event._id.toString() }, event)
    }
    return shouldTrigger
  }

  async checkRaid (event, attributes) {
    const d = debug('events:checkRaid')

    event.definitions.viewersAtLeast = parseInt(event.definitions.viewersAtLeast, 10) // force Integer
    const shouldTrigger = (attributes.viewers >= event.definitions.viewersAtLeast)

    d('Current viewers: %s, expected viewers: %s', attributes.viewers, event.definitions.viewersAtLeast)
    d('Should trigger: %s', shouldTrigger)

    return shouldTrigger
  }

  async checkHosted (event, attributes) {
    const d = debug('events:checkHosted')

    event.definitions.viewersAtLeast = parseInt(event.definitions.viewersAtLeast, 10) // force Integer

    d('Current viewers: %s, expected viewers: %s', attributes.viewers, event.definitions.viewersAtLeast)
    d('Autohost: %s, ignore Autohost: %s', attributes.autohost, event.definitions.ignoreAutohost)

    var shouldTrigger = (attributes.viewers >= event.definitions.viewersAtLeast) &&
                        ((!attributes.autohost && event.definitions.ignoreAutohost) || !event.definitions.ignoreAutohost)

    d('Should trigger: %s', shouldTrigger)
    return shouldTrigger
  }

  async checkStreamIsRunningXMinutes (event, attributes) {
    const d = debug('events:checkStreamIsRunningXMinutes')
    const when = await global.cache.when()
    event.triggered.runAfterXMinutes = _.get(event, 'triggered.runAfterXMinutes', 0)
    let shouldTrigger = event.triggered.runAfterXMinutes === 0 &&
                        moment().format('X') - moment(when.online).format('X') > event.definitions.runAfterXMinutes * 60
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

    const viewers = (await global.db.engine.findOne('api.current', { key: 'viewers' })).value
    d('Current viewers: %s, expected viewers: %s', viewers, event.definitions.viewersAtLeast)
    d('Run Interval: %s, triggered: %s', event.definitions.runInterval, event.triggered.runInterval)

    var shouldTrigger = viewers >= event.definitions.viewersAtLeast &&
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
    const regexp = new RegExp(`^${event.definitions.commandToWatch}\\s`, 'i')

    var shouldTrigger = false
    attributes.message += ' '
    if (attributes.message.match(regexp)) {
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

  async checkKeywordSendXTimes (event, attributes) {
    const d = debug('events:checkKeywordSendXTimes')
    const regexp = new RegExp(`${event.definitions.keywordToWatch}`, 'gi')

    var shouldTrigger = false
    attributes.message += ' '
    const match = attributes.message.match(regexp)
    if (match) {
      event.triggered.runEveryXKeywords = _.get(event, 'triggered.runEveryXKeywords', 0)
      event.triggered.runInterval = _.get(event, 'triggered.runInterval', 0)

      event.definitions.runInterval = parseInt(event.definitions.runInterval, 10) // force Integer
      event.triggered.runInterval = parseInt(event.triggered.runInterval, 10) // force Integer

      if (event.definitions.resetCountEachMessage) {
        event.triggered.runEveryXKeywords = 0
      }

      // add count from match
      event.triggered.runEveryXKeywords = Number(event.triggered.runEveryXKeywords) + Number(match.length)

      shouldTrigger =
        event.triggered.runEveryXKeywords >= event.definitions.runEveryXKeywords &&
        ((event.definitions.runInterval > 0 && _.now() - event.triggered.runInterval >= event.definitions.runInterval * 1000) ||
        (event.definitions.runInterval === 0 && event.triggered.runInterval === 0))
      if (shouldTrigger) {
        event.triggered.runInterval = _.now()
        event.triggered.runEveryXKeywords = 0
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

    const check = (_.find(this.supportedEventsList, (o) => o.id === event.key)).check
    d('Searching check fnc for %j | %j', event, check)
    if (_.isNil(check)) return true

    d('Running check on %s', check.name)
    return check(event, attributes)
  }

  async checkFilter (eventId, attributes) {
    const d = debug('events:checkFilter')
    d('Checking filters | %j, %j', eventId, attributes)
    const filter = (await global.db.engine.findOne('events.filters', { eventId: eventId })).filters
    if (typeof filter === 'undefined' || filter.trim().length === 0) return true
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
      $game: _.get(await global.db.engine.findOne('api.current', { key: 'game' }), 'value', 'n/a'),
      $title: _.get(await global.db.engine.findOne('api.current', { key: 'status' }), 'value', 'n/a'),
      $views: _.get(await global.db.engine.findOne('api.current', { key: 'views' }), 'value', 0),
      $followers: _.get(await global.db.engine.findOne('api.current', { key: 'followers' }), 'value', 0),
      $hosts: _.get(await global.db.engine.findOne('api.current', { key: 'hosts' }), 'value', 0),
      $subscribers: _.get(await global.db.engine.findOne('api.current', { key: 'subscribers' }), 'value', 0)
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
            else if (['commandToWatch'].includes(key) && !value.startsWith('!')) _.set(errors, 'definitions.commandToWatch', global.translate('webpanel.events.errors.command_must_start_with_!'))
            else if (!['commandToWatch', 'keywordToWatch'].includes(key) && !_.isBoolean(value) && !value.match(/^\d+$/g)) _.set(errors, `definitions.${key}`, global.translate('webpanel.events.errors.this_value_must_be_a_positive_number_or_0'))
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
              global.db.engine.remove('events', { _id: eventId }),
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
          monthsName: global.commons.getLocalizedName(months, 'core.months'),
          message: _.sample(['', 'Lorem Ipsum Dolor Sit Amet']),
          viewers: _.random(0, 9999, false),
          autohost: _.random(0, 1, false) === 0,
          bits: _.random(1, 1000000, false),
          duration: _.sample([30, 60, 90, 120, 150, 180]),
          reason: _.sample(['', 'Lorem Ipsum Dolor Sit Amet']),
          command: '!testcommand',
          count: _.random(0, 9999, false),
          method: _.random(0, 1, false) === 0 ? 'Twitch Prime' : '',
          amount: _.random(0, 9999, true).toFixed(2),
          currency: _.sample(['CZK', 'USD', 'EUR'])
        }
        for (let operation of (await global.db.engine.find('events.operations', { eventId: eventId }))) {
          d('Firing %j', operation)
          if (!_.isNil(attributes.userObject)) {
            // flatten userObject
            let userObject = attributes.userObject
            _.merge(attributes, flatten({ userObject: userObject }))
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

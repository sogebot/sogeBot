'use strict'

const _ = require('lodash')
const debug = require('debug')
const crypto = require('crypto')

class Events {
  constructor () {
    this.supportedEventsList = [
      { id: 'user-joined-channel', variables: [ 'username', 'userObject' ] },
      { id: 'user-parted-channel', variables: [ 'username', 'userObject' ] },
      { id: 'follow', variables: [ 'username', 'userObject' ] },
      { id: 'unfollow', variables: [ 'username', 'userObject' ] },
      { id: 'subscription', variables: [ 'username', 'userObject', 'method' ] },
      { id: 'resub', variables: [ 'username', 'userObject', 'months', 'monthsName', 'message' ] },
      { id: 'command-send-x-times', variables: [ 'command', 'count' ], definitions: { runEveryXCommands: 10, commandToWatch: '', runInterval: 0 } }, // runInterval 0 or null - disabled; > 0 every x seconds
      { id: 'number-of-viewers-is-at-least-x', variables: [ 'count' ], definitions: { viewersAtLeast: 100, runInterval: 0 } }, // runInterval 0 or null - disabled; > 0 every x seconds
      { id: 'stream-started' },
      { id: 'stream-stopped' },
      { id: 'stream-is-running-x-minutes', definitions: { runEveryXMinutes: 100 } },
      { id: 'cheer', variables: [ 'username', 'userObject', 'bits', 'message' ] },
      { id: 'clearchat' },
      { id: 'action', variables: [ 'username', 'userObject' ] },
      { id: 'ban', variables: [ 'username', 'userObject', 'reason' ] },
      { id: 'hosting', variables: [ 'target', 'viewers' ] },
      { id: 'hosted', variables: [ 'username', 'userObject', 'viewers', 'autohost' ] },
      { id: 'mod', variables: [ 'username', 'userObject' ] },
      { id: 'commercial', variables: [ 'duration' ] },
      { id: 'timeout', variables: [ 'username', 'userObject', 'reason', 'duration' ] },
      { id: 'every-x-seconds', definitions: { runEveryXSeconds: 600 } },
      { id: 'game-changed', variables: [ 'oldGame', 'game' ] }
    ]

    this.supportedOperationsList = [
      { id: 'send-chat-message', definitions: { messageToSend: '' } },
      { id: 'send-whisper', definitions: { messageToSend: '' } },
      { id: 'run-command', definitions: { commandToRun: '', isCommandQuiet: false } },
      { id: 'play-sound', definitions: { urlOfSoundFile: '' } },
      { id: 'emote-explosion', definitions: { emotesToExplode: '' } },
      { id: 'start-commercial', definitions: { durationOfCommercial: [30, 60, 90, 120, 150, 180] } }
      /* TODO: move event logging outside of ops list */
    ]

    global.panel.addMenu({category: 'manage', name: 'event-listeners', id: 'events'})
    this.sockets()
  }

  async fire (eventId, attributes) {
    const d = debug('events:fire')
    if (!_.isNil(_.get(attributes, 'username', null))) attributes.senderObj = await global.users.get(attributes.username)
    d('Firing event %s with attrs: %j', eventId, attributes)
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
        if (_.isNil(data._id)) { // save event as new (without _id)
          var eventId = null
          try {
            const event = {
              name: data.name.trim().length ? data.name : 'events#' + crypto.createHash('md5').update(new Date().getTime().toString()).digest('hex').slice(0, 5),
              key: data.event.key,
              enabled: true,
              definitions: data.event.definitions
            }
            eventId = (await global.db.engine.insert('events', event))._id.toString()

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

            if (!_.isNill(eventId)) { // eventId is created, rollback all changes
              await Promise.all([
                global.db.engine.remove('events', { _id: eventId }),
                global.db.engine.remove('events.filter', { eventId: eventId }),
                global.db.engine.remove('events.operation', { eventId: eventId })
              ])
            }
            callback(e, e.message)
          }
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
    })
  }
}
/*
  this.eventsTemplate = _.cloneDeep(this.events)

  this.operations = {
    'send-chat-message': async function (attr) {
      if (_.isNil(attr.send)) return

      let username = _.get(attr, 'username', global.parser.getOwner())
      let message = attr.send
      _.each(attr, function (val, name) {
        debug(`Replacing $${name} with ${val}`)
        let replace = new RegExp(`\\$${name}`, 'g')
        message = message.replace(replace, val)
      })
      message = await global.parser.parseMessage(message)

      global.commons.sendMessage(message, { username: username })
      delete attr.username
    },
    'send-whisper': async function (attr) {
      if (_.isNil(attr.username) || _.isNil(attr.send)) return

      let username = _.get(attr, 'username', global.parser.getOwner())
      let message = attr.send
      _.each(attr, function (val, name) {
        let replace = new RegExp(`\\$${name}`, 'g')
        message = message.replace(replace, val)
      })
      message = await global.parser.parseMessage(message)
      global.commons.sendMessage(message, { username: username, 'message-type': 'whisper' })
      delete attr.username
    },
    'run-command': async function (attr) {
      debug(attr)
      let command = attr.command

      if (_.isNil(attr.quiet)) attr.quiet = false
      _.each(attr, function (val, name) {
        debug('replace $%s with value: %s', name, val)
        let replace = new RegExp(`\\$${name}`, 'g')
        command = command.replace(replace, val)
      })
      debug(command)
      command = await global.parser.parseMessage(command)
      global.parser.parseCommands({ username: (attr.quiet) ? null : global.parser.getOwner() }, command)
    },
    'play-sound': function (attr) {
      // attr.sound can be filename or url
      let sound = attr.sound
      if (!_.includes(sound, 'http')) {
        sound = 'dist/soundboard/' + sound + '.mp3'
      }
      global.panel.io.emit('play-sound', sound)
    },
    'emote-explosion': function (attr) {
      // attr.emotes is string with emotes to show
      global.overlays.emotes.explode(global.overlays.emotes, global.panel.io, attr.emotes.split(' '))
    },
    'start-commercial': function (attr) {
      // attr.duration - duration of commercial
      global.client.commercial(config.settings.broadcaster_username, attr.duration)
    },
    'log': function (attr) {
      let string = attr.string.replace(/\$username/g, attr.username)
      _.each(string.match(/\$(\w+)/gi), function (match) {
        let value = !_.isNil(attr[match.replace('$', '')]) ? attr[match.replace('$', '')] : 'none'
        string = string.replace(match, value)
      })
      if (attr.webhooks) {
        string = string + '(webhooks)'
      }
      global.log[attr.level](string)
    },
    '_function': function (attr) {
      attr.fnc(_.clone(attr))
    }
  }

  this._update(this)
  this._webpanel(this)
}

Events.prototype.removeSystemEvents = function (self) {
  let nonSystemEvents = _.cloneDeep(self.eventsTemplate)
  _.each(self.events, function (events, n) {
    _.each(events, function (event, index) {
      let filtered = _.filter(event, function (o, i) {
        return !o.system
      })
      if (filtered.length > 0) nonSystemEvents[n].push(event)
    })
  })
  return nonSystemEvents
}

Events.prototype.loadSystemEvents = function (self) {
  self.events = self.removeSystemEvents(self)

  self.events['user-joined-channel'].push([
    { system: true, name: '_function', fnc: global.widgets.joinpart.send, type: 'join' }
  ])
  self.events['user-parted-channel'].push([
    { system: true, name: '_function', fnc: global.widgets.joinpart.send, type: 'part' }
  ])
  self.events['timeout'].push([
    { system: true, name: 'log', string: 'username: $username, reason: $reason, duration: $duration', level: 'timeout' }
  ])
  self.events['follow'].push([
    { system: true, name: 'log', string: '$username', level: 'follow' },
    { system: true, name: '_function', fnc: global.overlays.eventlist.add, type: 'follow' }
  ])
  self.events['resub'].push([
    { system: true, name: '_function', fnc: global.overlays.eventlist.add, type: 'resub' },
    { system: true, name: 'log', string: '$username, months: $months, message: $message', level: 'resub' }
  ])
  self.events['subscription'].push([
    { system: true, name: '_function', fnc: global.overlays.eventlist.add, type: 'sub' },
    { system: true, name: 'log', string: '$username, method: $method', level: 'sub' }
  ])
  self.events['unfollow'].push([
    { system: true, name: 'log', string: '$username', level: 'unfollow' }
  ])
  self.events['ban'].push([
    { system: true, name: 'log', string: '$username, reason: $reason', level: 'ban' }
  ])
  self.events['cheer'].push([
    { system: true, name: '_function', fnc: global.overlays.eventlist.add, type: 'cheer' },
    { system: true, name: 'log', string: '$username, bits: $bits, message: $message', level: 'cheer' }
  ])
}

Events.prototype._webpanel = function (self) {
  global.panel.addMenu({category: 'manage', name: 'event-listeners', id: 'events'})

  global.panel.socketListening(this, 'events.get', this._send)
  global.panel.socketListening(this, 'events.new', this._new)
  global.panel.socketListening(this, 'events.delete', this._delete)
}

Events.prototype._delete = function (self, socket, data) {
  if (data.definition) {
    _.each(self.events[data.event], function (event, index) {
      let keys = Object.keys(event[0])
      for (let i = 0; i < keys.length; i++) {
        if (event[0][keys[i]] !== data.definition[keys[i]] && keys[i] !== 'tTriggered' && keys[i] !== 'tSent') return true
      }

      let events = []
      _.each(self.events[data.event], function (event, index2) {
        if (index !== index2) {
          events.push(event)
          return true
        }

        let filtered = _.filter(event, function (o) {
          if (o.definition) return true

          let keys = Object.keys(o)
          let isSame = true
          for (let i = 0; i < keys.length; i++) {
            // exclude message and reset as they are created in source
            if (o[keys[i]] !== data[keys[i]] && !_.isUndefined(data[keys[i]])) isSame = false
          }
          return !isSame
        })
        // we don't want to store only definition
        if (filtered.length > 1) events.push(filtered)
      })
      self.events[data.event] = events
    })
  } else {
    let events = []
    _.each(self.events[data.event], function (event) {
      let filtered = _.filter(event, function (o) {
        let keys = Object.keys(o)
        let isSame = true
        for (let i = 0; i < keys.length; i++) {
          if (o[keys[i]] !== data[keys[i]] && !_.isUndefined(data[keys[i]])) isSame = false
        }
        return !isSame
      })
      if (filtered.length > 0) events.push(filtered)
    })
    self.events[data.event] = events
  }
  self._save(self)
  self._send(self, socket)
}

Events.prototype._send = function (self, socket) {
  let events = {}
  _.each(self.events, function (o, n) {
    if (o.length === 0) {
      events[n] = self.events[n]
      return true
    }
    events[n] = []
    let eventBatch = []
    _.each(o, function (v) {
      _.each(v, function (v2) {
        if (!v2.system) eventBatch.push(v2)
      })
    })
    if (eventBatch.length !== 0) events[n].push(eventBatch)
  })
  socket.emit('events', { events: events, operations: _.filter(Object.keys(self.operations), function (o) { return !o.startsWith('_') }) })
}

Events.prototype._new = function (self, socket, data) {
  let event = []
  let operation = {}
  let isAdd = -1

  if (!_.isNil(data.definition)) {
    let definition = { definition: true }
    if (data.event === 'command-send-x-times') {
      definition.command = data.definition.command
      definition.tCount = data.definition.count
      definition.tTimestamp = data.definition.timestamp
      definition.tSent = 0
      definition.tTriggered = new Date().getTime() - (data.definition.timestamp * 1000)
    }

    if (data.event === 'number-of-viewers-is-at-least-x') {
      definition.viewers = data.definition.count
      definition.tTriggered = data.definition.timestamp === 0 ? false : new Date().getTime() - (data.definition.timestamp * 1000)
      definition.tTimestamp = data.definition.timestamp
    }

    if (data.event === 'stream-is-running-x-minutes') {
      definition.tTriggered = false
      definition.tCount = data.definition.count
    }

    if (data.event === 'every-x-seconds') {
      definition.tCount = parseInt(data.definition.count, 10)
      definition.tTriggered = new Date().getTime()
    }

    _.each(self.events[data.event], function (aEvent, index) {
      let keys = Object.keys(aEvent[0])
      // re-do definition
      for (let i = 0; i < keys.length; i++) {
        if (aEvent[0][keys[i]] !== definition[keys[i]] && keys[i] !== 'tTriggered' && keys[i] !== 'tSent') return true
      }
      isAdd = index
      event = self.events[data.event][index]
    })
    if (isAdd === -1) event.push(definition)
  }
  _.each(data.operation, function (v, i) {
    if (v.length === 0) return
    operation[i] = v
  })
  event.push(operation)

  if (isAdd > -1) self.events[data.event][isAdd] = event
  else self.events[data.event].push(event)
  self._save(self)
  self._send(self, socket)
}

Events.prototype._update = async function (self) {
  // wait for widgets to load and repeat
  if (_.isNil(global.widgets)) {
    setTimeout(() => {
      this._update(this)
    }, 1000)
    return
  }

  let events = await global.db.engine.find('events')
  _.each(events, function (event) {
    try {
      self.events[event.key] = JSON.parse(event.value)
    } catch (e) { // little bit of hack for backward compatibility
      self.events[event.key] = [event.value]
    }
  })
  self.loadSystemEvents(self)
}

Events.prototype._save = function (self) {
  let events = self.removeSystemEvents(self)
  _.each(events, function (event, key) {
    debug('Saving event %s: %j', key, event)
    debug('events', { key: key }, { key: key, value: event })
    global.db.engine.update('events', { key: key }, { key: key, value: JSON.stringify(event) })
  })
}

Events.prototype.fire = async function (event, attr) {
  attr = attr || {}

  debug('Event fired: %j', event)
  debug('Attr: %j', attr)

  if (!_.isNil(attr.username)) {
    let ignoredUser = await global.db.engine.findOne('users_ignorelist', { username: attr.username })
    if (!_.isEmpty(ignoredUser) && attr.username !== config.settings.broadcaster_username) return
  }

  if (_.isNil(this.events[event])) return true

  let operationsBulk = this.events[event]

  var self = this
  _.each(operationsBulk, function (operations) {
    _.each(operations, function (operation) {
      debug('Running op: %j', operation)
      if (operation.definition) {
        switch (event) {
          case 'command-send-x-times':
            if (attr.message.startsWith(operation.command)) {
              operation.tSent += 1
              if (operation.tSent >= operation.tCount && new Date().getTime() - operation.tTriggered >= operation.tTimestamp * 1000) {
                operation.tSent = 0
                operation.tTriggered = new Date().getTime()
                return true
              }
            }
            break
          case 'stream-is-running-x-minutes':
            if (!_.isNil(attr.reset) && attr.reset) {
              operation.tTriggered = false
              return false
            }
            if (!operation.tTriggered && new Date().getTime() - (moment(global.twitch.when.online).format('X') * 1000) > operation.tCount * 60 * 1000) {
              operation.tTriggered = true
              return true
            }
            break
          case 'number-of-viewers-is-at-least-x':
            if (!_.isNil(attr.reset) && attr.reset) {
              operation.tTriggered = false
              return false
            }

            if (parseInt(operation.tTimestamp, 10) > 0) {
              if (global.twitch.currentViewers >= parseInt(operation.viewers, 10) && new Date().getTime() - operation.tTriggered >= operation.tTimestamp * 1000) {
                operation.tTriggered = new Date().getTime()
                return true
              }
            } else if (!operation.tTriggered && global.twitch.currentViewers >= parseInt(operation.viewers, 10)) { // run only once if tTimestamp === 0
              operation.tTriggered = true
              return true
            }
            break
          case 'every-x-seconds':
            if (!_.isNil(attr.reset) && attr.reset) {
              operation.tTriggered = new Date().getTime()
              return false
            }
            if (new Date().getTime() - operation.tTriggered >= operation.tCount * 1000) {
              operation.tTriggered = new Date().getTime()
              return true
            }
            break
          default:
            return true
        }
        return false
      } else if (_.isFunction(self.operations[operation.name])) {
        debug('Attribute ops to run: %j', _.merge(_.clone(operation), _.clone(attr)))
        self.operations[operation.name](_.merge(_.clone(operation), _.clone(attr))) // clone ops and attrs to not rewrite in db
      } else {
        global.log.warning('Operation doesn\'t exist', operation.name)
      }
    })
  })
}
*/
module.exports = Events

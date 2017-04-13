'use strict'

var _ = require('lodash')

function Events () {
  this.events = {
    'user-joined-channel': [], // (username)
    'user-parted-channel': [], // (username)
    'follow': [], // (username)
    'unfollow': [], // (username)
    'subscription': [], // (username), (method)
    'resub': [], // (username), (months), (message)
    'command-send-x-times': [], // needs definition => { definition: true, command: '!smile', tCount: 10, tSent: 0, tTimestamp: 40000, tTriggered: new Date() }
    'number-of-viewers-is-at-least-x': [], // needs definition => { definition: true, viewers: 100, tTriggered: false, tTimestamp: 40000 } (if tTimestamp === 0 run once)
    'stream-started': [],
    'stream-stopped': [],
    'stream-is-running-x-minutes': [], // needs definition = { definition: true, minutes: 100, tTriggered: false }
    'cheer': [], // (username), (bits), (message)
    'clearchat': [],
    'action': [], // (username)
    'ban': [], // (username), (reason)
    'hosting': [], // (target), (viewers)
    'mod': [], // (username)
    'timeout': [] // (username), (reason), (duration)
  }
  this.operations = {
    'send-chat-message': function (attr) {
      if (_.isNil(attr.send)) return
      _.each(attr, function (val, name) {
        attr.send = attr.send.replace('(' + name + ')', val)
      })
      global.commons.sendMessage(attr.send, { username: attr.username })
    },
    'send-whisper': function (attr) {
      if (_.isNil(attr.username) || _.isNil(attr.send)) return
      global.commons.sendMessage(attr.send, { username: attr.username, 'message-type': 'whisper' })
    },
    'run-command': function (attr) {
      if (_.isNil(attr.quiet)) attr.quiet = false
      global.parser.parseCommands((attr.quiet) ? null : { username: attr.username }, attr.command.replace('(username)', attr.username))
    },
    'play-sound': function (attr) {
      // attr.sound can be filename or url
      if (!_.includes(attr.sound, 'http')) {
        attr.sound = 'dist/soundboard/' + attr.sound + '.mp3'
      }
      global.panel.io.emit('play-sound', attr.sound)
    },
    'log': function (attr) {
      let message = attr.message.replace('(username)', attr.username)
      _.each(message.match(/\((\w+)\)/gi), function (match) {
        let value = !_.isNil(attr[match.replace('(', '').replace(')', '')]) ? attr[match.replace('(', '').replace(')', '')] : 'none'
        message = message.replace(match, value)
      })
      global.log[attr.level](message)
    }
  }

  this._update(this)
  this._webpanel(this)
}

Events.prototype.loadSystemEvents = function (self) {
  self.events['timeout'].push([
    { system: true, name: 'log', message: '(username), reason: (reason), duration: (duration)', level: 'timeout' }
  ])
  self.events['follow'].push([
    { system: true, name: 'log', message: '(username)', level: 'follow' }
  ])
  self.events['unfollow'].push([
    { system: true, name: 'log', message: '(username)', level: 'unfollow' }
  ])
  self.events['ban'].push([
    { system: true, name: 'log', message: '(username), reason: (reason)', level: 'ban' }
  ])
}

Events.prototype._webpanel = function (self) {
  global.panel.addMenu({category: 'manage', name: 'event-listeners', id: 'events'})

  global.panel.socketListening(this, 'events.get', this._send)
  global.panel.socketListening(this, 'events.new', this._new)
}

Events.prototype._send = function (self, socket) {
  let events = {}
  _.each(self.events, function (o, n) {
    if (o.length === 0) {
      events[n] = self.events[n]
      return true
    }
    _.each(o, function (v) {
      _.each(v, function (v2) {
        if (!v2.system) events[n] = self.events[n]
      })
    })
  })
  socket.emit('events', { events: events, operations: Object.keys(self.operations) })
}

Events.prototype._new = function (self, socket, data) {
  let event = []
  let operation = {}

  if (data.definition.command || data.definition.count || data.definition.timestamp) {
    let definition = { definition: true }
    if (data.event === 'command-send-x-times') {
      definition.command = data.definition.command
      definition.tCount = data.definition.count
      definition.tTimestamp = data.definition.timestamp
      definition.tTriggered = new Date().getTime()
    }

    if (data.event === 'number-of-viewers-is-at-least-x') {
      definition.viewers = data.definition.count
      definition.tTriggered = data.definition.timestamp === 0 ? false : new Date().getTime()
      definition.tTimestamp = data.definition.timestamp
    }

    if (data.event === 'stream-is-running-x-minutes') {
      definition.tTriggered = false
      definition.minutes = data.count
    }
    event.push(definition)
  }

  _.each(data.operation, function (v, i) {
    if (v.length === 0) return
    operation[i] = v
  })
  event.push(operation)
  self.events[data.event].push(event)
  self._save(self)
  self._send(self, socket)
}

Events.prototype._update = function (self) {
  global.botDB.findOne({ _id: 'Events' }, function (err, item) {
    self.loadSystemEvents(self)
    if (err) return global.log.error(err, { fnc: 'Events.prototype._update' })
    if (_.isNull(item)) return false
    _.each(item.events, function (event, name) {
      self.events[name] = event
    })
  })
}

Events.prototype._save = function (self) {
  let save = {}

  _.each(self.events, function (o, n) {
    _.each(o, function (v) {
      _.each(v, function (v2) {
        if (!v2.system) save[n] = self.events[n]
      })
    })
  })

  var events = {
    events: save
  }
  global.botDB.update({ _id: 'Events' }, { $set: events }, { upsert: true })
}

Events.prototype.fire = function (event, attr) {
  if (_.isNil(this.events[event])) return true

  let operationsBulk = this.events[event]

  var self = this
  _.each(operationsBulk, function (operations) {
    _.each(operations, function (operation) {
      if (operation.definition) {
        switch (event) {
          case 'command-send-x-times':
            if (attr.message.startsWith(operation.command)) {
              operation.tSent += 1
              if (operation.tSent >= operation.tCount && new Date().getTime() - operation.tTriggered >= operation.tTimestamp) {
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
            if (!operation.tTriggered && new Date().getTime() - global.twitch.whenOnline > operation.minutes * 60 * 1000) {
              operation.tTriggered = true
              return true
            }
            break
          case 'number-of-viewers-is-at-least-x':
            if (!_.isNil(attr.reset) && attr.reset) {
              operation.tTriggered = false
              return false
            }

            if (_.isFinite(operation.tTimestamp) && parseInt(operation.tTimestamp, 10) > 0) {
              if (global.twitch.currentViewers <= operation.viewers && new Date().getTime() - operation.tTriggered >= operation.tTimestamp) {
                attr.tTriggered = new Date().getTime()
                return true
              }
            } else if (!operation.tTriggered) { // run only once if tTimestamp === 0
              attr.tTriggered = true
              return true
            }
            break
          default:
            return false
        }
        return false
      } else if (_.isFunction(self.operations[operation.name])) {
        self.operations[operation.name](_.merge(operation, attr))
      } else {
        global.log.warning('Operation doesn\'t exist', operation.name)
      }
    })
  })
}

module.exports = Events

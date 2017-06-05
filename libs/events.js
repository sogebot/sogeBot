'use strict'

var moment = require('moment')
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
    'stream-is-running-x-minutes': [], // needs definition = { definition: true, tCount: 100, tTriggered: false }
    'cheer': [], // (username), (bits), (message)
    'clearchat': [],
    'action': [], // (username)
    'ban': [], // (username), (reason)
    'hosting': [], // (target), (viewers)
    'hosted': [], // (username)
    'mod': [], // (username)
    'timeout': [], // (username), (reason), (duration)
    'every-x-seconds': [] // needs definition = { definition: true, tTrigerred: new Date(), tCount: 60 }
  }
  this.operations = {
    'send-chat-message': function (attr) {
      if (_.isNil(attr.send)) return
      let message = attr.send
      _.each(attr, function (val, name) {
        message = message.replace('(' + name + ')', val)
      })
      global.commons.sendMessage(message, { username: attr.username })
    },
    'send-whisper': function (attr) {
      if (_.isNil(attr.username) || _.isNil(attr.send)) return
      let message = attr.send
      _.each(attr, function (val, name) {
        message = message.replace('(' + name + ')', val)
      })
      global.commons.sendMessage(message, { username: attr.username, 'message-type': 'whisper' })
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
    'emote-explosion': function (attr) {
      // attr.emotes is string with emotes to show
      global.overlays.emotes.explode(global.overlays.emotes, global.panel.io, attr.emotes.split(' '))
    },
    'log': function (attr) {
      let message = attr.message.replace('(username)', attr.username)
      _.each(message.match(/\((\w+)\)/gi), function (match) {
        let value = !_.isNil(attr[match.replace('(', '').replace(')', '')]) ? attr[match.replace('(', '').replace(')', '')] : 'none'
        message = message.replace(match, value)
      })
      global.log[attr.level](message)
    },
    '_function': function (attr) {
      attr.fnc(attr)
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
    { system: true, name: 'log', message: '(username)', level: 'follow' },
    { system: true, name: '_function', fnc: global.overlays.eventlist.add, type: 'follow'}
  ])
  self.events['resub'].push([
    { system: true, name: '_function', fnc: global.overlays.eventlist.add, type: 'resub'}
  ])
  self.events['subscription'].push([
    { system: true, name: '_function', fnc: global.overlays.eventlist.add, type: 'sub'}
  ])
  self.events['unfollow'].push([
    { system: true, name: 'log', message: '(username)', level: 'unfollow' }
  ])
  self.events['ban'].push([
    { system: true, name: 'log', message: '(username), reason: (reason)', level: 'ban' }
  ])
  self.events['hosted'].push([
    { system: true, name: 'log', message: '(username)', level: 'host' },
    { system: true, name: '_function', fnc: global.overlays.eventlist.add, type: 'host'}
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
  attr = attr || {}
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

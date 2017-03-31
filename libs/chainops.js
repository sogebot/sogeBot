'use strict'

var _ = require('lodash')

function ChainOps () {
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
    'clearchat': []
  }
  this.operations = {
    'send-chat-message': function (attr) {
      if (_.isNil(attr.send)) return
      global.commons.sendMessage(attr.send, { username: attr.username })
    },
    'send-whisper': function (attr) {
      if (_.isNil(attr.username) || _.isNil(attr.send)) return
      global.commons.sendMessage(attr.send, { username: attr.username, 'message-type': 'whisper' })
    },
    'run-command': function (attr) {
      if (_.isNil(attr.quiet)) attr.quiet = false
      global.parser.parseCommands((attr.quiet) ? null : { username: attr.username }, attr.command)
    },
    'play-sound': function (attr) {
      // attr.sound can be filename or url
      if (!_.includes(attr.sound, 'http')) {
        attr.sound = 'dist/soundboard/' + attr.sound + '.mp3'
      }
      global.panel.io.emit('play-sound', attr.sound)
    }
  }

  // this._update(this) TODO: uncomment

  this.events['number-of-viewers-is-at-least-x'].push([
    { definition: true, viewers: 100, tTriggered: false, tTimestamp: 40000 },
    { name: 'send-chat-message', send: 'Tady mi nikdo bordel delat nebude!' },
    { name: 'send-whisper', send: 'Lorem ipsum 2' },
    { name: 'run-command', command: '!bet' },
    { name: 'run-command', command: '!songrequest', quiet: true },
    { name: 'play-sound', sound: 'http://localhost:20000/dist/soundboard/Woop.mp3' }
  ])
  this._save(this)
}

ChainOps.prototype._update = function (self) {
  global.botDB.findOne({ _id: 'chainops' }, function (err, item) {
    if (err) return global.log.error(err, { fnc: 'ChainOps.prototype._update' })
    if (_.isNull(item)) return false
    _.each(item.events, function (event, name) {
      self.events[name] = event
    })
  })
}

ChainOps.prototype._save = function (self) {
  var events = {
    events: self.events
  }
  global.botDB.update({ _id: 'chainops' }, { $set: events }, { upsert: true })
}

ChainOps.prototype.fire = function (event, attr) {
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
            if (!_.isNul(attr.reset) && attr.reset) {
              attr.tTriggered = false
              return false
            }
            if (!attr.tTriggered && new Date().getTime() - global.twitch.whenOnline > attr.minutes * 60 * 1000) {
              attr.tTriggered = true
              return true
            }
            break
          case 'number-of-viewers-is-at-least-x':
            //  viewers: 100, tTriggered: false, tTimestamp: 40000 } (if tTimestamp === 0 run once)
            break
          default:
            return false
        }
        return false
      } else if (_.isFunction(self.operations[operation.name])) {
        if (!_.isNil(operation.send)) {
          _.each(attr, function (val, name) {
            operation.send = operation.send.replace('(' + name + ')', val)
          })
        }
        self.operations[operation.name](_.merge(operation, attr))
      } else {
        global.log.error('Operation doesn\'t exist', operation.name)
      }
    })
  })
}

module.exports = ChainOps

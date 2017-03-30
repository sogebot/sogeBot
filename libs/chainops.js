'use strict'

var _ = require('lodash')

function ChainOps () {
  this.events = {
    'user-joined-channel': [],
    'user-parted-channel': [],
    'new-follower': [],
    'new-subscriber': [],
    're-subscriber': [],
    'command-send-x-times': [],
    'number-of-viewers-is-at-least-x': [],
    'number-of-followers-is-x': [],
    'stream-started': [],
    'stream-stopped': [],
    'stream-is-running-x-hours': []
  }
  this.operations = {
    'send-chat-message': function (attr) {
      global.commons.sendMessage(attr.message, { username: attr.username })
    },
    'send-whisper': function (attr) {
      global.commons.sendMessage(attr.message, { username: attr.username, 'message-type': 'whisper' })
    },
    'run-command': function (attr) {
      if (_.isNil(attr.quiet)) attr.quiet = false
      global.parser.parseCommands((attr.quiet) ? null : { username: attr.username }, attr.command)
    },
    'play-sound': function (attr) {
    }
  }

  this._update(this)

  this.events['user-joined-channel'].push([
    { name: 'send-chat-message', message: 'Lorem ipsum' },
    { name: 'send-whisper', message: 'Lorem ipsum 2' },
    { name: 'run-command', command: '!bet' },
    { name: 'run-command', command: '!songrequest', quiet: true }
  ])
  this._save(this)
}

ChainOps.prototype._update = function (self) {
  console.log('TODO: update events one by one, we want to merge it, not rewrite')
  global.botDB.findOne({ _id: 'chainops' }, function (err, item) {
    if (err) return global.log.error(err, { fnc: 'ChainOps.prototype._update' })
    if (_.isNull(item)) return false
  })
}

ChainOps.prototype._save = function (self) {
  var events = {
    events: self.events
  }
  console.log('updating')
  console.log(events)
  global.botDB.update({ _id: 'chainops' }, { $set: events }, { upsert: true })
}

ChainOps.prototype.fire = function (event, attr) {
  if (_.isNil(this.events[event])) return true

  let operationsBulk = this.events[event]

  var self = this
  _.each(operationsBulk, function (operations) {
    _.each(operations, function (operation) {
      let op = operation.name
      delete operation.name
      self.operations[op](_.merge(operation, attr))
    })
  })
}

module.exports = ChainOps

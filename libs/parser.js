'use strict'

var constants = require('./constants')
var crypto = require('crypto')

var queue = {}

function Parser () {
  this.registeredCmds = {}
  this.permissionsCmds = {}
  this.registeredParsers = {}
  this.permissionsParsers = {}
  this.linesParsed = 0

  // check queue and then parseCommands\
  var self = this
  setInterval(function () {
    for (var id in queue) {
      if (queue.hasOwnProperty(id) && queue[id].success === queue[id].started) {
        self.parseCommands(queue[id].user, queue[id].message)
        global.removeFromQueue(id)
      }
    }
  }, 500)
}

Parser.prototype.parse = function (user, message) {
  this.linesParsed++

  // if we dont have registeredParsers, just parseCommands
  (
  this.registeredParsers === {} ? this.parseCommands(user, message) : this.addToQueue(user, message))
}

Parser.prototype.addToQueue = function (user, message) {
  var id = crypto.createHash('md5').update(user + message).digest('hex')

  var data = {
    started: 0,
    success: 0,
    user: user,
    message: message
  }
  queue[id] = data
  for (var parser in this.registeredParsers) {
    if (this.permissionsParsers[parser] === constants.VIEWERS || this.permissionsParsers[parser] === constants.OWNER_ONLY && this.isOwner(user) && typeof queue[id] !== 'undefined') {
      this.registeredParsers[parser](id, user, message)
      queue[id].started = parseInt(queue[id].started, 10) + 1
    }
  }
}

Parser.prototype.parseCommands = function (user, message) {
  for (var cmd in this.registeredCmds) {
    if (message.startsWith(cmd)) {
      if (this.permissionsCmds[cmd] === constants.VIEWERS || this.permissionsCmds[cmd] === constants.OWNER_ONLY && this.isOwner(user)) {
        var text = message.replace(cmd, '')
        this.registeredCmds[cmd](user, text.trim(), message)
        break // cmd is executed
      }
    }
  }
}

Parser.prototype.register = function (cmd, fnc, permission) {
  this.registeredCmds[cmd] = fnc
  this.permissionsCmds[cmd] = permission
}

Parser.prototype.registerParser = function (parser, fnc, permission) {
  this.registeredParsers[parser] = fnc
  this.permissionsParsers[parser] = permission
}

Parser.prototype.unregister = function (cmd) {
  delete this.registeredCmds[cmd]
  delete this.permissionsCmds[cmd]
}

Parser.prototype.isOwner = function (user) {
  return global.configuration.get().twitch.owner.toLowerCase() === user.username.toLowerCase()
}

// these needs to be global, will be called from called parsers
global.updateQueue = function (id, success) {
  if (success) {
    queue[id].success = parseInt(queue[id].success, 10) + 1
  } else {
    global.removeFromQueue(id)
  }
}

global.removeFromQueue = function (id) {
  delete queue[id]
}

module.exports = Parser

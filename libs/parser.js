'use strict'

var constants = require('./constants')
var crypto = require('crypto')

var queue = {}

function Parser () {
  this.registeredCmds = {}
  this.permissionsCmds = {}
  this.selfCmds = {}
  this.registeredParsers = {}
  this.permissionsParsers = {}
  this.selfParsers = {}
  this.linesParsed = 0

  // check queue and then parseCommands\
  var self = this
  setInterval(function () {
    for (var id in queue) {
      if (queue.hasOwnProperty(id) && queue[id].success === queue[id].started) {
        self.parseCommands(queue[id].user, queue[id].message)
        global.removeFromQueue(id)
        break
      }
    }
  }, 200)
}

Parser.prototype.parse = function (user, message) {
  this.linesParsed++
  // if we dont have registeredParsers, just parseCommands
  this.registeredParsers === {} ? this.parseCommands(user, message) : this.addToQueue(user, message)
}

Parser.prototype.addToQueue = function (user, message) {
  var id = crypto.createHash('md5').update(Math.random().toString()).digest('hex')

  var data = {
    started: 0,
    success: 0,
    user: user,
    message: message
  }
  queue[id] = data
  for (var parser in this.registeredParsers) {
    if (typeof queue[id] === 'undefined') break
    if (this.permissionsParsers[parser] === constants.VIEWERS || this.permissionsParsers[parser] === constants.OWNER_ONLY && this.isOwner(user)) {
      queue[id].started = parseInt(queue[id].started, 10) + 1
      this.registeredParsers[parser](this.selfParsers[parser], id, user, message)
    }
  }
}

Parser.prototype.parseCommands = function (user, message) {
  message = message.trim()
  for (var cmd in this.registeredCmds) {
    if (message.startsWith(cmd)) {
      if (this.permissionsCmds[cmd] === constants.VIEWERS || this.permissionsCmds[cmd] === constants.OWNER_ONLY && this.isOwner(user)) {
        var text = message.replace(cmd, '')
        this.registeredCmds[cmd](this.selfCmds[cmd], user, text.trim(), message)
        break // cmd is executed
      }
    }
  }
}

Parser.prototype.register = function (self, cmd, fnc, permission) {
  this.registeredCmds[cmd] = fnc
  this.permissionsCmds[cmd] = permission
  this.selfCmds[cmd] = self
}

Parser.prototype.registerParser = function (self, parser, fnc, permission) {
  this.registeredParsers[parser] = fnc
  this.permissionsParsers[parser] = permission
  this.selfParsers[parser] = self
}

Parser.prototype.unregister = function (cmd) {
  delete this.registeredCmds[cmd]
  delete this.permissionsCmds[cmd]
  delete this.selfCmds[cmd]
}

Parser.prototype.isOwner = function (user) {
  return global.configuration.get().twitch.owner.toLowerCase() === user.username.toLowerCase()
}

// these needs to be global, will be called from called parsers
global.updateQueue = function (id, success) {
  if (success && typeof queue[id] !== 'undefined') {
    queue[id].success = parseInt(queue[id].success, 10) + 1
  } else {
    global.removeFromQueue(id)
  }
}

global.removeFromQueue = function (id) {
  delete queue[id]
}

module.exports = Parser

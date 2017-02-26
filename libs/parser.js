'use strict'

var constants = require('./constants')
var crypto = require('crypto')
var _ = require('lodash')

var queue = {}

function Parser () {
  this.registeredHelpers = []
  this.registeredCmds = {}
  this.permissionsCmds = {}
  this.selfCmds = {}
  this.registeredParsers = {}
  this.permissionsParsers = {}
  this.selfParsers = {}
  this.linesParsed = 0

  // check queue and then parseCommands
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

  for (var parser in _(this.registeredParsers).toPairs().sortBy(0).fromPairs().value()) {
    if (typeof queue[id] === 'undefined') break
    if (this.permissionsParsers[parser] === constants.VIEWERS ||
        (this.permissionsParsers[parser] === constants.OWNER_ONLY && this.isOwner(user)) ||
        (this.permissionsParsers[parser] === constants.MODS && user.mod)) {
      queue[id].started = parseInt(queue[id].started, 10) + 1
      this.registeredParsers[parser](this.selfParsers[parser], id, user, message)
    }
  }
}

Parser.prototype.parseCommands = function (user, message) {
  message = message.trim()
  for (var cmd in this.registeredCmds) {
    if (message.startsWith(cmd)) {
      if (this.permissionsCmds[cmd] === constants.DISABLE) break
      if (this.permissionsCmds[cmd] === constants.VIEWERS ||
        (this.permissionsCmds[cmd] === constants.OWNER_ONLY && this.isOwner(user)) ||
        (this.permissionsCmds[cmd] === constants.MODS && user.mod || this.isOwner(user))) {
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

Parser.prototype.registerHelper = function (cmd) {
  this.registeredHelpers.push(cmd)
}

Parser.prototype.unregister = function (cmd) {
  delete this.registeredCmds[cmd]
  delete this.permissionsCmds[cmd]
  delete this.selfCmds[cmd]
}

Parser.prototype.isOwner = function (user) {
  try {
    return global.configuration.get().twitch.owner.toLowerCase() === user.username.toLowerCase()
  } catch (e) {
    return true // we can expect, if user is null -> bot or admin
  }
}

Parser.prototype.parseMessage = async function (message) {
  let random = {
    '(random.online.viewer)': async function () {
      let onlineViewers = await global.asyncBotDB.find({
        $where: function () {
          return this._id.startsWith('user_') && this.isOnline && this.username.toLowerCase() !== global.configuration.get().twitch.username
        }
      })
      if (onlineViewers.length === 0) return 'unknown'
      return onlineViewers[_.random(0, onlineViewers.length-1)].username
    },
    '(random.online.follower)': async function () {
      let onlineFollower = await global.asyncBotDB.find({
        $where: function () {
          return this._id.startsWith('user_') && this.isOnline && (!_.isUndefined(this.isFollower) && this.isFollower) && this.username.toLowerCase() !== global.configuration.get().twitch.username
        }
      })
      if (onlineFollower.length === 0) return 'unknown'
      return onlineFollower[_.random(0, onlineFollower.length-1)].username
    },
    '(random.viewer)': async function () {
      let viewer = await global.asyncBotDB.find({
        $where: function () {
          return this._id.startsWith('user_') && this.username.toLowerCase() !== global.configuration.get().twitch.username
        }
      })
      if (viewer.length === 0) return 'unknown'
      return viewer[_.random(0, viewer.length-1)].username
    },
    '(random.follower)': async function () {
      let follower = await global.asyncBotDB.find({
        $where: function () {
          return this._id.startsWith('user_') && (!_.isUndefined(this.isFollower) && this.isFollower) && this.username.toLowerCase() !== global.configuration.get().twitch.username
        }
      })
      if (follower.length === 0) return 'unknown'
      return follower[_.random(0, follower.length-1)].username
    },
    '(random.number-#-to-#)':  async function (filter) {
      let numbers = filter.replace('(random.number-', '')
        .replace(')', '')
        .split('-to-')
      try {
        return _.random(numbers[0],  numbers[1])
      } catch (e) {
        return 0
      }
    },
    '(random.true-or-false)': async function () {
      return Math.random() < 0.5 ? true : false
    }
  }

  return await this.parseMessageEach(random, message)
}

Parser.prototype.parseMessageEach = async function (filters, msg) {
  for (var key in filters) {
    if (!filters.hasOwnProperty(key)) continue;

    let fnc = filters[key]
    let regexp = _.escapeRegExp(key)

    // we want to handle # as \d - number in regexp
    regexp = regexp.replace(/#/g, '(\\d+)')
    let rMessage = msg.match((new RegExp('(' + regexp + ')', 'g')))
    if (!_.isNull(rMessage)) {
      for (var bkey in rMessage) {
        let newString = await fnc(rMessage[bkey])
        msg = msg.replace(rMessage[bkey], newString)
      }
    }
  }
  return msg
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

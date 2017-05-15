'use strict'

var _ = require('lodash')
var chalk = require('chalk')
var log = global.log

function Commons () {
  global.configuration.register('atUsername', 'core.settings.atUsername', 'bool', true)
}

Commons.prototype.isSystemEnabled = function (fn) {
  var name = (typeof fn === 'object') ? fn.constructor.name : fn
  var enabled = global.configuration.get().systems[name.toLowerCase()]
  if (typeof fn === 'object') global.log.info(name + ' system ' + global.translate('core.loaded') + ' ' + (enabled ? chalk.green(global.translate('core.enabled')) : chalk.red(global.translate('core.disabled'))))
  return enabled
}

Commons.prototype.insertIfNotExists = function (data) {
  var callbacks = this.getCallbacks(data)
  var toInsert = this.stripUnderscores(data)
  var self = this

  global.botDB.insert(toInsert, function (err, newItem) {
    if (err) self.runCallback(callbacks.error, data)
    else self.runCallback(callbacks.success, data)
  })
}

Commons.prototype.updateOrInsert = function (data) {
  var callbacks = this.getCallbacks(data)
  var toFind = this.getObjectToFind(data)
  var toUpdate = this.getObjectToUpdate(data)
  var toInsert = this.stripUnderscores(data)
  var self = this
  global.botDB.update(toFind, {$set: toUpdate}, {}, function (err, numReplaced) {
    if (err) log.error(err, { fnc: 'Commons.prototype.updateOrInsert' })
    if (numReplaced === 0) global.botDB.insert(toInsert)
    self.runCallback(callbacks.success, data)
  })
}

Commons.prototype.remove = function (data) {
  var callbacks = this.getCallbacks(data)
  var toRemove = this.getObjectToFind(data)
  var self = this
  global.botDB.remove(toRemove, {}, function (err, numRemoved) {
    if (err) { log.error(err, { fnc: 'Commons.prototype.remove' }) }
    numRemoved === 0 ? self.runCallback(callbacks.error, data) : self.runCallback(callbacks.success, data)
  })
}

Commons.prototype.getObjectToFind = function (data) {
  var Object = {}
  for (var index in data) {
    if (data.hasOwnProperty(index) && index.startsWith('_')) {
      Object[index] = data[index]
    }
  }
  return this.stripUnderscores(Object)
}

Commons.prototype.getObjectToUpdate = function (data) {
  var Object = {}
  for (var index in data) {
    if (data.hasOwnProperty(index) && !index.startsWith('_') && !(index === 'success' || index === 'error')) {
      Object[index] = data[index]
    }
  }
  return Object
}

Commons.prototype.stripUnderscores = function (data) {
  var Object = {}
  for (var index in data) {
    if (data.hasOwnProperty(index) && !(index === 'success' || index === 'error')) {
      var i = (index.startsWith('_') ? index.slice(1) : index)
      Object[i] = data[index]
    }
  }
  return Object
}

Commons.prototype.getCallbacks = function (data) {
  var Callbacks = {}
  for (var index in data) {
    if (data.hasOwnProperty(index) && (index === 'success' || index === 'error')) {
      Callbacks[index] = data[index]
    }
  }
  return Callbacks
}

Commons.prototype.runCallback = function (cb, data) {
  var value = this.stripUnderscores(data)
  delete value.type
  if (_.isUndefined(cb)) return
  if (data._type === 'settings') {
    typeof cb === 'function' ? cb(data) : this.sendToOwners(global.translate(cb).replace('(value)', value[Object.keys(value)[0]]))
  } else {
    typeof cb === 'function' ? cb(data) : this.sendMessage(global.translate(cb).replace('(value)', value[Object.keys(value)[0]]), {username: global.configuration.get().twitch.channel}, data)
  }
}

Commons.prototype.sendToOwners = function (text) {
  for (let owner of global.parser.getOwners()) {
    owner = {
      username: owner,
      'message-type': 'whisper'
    }
    global.commons.sendMessage(text, owner)
  }
}

Commons.prototype.sendMessage = async function (message, sender, attr = {}) {
  attr.sender = sender
  message = await global.parser.parseMessage(message, attr)
  if (message === '') return false // if message is empty, don't send anything
  if (global.configuration.get().bot.debug) {
    if (_.isUndefined(sender) || _.isNull(sender)) sender = { username: null }
    let username = (global.configuration.getValue('atUsername') ? '@' : '') + sender.username
    message = !_.isUndefined(sender) && !_.isUndefined(sender.username) ? message.replace('(sender)', username) : message
    if ((_.isUndefined(sender) || _.isNull(sender) || (!_.isUndefined(sender) && sender.username === global.configuration.get().twitch.username))) message = '! ' + message
    sender['message-type'] === 'whisper' ? global.log.whisperOut(message, {username: sender.username}) : global.log.chatOut(message, {username: sender.username})
    return true
  }
  // if sender is null/undefined, we can assume, that username is from dashboard -> bot
  if (_.isUndefined(sender) || _.isNull(sender) || (!_.isUndefined(sender) && sender.username === global.configuration.get().twitch.username && !attr.force)) return false // we don't want to reply on bot commands
  message = !_.isUndefined(sender) && !_.isUndefined(sender.username) ? message.replace('(sender)', (global.configuration.getValue('atUsername') ? '@' : '') + sender.username) : message
  if (!global.configuration.getValue('mute') || attr.force) {
    message = message.charAt(0).toUpperCase() + message.slice(1)
    sender['message-type'] === 'whisper' ? global.log.whisperOut(message, {username: sender.username}) : global.log.chatOut(message, {username: sender.username})
    sender['message-type'] === 'whisper' ? global.client.whisper(sender.username, message) : global.client.say(global.configuration.get().twitch.channel, message)
  }
  return true
}

Commons.prototype.timeout = function (username, reason, timeout) {
  if (global.configuration.getValue('moderationAnnounceTimeouts')) {
    global.commons.sendMessage('(sender), ' + reason[0].toLowerCase() + reason.substring(1), { username: username })
    global.client.timeout(global.configuration.get().twitch.channel, username, timeout)
  } else {
    global.client.timeout(global.configuration.get().twitch.channel, username, timeout, reason)
  }
}

module.exports = Commons

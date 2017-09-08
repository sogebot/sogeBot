'use strict'

var _ = require('lodash')
var chalk = require('chalk')
var log = global.log

const config = require('../config.json')

function Commons () {
  global.configuration.register('atUsername', 'core.settings.atUsername', 'bool', true)
}

Commons.prototype.isSystemEnabled = function (fn) {
  var name = (typeof fn === 'object') ? fn.constructor.name : fn
  var enabled = !_.isNil(config.systems) && !_.isNil(config.systems[name.toLowerCase()]) ? (_.isBoolean(config.systems[name.toLowerCase()] ? config.systems[name.toLowerCase()] : config.systems[name.toLowerCase()].enabled)) : false
  if (typeof fn === 'object') global.log.info(name + ' system ' + global.translate('core.loaded') + ' ' + (enabled ? chalk.green(global.translate('core.enabled')) : chalk.red(global.translate('core.disabled'))))
  return enabled
}

Commons.prototype.isIntegrationEnabled = function (fn) {
  var name = (typeof fn === 'object') ? fn.constructor.name : fn
  var enabled = !_.isNil(config.integrations) && !_.isNil(config.integrations[name.toLowerCase()]) ? (_.isBoolean(config.integrations[name.toLowerCase()] ? config.integrations[name.toLowerCase()] : config.integrations[name.toLowerCase()].enabled)) : false
  if (typeof fn === 'object') global.log.info(name + ' integration ' + global.translate('core.loaded') + ' ' + (enabled ? chalk.green(global.translate('core.enabled')) : chalk.red(global.translate('core.disabled'))))
  return enabled
}

Commons.prototype.insertIfNotExists = function (data) {
  global.log.warn('commons insertIfNotExists is deprecated', new Error().stack)
  var callbacks = this.getCallbacks(data)
  var toInsert = this.stripUnderscores(data)
  var self = this

  global.botDB.insert(toInsert, function (err, newItem) {
    if (err) self.runCallback(callbacks.error, data)
    else self.runCallback(callbacks.success, data)
  })
}

Commons.prototype.updateOrInsert = function (data) {
  global.log.warn('commons updateOrInsert is deprecated', new Error().stack)
  var callbacks = this.getCallbacks(data)
  var toFind = this.getObjectToFind(data)
  var toInsert = this.stripUnderscores(data)
  var self = this
  global.botDB.remove(toFind, { multi: true })
  global.botDB.insert(toInsert)
  self.runCallback(callbacks.success, data)
}

Commons.prototype.remove = function (data) {
  global.log.warn('commons remove is deprecated', new Error().stack)
  var callbacks = this.getCallbacks(data)
  var toRemove = this.getObjectToFind(data)
  var self = this
  global.botDB.remove(toRemove, {}, function (err, numRemoved) {
    if (err) { log.error(err, { fnc: 'Commons.prototype.remove' }) }
    numRemoved === 0 ? self.runCallback(callbacks.error, data) : self.runCallback(callbacks.success, data)
  })
}

Commons.prototype.getObjectToFind = function (data) {
  global.log.warn('commons getObjectToFind is deprecated', new Error().stack)
  var Object = {}
  for (var index in data) {
    if (data.hasOwnProperty(index) && index.startsWith('_') && index !== '_quiet') {
      Object[index] = data[index]
    }
  }
  return this.stripUnderscores(Object)
}

Commons.prototype.stripUnderscores = function (data) {
  global.log.warn('commons stripUnderscores is deprecated', new Error().stack)
  var Object = {}
  for (var index in data) {
    if (data.hasOwnProperty(index) && !(index === 'success' || index === 'error' || index === '_quiet')) {
      var i = (index.startsWith('_') ? index.slice(1) : index)
      Object[i] = data[index]
    }
  }
  return Object
}

Commons.prototype.getCallbacks = function (data) {
  global.log.warn('commons getCallbacks is deprecated', new Error().stack)
  var Callbacks = {}
  for (var index in data) {
    if (data.hasOwnProperty(index) && (index === 'success' || index === 'error')) {
      Callbacks[index] = data[index]
    }
  }
  return Callbacks
}

Commons.prototype.runCallback = function (cb, data) {
  global.log.warn('commons runCallback is deprecated', new Error().stack)
  var value = this.stripUnderscores(data)
  delete value.type
  if (_.isUndefined(cb)) return
  if (data._type === 'settings') {
    if (typeof cb === 'function') cb(data)
    else if (!data._quiet) {
      this.sendToOwners(global.translate(cb).replace(/\$value/g, value[Object.keys(value)[0]]))
    }
  } else {
    typeof cb === 'function' ? cb(data) : this.sendMessage(global.translate(cb).replace(/\$value/g, value[Object.keys(value)[0]]), {username: config.twitch.channel}, data)
  }
}

Commons.prototype.sendToOwners = function (text) {
  if (global.configuration.getValue('disableSettingsWhispers')) return
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
  if (config.debug.all || config.debug.console) {
    if (_.isUndefined(sender) || _.isNull(sender)) sender = { username: null }
    let username = (global.configuration.getValue('atUsername') ? '@' : '') + sender.username
    message = !_.isUndefined(sender) && !_.isUndefined(sender.username) ? message.replace(/\$sender/g, username) : message
    if ((_.isUndefined(sender) || _.isNull(sender) || (!_.isUndefined(sender) && sender.username === config.settings.bot_username))) message = '! ' + message
    sender['message-type'] === 'whisper' ? global.log.whisperOut(message, {username: sender.username}) : global.log.chatOut(message, {username: sender.username})
    return true
  }
  // if sender is null/undefined, we can assume, that username is from dashboard -> bot
  if (_.isUndefined(sender) || _.isNull(sender) || (!_.isUndefined(sender) && sender.username === config.twitch.username && !attr.force)) return false // we don't want to reply on bot commands
  message = !_.isUndefined(sender) && !_.isUndefined(sender.username) ? message.replace(/\$sender/g, (global.configuration.getValue('atUsername') ? '@' : '') + sender.username) : message

  // global variables
  message = message.replace(/\$game/g, global.twitch.current.game)
    .replace(/\$title/g, global.twitch.current.status)
    .replace(/\$viewers/g, global.twitch.current.viewers)
    .replace(/\$views/g, global.twitch.current.views)
    .replace(/\$followers/g, global.twitch.current.followers)
    .replace(/\$hosts/g, global.twitch.current.hosts)
    .replace(/\$subscribers/g, global.twitch.current.subscribers)
    .replace(/\$bits/g, global.twitch.current.bits)

  if (!global.configuration.getValue('mute') || attr.force) {
    sender['message-type'] === 'whisper' ? global.log.whisperOut(message, {username: sender.username}) : global.log.chatOut(message, {username: sender.username})
    sender['message-type'] === 'whisper' ? global.client.whisper(sender.username, message) : global.client.say(config.twitch.channel, message)
  }
  return true
}

Commons.prototype.timeout = function (username, reason, timeout) {
  if (global.configuration.getValue('moderationAnnounceTimeouts')) {
    global.commons.sendMessage('$sender, ' + reason[0].toLowerCase() + reason.substring(1), { username: username })
    global.client.timeout(config.twitch.channel, username, timeout)
  } else {
    global.client.timeout(config.twitch.channel, username, timeout, reason)
  }
}

module.exports = Commons

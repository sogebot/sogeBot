'use strict'

var _ = require('lodash')
var chalk = require('chalk')
const debug = require('debug')('commons')

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
  const name = (typeof fn === 'object') ? fn.constructor.name : fn
  let enabled = false

  let isExists = !_.isNil(config.integrations) && !_.isNil(config.integrations[name.toLowerCase()])
  debug('Checking integration %s is enabled', name)
  debug('Exist in config.json', isExists)

  if (isExists) {
    let isBool = _.isBoolean(config.integrations[name.toLowerCase()])
    debug('Is directly a bool', isBool)
    if (!isBool) {
      let isEnabled = config.integrations[name.toLowerCase()].enabled
      debug('integration enabled attribute', isEnabled)
      enabled = isEnabled
    } else enabled = config.integrations[name.toLowerCase()]
  }
  if (typeof fn === 'object') global.log.info(name + ' integration ' + global.translate('core.loaded') + ' ' + (enabled ? chalk.green(global.translate('core.enabled')) : chalk.red(global.translate('core.disabled'))))
  return enabled
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

Commons.prototype.prepare = function (translate, attr) {
  attr = attr || {}
  let msg = global.translate(translate)
  for (let [key, value] of Object.entries(attr)) {
    if (_.includes(['username', 'who', 'winner'], key)) value = global.configuration.getValue('atUsername') ? `@${value}` : value
    msg = msg.replace(new RegExp('[$]' + key, 'g'), value)
  }
  return msg
}

Commons.prototype.sendMessage = async function (message, sender, attr) {
  debug('sendMessage(%s, %j, %j)', message, sender, attr)
  attr = attr || {}
  sender = sender || {}

  if (_.isString(sender)) sender = { username: sender }
  if (_.isNil(sender) || _.isNil(sender.username)) sender.username = undefined
  attr.sender = sender.username
  message = await global.parser.parseMessage(message, attr)
  if (message === '') return false // if message is empty, don't send anything
  if (config.debug.all || config.debug.console) {
    if (_.isUndefined(sender) || _.isNull(sender)) sender = { username: undefined }
    let username = (global.configuration.getValue('atUsername') ? '@' : '') + sender.username
    message = !_.isUndefined(sender) && !_.isUndefined(sender.username) ? message.replace(/\$sender/g, username) : message
    if ((_.isUndefined(sender) || _.isNull(sender) || (!_.isUndefined(sender) && sender.username === config.settings.bot_username))) message = '! ' + message
    sender['message-type'] === 'whisper' ? global.log.whisperOut(message, {username: sender.username}) : global.log.chatOut(message, {username: sender.username})
    return true
  }
  // if sender is null/undefined, we can assume, that username is from dashboard -> bot
  if (_.get(sender, 'username', config.settings.bot_username) === config.settings.bot_username && !attr.force) return false // we don't want to reply on bot commands
  message = !_.isUndefined(sender) && !_.isUndefined(sender.username) ? message.replace(/\$sender/g, (global.configuration.getValue('atUsername') ? '@' : '') + sender.username) : message

  if (!global.configuration.getValue('mute') || attr.force) {
    if (sender['message-type'] === 'whisper') {
      global.log.whisperOut(message, {username: sender.username})
      global.client.whisper(sender.username, message)
    } else {
      global.log.chatOut(message, {username: sender.username})

      if (global.configuration.getValue('sendWithMe')) global.client.action(config.settings.broadcaster_username, message)
      else global.client.say(config.settings.broadcaster_username, message)
    }
  }
  return true
}

Commons.prototype.timeout = function (username, reason, timeout, silent) {
  if (global.configuration.getValue('moderationAnnounceTimeouts')) {
    if (!silent) global.commons.sendMessage('$sender, ' + reason[0].toLowerCase() + reason.substring(1), { username: username })
    global.client.timeout(config.settings.broadcaster_username, username, timeout, reason)
  } else {
    global.client.timeout(config.settings.broadcaster_username, username, timeout, reason)
  }
}

module.exports = Commons

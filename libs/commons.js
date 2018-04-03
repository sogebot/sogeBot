'use strict'

var _ = require('lodash')
var chalk = require('chalk')
const debug = require('debug')
const moment = require('moment')

const config = require('../config.json')

const cluster = require('cluster')
const Message = require('./message')

function Commons () {
  this.registerConfiguration()
}

Commons.prototype.registerConfiguration = function () {
  if (_.isNil(global.configuration)) return setTimeout(() => this.registerConfiguration(), 1)

  global.configuration.register('atUsername', 'core.settings.atUsername', 'bool', true)
  global.configuration.register('sendWithMe', 'core.settings.sendWithMe', 'bool', false)
}

Commons.prototype.isIgnored = async function (sender) {
  let ignoredUser = await global.db.engine.findOne('users_ignorelist', { username: _.get(sender, 'username', '') })
  return !_.isEmpty(ignoredUser) && _.get(sender, 'username', '') !== config.settings.broadcaster_username
}

Commons.prototype.isSystemEnabled = function (fn) {
  var name = (typeof fn === 'object') ? fn.constructor.name : fn
  var enabled = !_.isNil(config.systems) && !_.isNil(config.systems[name.toLowerCase()]) ? (_.isBoolean(config.systems[name.toLowerCase()] ? config.systems[name.toLowerCase()] : config.systems[name.toLowerCase()].enabled)) : false
  if (typeof fn === 'object' && cluster.isMaster) global.log.info(name + ' system ' + global.translate('core.loaded') + ' ' + (enabled ? chalk.green(global.translate('core.enabled')) : chalk.red(global.translate('core.disabled'))))
  return enabled
}
Commons.prototype.isIntegrationEnabled = function (fn) {
  const d = debug('commons:isIntegrationEnabled')
  const name = (typeof fn === 'object') ? fn.constructor.name : fn
  let enabled = false

  let isExists = !_.isNil(config.integrations) && !_.isNil(config.integrations[name.toLowerCase()])
  d('Checking integration %s is enabled', name)
  d('Exist in config.json', isExists)

  if (isExists) {
    let isBool = _.isBoolean(config.integrations[name.toLowerCase()])
    d('Is directly a bool', isBool)
    if (!isBool) {
      let isEnabled = config.integrations[name.toLowerCase()].enabled
      d('integration enabled attribute', isEnabled)
      enabled = isEnabled
    } else enabled = config.integrations[name.toLowerCase()]
  }
  if (typeof fn === 'object') global.log.info(name + ' integration ' + global.translate('core.loaded') + ' ' + (enabled ? chalk.green(global.translate('core.enabled')) : chalk.red(global.translate('core.disabled'))))
  return enabled
}

Commons.prototype.sendToOwners = function (text) {
  if (global.configuration.getValue('disableSettingsWhispers')) return global.log.warning(text)
  for (let owner of global.commons.getOwners()) {
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
    if (_.includes(['username', 'who', 'winner', 'sender'], key)) value = global.configuration.getValue('atUsername') ? `@${value}` : value
    msg = msg.replace(new RegExp('[$]' + key, 'g'), value)
  }
  return msg
}

Commons.prototype.getTime = function (time, isChat) {
  var now, days, hours, minutes, seconds
  now = _.isNull(time) || !time ? {days: 0, hours: 0, minutes: 0, seconds: 0} : moment().preciseDiff(time, true)
  if (isChat) {
    days = now.days > 0 ? now.days : ''
    hours = now.hours > 0 ? now.hours : ''
    minutes = now.minutes > 0 ? now.minutes : ''
    seconds = now.seconds > 0 ? now.seconds : ''
    return { days: days,
      hours: hours,
      minutes: minutes,
      seconds: seconds }
  } else {
    days = now.days > 0 ? now.days + 'd' : ''
    hours = now.hours >= 0 && now.hours < 10 ? '0' + now.hours + ':' : now.hours + ':'
    minutes = now.minutes >= 0 && now.minutes < 10 ? '0' + now.minutes + ':' : now.minutes + ':'
    seconds = now.seconds >= 0 && now.seconds < 10 ? '0' + now.seconds : now.seconds
    return days + hours + minutes + seconds
  }
}

Commons.prototype.sendMessage = async function (message, sender, attr) {
  if (cluster.isMaster && (_.isNil(global.client) || global.client.readyState() !== 'OPEN')) return setTimeout(() => this.sendMessage(message, sender, attr), 10) // wait for proper connection
  debug('commons:sendMessage')('sendMessage(%s, %j, %j)', message, sender, attr)
  attr = attr || {}
  sender = sender || {}

  if (_.isString(sender)) sender = { username: sender }
  if (_.isNil(sender) || _.isNil(sender.username)) sender.username = undefined
  if (!_.isNil(sender.quiet)) attr.quiet = sender.quiet
  attr.sender = sender.username

  message = await new Message(message).parse(attr)
  if (message === '') return false // if message is empty, don't send anything

  // if sender is null/undefined, we can assume, that username is from dashboard -> bot
  if (_.get(sender, 'username', config.settings.bot_username) === config.settings.bot_username && !attr.force) return false // we don't want to reply on bot commands
  message = !_.isUndefined(sender) && !_.isUndefined(sender.username) ? message.replace(/\$sender/g, (global.configuration.getValue('atUsername') ? '@' : '') + sender.username) : message
  if (!(await global.configuration.getValue('mute')) || attr.force) {
    if ((!_.isNil(attr.quiet) && attr.quiet)) return true
    if (sender['message-type'] === 'whisper') {
      global.log.whisperOut(message, {username: sender.username})
      if (cluster.isWorker) process.send({type: 'whisper', sender: sender.username, message: message})
      else global.client.whisper(sender.username, message)
    } else {
      global.log.chatOut(message, {username: sender.username})
      if (await global.configuration.getValue('sendWithMe')) {
        if (cluster.isWorker) process.send({type: 'action', sender: sender.username, message: message})
        else global.client.action(config.settings.broadcaster_username, message)
      } else {
        if (cluster.isWorker) process.send({type: 'say', sender: sender.username, message: message})
        else global.client.say(config.settings.broadcaster_username, message)
      }
    }
  }
  return true
}

Commons.prototype.timeout = function (username, reason, timeout, silent) {
  if (global.configuration.getValue('moderationAnnounceTimeouts')) {
    if (!silent) process.send({type: 'say', sender: username, message: '$sender, ' + reason[0].toLowerCase() + reason.substring(1)})
    process.send({type: 'timeout', username: username, timeout: timeout, reason: reason})
  } else {
    process.send({type: 'timeout', username: username, timeout: timeout, reason: reason})
  }
}

Commons.prototype.getOwner = function () {
  return config.settings.bot_owners.split(',')[0].trim()
}

Commons.prototype.getOwners = function () {
  return config.settings.bot_owners.split(',')
}

Commons.prototype.isBroadcaster = function (user) {
  if (_.isString(user)) user = { username: user }
  return config.settings.broadcaster_username.toLowerCase().trim() === user.username.toLowerCase().trim()
}

Commons.prototype.isMod = async function (user) {
  if (_.isNil(user)) return false

  if (_.isString(user)) user = await global.users.get(user)
  else user = { is: { mod: user.mod } }

  return new Promise((resolve, reject) => {
    resolve(!_.isNil(user.is.mod) ? user.is.mod : false)
  })
}

Commons.prototype.isRegular = async function (user) {
  if (_.isNil(user)) return false

  global.db.engine.find('users', { username: _.isString(user) ? user : user.username })
  return _.get(user, 'is.regular', false)
}

Commons.prototype.isBot = function (user) {
  const d = debug('commons:isBot')
  d('isBot(%j)', user)
  try {
    if (_.isString(user)) user = { username: user }
    return config.settings.bot_username.toLowerCase().trim() === user.username.toLowerCase().trim()
  } catch (e) {
    d(e)
    return true // we can expect, if user is null -> bot or admin
  }
}

Commons.prototype.isOwner = function (user) {
  const d = debug('commons:isOwner')
  d('isOwner(%j)', user)
  try {
    if (_.isString(user)) user = { username: user }
    let owners = _.map(_.filter(config.settings.bot_owners.split(','), _.isString), function (owner) {
      return _.trim(owner.toLowerCase())
    })
    d('owners: %j', owners)
    return _.includes(owners, user.username.toLowerCase().trim())
  } catch (e) {
    d(e)
    return true // we can expect, if user is null -> bot or admin
  }
}

Commons.prototype.getLocalizedName = function (number, translation) {
  let single, multi, xmulti, name
  let names = global.translate(translation).split('|').map(Function.prototype.call, String.prototype.trim)
  number = parseInt(number, 10)

  switch (names.length) {
    case 1:
      xmulti = null
      single = multi = names[0]
      break
    case 2:
      single = names[0]
      multi = names[1]
      xmulti = null
      break
    default:
      var len = names.length
      single = names[0]
      multi = names[len - 1]
      xmulti = {}

      for (var pattern in names) {
        pattern = parseInt(pattern, 10)
        if (names.hasOwnProperty(pattern) && pattern !== 0 && pattern !== len - 1) {
          var maxPts = names[pattern].split(':')[0]
          xmulti[maxPts] = names[pattern].split(':')[1]
        }
      }
      break
  }

  name = (number === 1 ? single : multi)
  if (!_.isNull(xmulti) && _.isObject(xmulti) && number > 1 && number <= 10) {
    for (var i = number; i <= 10; i++) {
      if (typeof xmulti[i] === 'string') {
        name = xmulti[i]
        break
      }
    }
  }
  return name
}

module.exports = Commons

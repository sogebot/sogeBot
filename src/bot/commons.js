'use strict'

var _ = require('lodash')
var chalk = require('chalk')
const moment = require('moment')

const config = require('@config')

const cluster = require('cluster')
const Message = require('./message')

function Commons () {
  this.compact = {}

  this.cached = {
    ignorelist: []
  }

  this.registerConfiguration()
  this.loadIgnoreList()
}

Commons.prototype.registerConfiguration = function () {
  if (_.isNil(global.configuration)) return setTimeout(() => this.registerConfiguration(), 1)

  global.configuration.register('atUsername', 'core.settings.atUsername', 'bool', true)
  global.configuration.register('sendWithMe', 'core.settings.sendWithMe', 'bool', false)
}

Commons.prototype.processAll = function (proc) {
  if (cluster.isMaster) {
    // run on master
    const namespace = _.get(global, proc.ns, null)
    namespace[proc.fnc].apply(namespace, proc.args)
    proc.type = 'call'
    // send to all clusters
    // eslint-disable-next-line
    for (let w of Object.entries(cluster.workers)) {
      if (w[1].isConnected()) w[1].send(proc)
    }
  } else {
    // need to be sent to master
    if (process.send) process.send(proc)
  }
}

Commons.prototype.loadIgnoreList = async function () {
  if (typeof global.db === 'undefined' || !global.db.engine.connected) return setTimeout(() => this.loadIgnoreList(), 1000)
  global.commons.cached.ignorelist = (await global.db.engine.find('users_ignorelist')).map(o => o.username)
}

Commons.prototype.getIgnoreList = function () {
  if (typeof global.commons.cached.ignorelist === 'undefined') global.commons.cached.ignorelist = []
  return global.commons.cached.ignorelist
}

Commons.prototype.isIgnored = async function (sender) {
  if (sender !== null) { // null can be bot from dashboard or event
    if (typeof sender === 'string') sender = { username: sender }
    const isIgnored = this.getIgnoreList().includes(sender.username)
    const isBroadcaster = await this.isBroadcaster(sender)
    return isIgnored && !isBroadcaster
  } else return false
}

Commons.prototype.isSystemEnabled = function (fn) {
  var name = (typeof fn === 'object') ? fn.constructor.name : fn
  var enabled = !_.isNil(config.systems) && !_.isNil(config.systems[name.toLowerCase()]) ? (_.isBoolean(config.systems[name.toLowerCase()] ? config.systems[name.toLowerCase()] : config.systems[name.toLowerCase()].enabled)) : false
  if (typeof fn === 'object' && cluster.isMaster) global.log.info(name + ' system ' + global.translate('core.loaded') + ' ' + (enabled ? chalk.green(global.translate('core.enabled')) : chalk.red(global.translate('core.disabled'))))
  return enabled
}
Commons.prototype.isIntegrationEnabled = function (fn) {
  const name = (typeof fn === 'object') ? fn.constructor.name : fn
  let enabled = false

  let isExists = !_.isNil(config.integrations) && !_.isNil(config.integrations[name.toLowerCase()])

  if (isExists) {
    let isBool = _.isBoolean(config.integrations[name.toLowerCase()])
    if (!isBool) {
      let isEnabled = config.integrations[name.toLowerCase()].enabled
      enabled = isEnabled
    } else enabled = config.integrations[name.toLowerCase()]
  }
  if (typeof fn === 'object') global.log.info(name + ' integration ' + global.translate('core.loaded') + ' ' + (enabled ? chalk.green(global.translate('core.enabled')) : chalk.red(global.translate('core.disabled'))))
  return enabled
}

Commons.prototype.sendToOwners = async function (text) {
  if (global.configuration.getValue('disableSettingsWhispers')) return text.length > 0 ? global.log.warning(text) : ''
  for (let owner of global.oauth.settings.general.owners) {
    owner = {
      username: owner,
      'message-type': 'whisper'
    }
    global.commons.sendMessage(text, owner)
  }
}

Commons.prototype.prepare = async function (translate, attr) {
  attr = attr || {}
  let msg = global.translate(translate)
  attr = _(attr).toPairs().sortBy((o) => -o[0].length).fromPairs().value() // reorder attributes by key length
  for (let [key, value] of Object.entries(attr)) {
    if (_.includes(['username', 'who', 'winner', 'sender'], key)) value = await global.configuration.getValue('atUsername') ? `@${value}` : value
    msg = msg.replace(new RegExp('[$]' + key, 'g'), value)
  }
  return msg
}

Commons.prototype.getTime = function (time, isChat) {
  var now, days, hours, minutes, seconds
  now = _.isNull(time) || !time ? { days: 0, hours: 0, minutes: 0, seconds: 0 } : moment.preciseDiff(moment().valueOf(), moment(time).valueOf(), true)
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
  message = await message // await if message is promise (like prepare)
  attr = attr || {}
  sender = sender || {}

  if (_.isString(sender)) sender = { username: sender }
  if (_.isNil(sender) || _.isNil(sender.username)) sender.username = undefined
  else attr.sender = sender.username
  if (!_.isNil(sender.quiet)) attr.quiet = sender.quiet
  if (!_.isNil(sender.skip)) attr.skip = sender.skip
  if (!attr.skip) message = await new Message(message).parse(attr)
  if (message.length === 0) return false // if message is empty, don't send anything

  // if sender is null/undefined, we can assume, that username is from dashboard -> bot
  if ((typeof sender.username === 'undefined' || sender.username === null) && !attr.force) return false // we don't want to reply on bot commands
  message = !_.isNil(sender.username) ? message.replace(/\$sender/g, (global.configuration.getValue('atUsername') ? '@' : '') + sender.username) : message
  if (!(await global.configuration.getValue('mute')) || attr.force) {
    if ((!_.isNil(attr.quiet) && attr.quiet)) return true
    if (sender['message-type'] === 'whisper') {
      global.log.whisperOut(message, { username: sender.username })
      global.commons.message('whisper', sender.username, message)
    } else {
      global.log.chatOut(message, { username: sender.username })
      if ((await global.configuration.getValue('sendWithMe')) && !message.startsWith('/')) {
        global.commons.message('me', null, message)
      } else {
        global.commons.message('say', null, message)
      }
    }
  }
  return true
}

Commons.prototype.message = async function (type, username, message, retry) {
  if (config.debug.console) return
  if (cluster.isWorker && process.send) process.send({ type: type, sender: username, message: message })
  else if (cluster.isMaster) {
    try {
      if (username === null) username = await global.oauth.settings.general.channel
      if (username === '') {
        global.log.error('TMI: channel is not defined, message cannot be sent')
      } else {
        global.tmi.client.bot.chat[type](username, message)
      }
    } catch (e) {
      if (_.isNil(retry)) setTimeout(() => this.message(type, username, message, false), 5000)
      else global.log.error(e)
    }
  }
}

Commons.prototype.timeout = async function (username, reason, timeout) {
  if (cluster.isMaster) global.tmi.client.bot.chat.timeout(global.commons.getBroadcaster(), username, timeout, reason)
  else if (process.send) process.send({ type: 'timeout', username: username, timeout: timeout, reason: reason })
}

Commons.prototype.getOwner = function () {
  try {
    return global.oauth.settings.general.owners[0].trim()
  } catch (e) {
    return ''
  }
}
Commons.prototype.getOwners = function () {
  return global.oauth.settings.general.owners
}

Commons.prototype.getBroadcaster = function () {
  try {
    return global.oauth.settings.broadcaster.username.toLowerCase().trim()
  } catch (e) {
    return ''
  }
}

Commons.prototype.isBroadcaster = function (user) {
  try {
    if (_.isString(user)) user = { username: user }
    return global.oauth.settings.broadcaster.username.toLowerCase().trim() === user.username.toLowerCase().trim()
  } catch (e) {
    return false
  }
}

Commons.prototype.isMod = async function (user) {
  if (_.isNil(user)) return false

  if (_.isString(user)) user = await global.users.getByName(user)
  else if (_.isNil(user.isModerator)) user = await global.users.getByName(user.username)
  else user = { is: { mod: user.isModerator } }
  return !_.isNil(user.is.mod) ? user.is.mod : false
}

Commons.prototype.isRegular = async function (user) {
  if (_.isNil(user)) return false

  global.db.engine.find('users', { username: _.isString(user) ? user : user.username })
  return _.get(user, 'is.regular', false)
}

Commons.prototype.isBot = function (user) {
  try {
    if (_.isString(user)) user = { username: user }
    if (global.oauth.settings.bot.username) {
      return global.oauth.settings.bot.username.toLowerCase().trim() === user.username.toLowerCase().trim()
    } else return false
  } catch (e) {
    return true // we can expect, if user is null -> bot or admin
  }
}

Commons.prototype.isOwner = function (user) {
  try {
    if (_.isString(user)) user = { username: user }
    if (global.oauth.settings.general.owners) {
      const owners = _.map(_.filter(global.oauth.settings.general.owners, _.isString), function (owner) {
        return _.trim(owner.toLowerCase())
      })
      return _.includes(owners, user.username.toLowerCase().trim())
    } else return false
  } catch (e) {
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

/*
  Compact db based on index and value (must be a number like)
  table: table to compact
  index: compact into this index
  values: values to compact
*/
Commons.prototype.compactDb = async function (opts) {
  opts = opts || {}
  if (_.size(opts) === 0) throw Error('No options specified')

  // compact if 1000 new items
  const shouldCompact =
    typeof this.compact[opts.table] === 'undefined' ? true : this.compact[opts.table] + 1000 < (await global.db.engine.count(opts.table))

  if (shouldCompact) {
    let idsToUpdate = {}
    let itemsFromDb = await global.db.engine.find(opts.table)
    this.compact[opts.table] = new Date()
    for (let item of itemsFromDb) {
      if (!item[opts.index] || item[opts.index] === 'undefined') {
        await global.db.engine.remove(opts.table, { _id: String(item._id) })
      }
      if (_.isNil(idsToUpdate[item[opts.index]])) {
        // if first id => we have pointer to that id and do nothing
        idsToUpdate[item[opts.index]] = String(item._id)
      } else {
        const value = isNaN(Number(item[opts.values])) ? 0 : Number(item[opts.values])

        if (isNaN(Number(item[opts.values]))) {
          global.log.warning(`compactDb - ${opts.table} | NaN value found | ${item.__COMMENT__}`)
        }

        if (value !== 0) {
          await Promise.all([
            global.db.engine.increment(opts.table, { _id: idsToUpdate[item[opts.index]] }, { [opts.values]: value }),
            global.db.engine.remove(opts.table, { _id: String(item._id) })
          ])
        } else {
          await global.db.engine.remove(opts.table, { _id: String(item._id) })
        }
      }
    }
    // save new compact count
    this.compact[opts.table] = await global.db.engine.count(opts.table)
  }
}

module.exports = Commons

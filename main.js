'use strict'

// 3rd party libraries
var irc = require('tmi.js')
var _ = require('lodash')

// bot libraries
var Configuration = require('./libs/configuration')
var Parser = require('./libs/parser')
var Twitch = require('./libs/twitch')
var Commons = require('./libs/commons')
var Users = require('./libs/users')
var Panel = require('./libs/panel')
var Stats = require('./libs/stats')
var Watcher = require('./libs/watcher')
var Events = require('./libs/events')
var Permissions = require('./libs/permissions')
var constants = require('./libs/constants')

require('./libs/logging')

global.watcher = new Watcher()
global.parser = new Parser()
global.configuration = new Configuration()
global.commons = new Commons()
global.panel = new Panel()
global.users = new Users()
global.twitch = new Twitch()
global.stats = new Stats()
global.events = new Events()
global.permissions = new Permissions()
global.translate = require('./libs/translate')

global.status = {
  'TMI': constants.DISCONNECTED,
  'API': constants.DISCONNECTED,
  'MOD': false
}

var options = {
  options: {
    debug: false
  },
  connection: {
    reconnect: true
  },
  identity: {
    username: global.configuration.get().twitch.username,
    password: global.configuration.get().twitch.password
  },
  channels: ['#' + global.configuration.get().twitch.channel]
}

global.channelId = null

global.client = new irc.Client(options)

global.translate().then(function () {
  global.systems = require('auto-load')('./libs/systems/')
  global.widgets = require('auto-load')('./libs/widgets/')
  global.overlays = require('auto-load')('./libs/overlays/')
})

// Connect the client to the server..
global.client.connect()

global.client.on('connected', function (address, port) {
  global.log.info('Bot is connected to TMI server')
  global.client.color(global.configuration.get().twitch.color)
  global.status.TMI = constants.CONNECTED
})

global.client.on('connecting', function (address, port) {
  global.log.info('Bot is connecting to TMI server')
  global.status.TMI = constants.CONNECTING
})

global.client.on('reconnect', function (address, port) {
  global.log.info('Bot is trying to reconnect to TMI server')
  global.status.TMI = constants.RECONNECTING
})

global.client.on('disconnected', function (address, port) {
  global.log.warning('Bot is disconnected from TMI server')
  global.status.TMI = constants.DISCONNECTED
})

global.client.on('message', function (channel, sender, message, fromSelf) {
  if (!fromSelf && global.configuration.get().twitch.username !== sender.username) {
    global.users.set(sender.username, { id: sender['user-id'] })
    if (sender['message-type'] !== 'whisper') {
      global.parser.timer.push({ 'id': sender.id, 'received': new Date().getTime() })
      global.log.chatIn(message, {username: sender.username})
      global.events.fire('command-send-x-times', { message: message })

      if (!_.isUndefined(global.users.get(sender.username).id)) {
        global.users.isFollower(sender.username)
      }
    } else {
      global.log.whisperIn(message, {username: sender.username})
    }
    global.parser.parse(sender, message)

    if (!message.startsWith('!')) {
      const user = global.users.get(sender.username)
      let msgs = _.isUndefined(user.stats.messages) ? 1 : parseInt(user.stats.messages, 10) + 1
      global.users.set(user.username, { stats: { messages: msgs } }, true)
    }
  }
})

global.client.on('join', function (channel, username, fromSelf) {
  if (!fromSelf) {
    let user = global.users.get(username)
    if (!_.isNil(user) && !_.isNil(user.id)) {
      global.users.isFollower(username)
    }
    global.users.set(username, { is: { online: true } })
    global.events.fire('user-joined-channel', { username: username })
  }
})

global.client.on('part', function (channel, username, fromSelf) {
  if (!fromSelf) {
    global.users.set(username, { is: { online: false } })
    global.events.fire('user-parted-channel', { username: username })
  }
})

global.client.on('action', function (channel, userstate, message, self) {
  if (self) return
  global.events.fire('action', { username: userstate.username.toLowerCase() })
})

global.client.on('ban', function (channel, username, reason) {
  global.events.fire('ban', { username: username.toLowerCase(), reason: reason })
})

global.client.on('timeout', function (channel, username, reason, duration) {
  global.events.fire('timeout', { username: username.toLowerCase(), reason: reason, duration: duration })
})

global.client.on('hosting', function (channel, target, viewers) {
  global.events.fire('hosting', { target: target, viewers: viewers })
})

global.client.on('mod', function (channel, username) {
  const user = global.users.get(username)
  if (!user.is.mod) global.events.fire('mod', { username: username })
  global.users.set(username, { is: { mod: true } }, true)
})

global.client.on('cheer', function (channel, userstate, message) {
  global.events.fire('cheer', { username: userstate.username.toLowerCase(), bits: userstate.bits, message: message })
})

global.client.on('clearchat', function (channel) {
  global.events.fire('clearchat')
})

global.client.on('subscription', function (channel, username, method) {
  global.users.set(username, { is: { subscriber: true } })
  global.events.fire('subscription', { username: username, method: (!_.isNil(method.prime) && method.prime) ? 'Twitch Prime' : '' })
  global.twitch.cached.subscribers.unshift(username)
  global.twitch.cached.subscribers = _.chunk(global.twitch.cached.subscribers, 100)[0]
})

global.client.on('resub', function (channel, username, months, message) {
  global.users.set(username, { is: { subscriber: true } })
  global.events.fire('resub', { username: username, months: months, message: message })
  global.twitch.cached.subscribers.unshift(username + ', ' + months + ' ' + global.parser.getLocalizedName(months, 'core.months'))
  global.twitch.cached.subscribers = _.chunk(global.twitch.cached.subscribers, 100)[0]
})

// Bot is checking if it is a mod
setInterval(function () {
  global.status.MOD = global.client.isMod('#' + global.configuration.get().twitch.channel, global.configuration.get().twitch.username)
}, 60000)

// get and save channel_id
global.client.api({
  url: 'https://api.twitch.tv/kraken/users?login=' + global.configuration.get().twitch.channel,
  headers: {
    Accept: 'application/vnd.twitchtv.v5+json',
    'Client-ID': global.configuration.get().twitch.clientId
  }
}, function (err, res, body) {
  if (err) {
    global.log.error(err)
    return
  }

  if (_.isNil(body.users[0])) {
    global.log.error('Channel ' + global.configuration.get().twitch.channel + ' not found!')
    process.exit()
  } else global.channelId = body.users[0]._id
})

if (global.configuration.get().bot.debug) {
  global.log.warning('+------------------------------------+')
  global.log.warning('| DEBUG MODE IS ENABLED              |')
  global.log.warning('| PLEASE DISABLE IT IN CONFIG.INI    |')
  global.log.warning('| UNLESS YOU KNOW WHAT YOU ARE DOING |')
  global.log.warning('+------------------------------------+')
}

process.on('unhandledRejection', function (reason, p) {
  global.log.error('Possibly Unhandled Rejection')
  global.log.error(p)
})

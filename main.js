'use strict'

// 3rd party libraries
var irc = require('tmi.js')

// bot libraries
var Configuration = require('./libs/configuration')
var Parser = require('./libs/parser')
var Twitch = require('./libs/twitch')
var Commons = require('./libs/commons')
var User = require('./libs/user')
var Panel = require('./libs/panel')
var Stats = require('./libs/stats')
var constants = require('./libs/constants')
require('./libs/logging')

global.parser = new Parser()
global.configuration = new Configuration()
global.commons = new Commons()
global.panel = new Panel()
global.twitch = new Twitch()
global.stats = new Stats()
global.translate = require('./libs/translate')

global.status = {'TMI': constants.DISCONNECTED,
                 'API': constants.DISCONNECTED}

require('./libs/permissions')

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
  channels: ['#' + global.configuration.get().twitch.owner]
}

global.client = new irc.client(options)

// load bot systems after translation is loaded
global.translate().then(function () {
  global.systems = require('auto-load')('./libs/systems/')
})

// Connect the client to the server..
global.client.connect()

global.client.on('connected', function (address, port) {
  global.client.color('Firebrick')
  global.status.TMI = constants.CONNECTED
})

global.client.on('connecting', function (address, port) {
  global.status.TMI = constants.CONNECTING
})

global.client.on('reconnect', function (address, port) {
  global.status.TMI = constants.RECONNECTING
})

global.client.on('disconnected', function (address, port) {
  global.status.TMI = constants.DISCONNECTED
})

global.client.on('chat', function (channel, user, message, fromSelf) {
  if (!fromSelf) {
    global.parser.parse(user, message)
  }
})

global.client.on('join', function (channel, username, fromSelf) {
  if (!fromSelf) {
    var user = new User(username)
    user.setOnline()
  }
})

global.client.on('part', function (channel, username, fromSelf) {
  if (!fromSelf) {
    var user = new User(username)
    user.setOffline()
  }
})

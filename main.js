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
require('./libs/logging')

global.parser = new Parser()
global.configuration = new Configuration()
global.twitch = new Twitch()
global.commons = new Commons()
global.panel = new Panel()
global.translate = require('./libs/translate')

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
})

global.client.on('chat', function (channel, user, message, fromSelf) {
  if (!fromSelf) {
    global.log.info(channel + ' ' + user.username + ': ' + message)
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

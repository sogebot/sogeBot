'use strict'

// 3rd party libraries
var irc = require('tmi.js')

// bot libraries
var Configuration = require('./libs/configuration')
var Parser = require('./libs/parser')
var Twitch = require('./libs/twitch')
var Commons = require('./libs/commons')

global.configuration = new Configuration()

var options = {
  options: {
    debug: true
  },
  connection: {
    cluster: global.configuration.get().twitch.cluster,
    reconnect: true
  },
  identity: {
    username: global.configuration.get().twitch.username,
    password: global.configuration.get().twitch.password
  },
  channels: ['#' + global.configuration.get().twitch.owner]
}

global.client = new irc.client(options)

global.parser = new Parser()
global.twitch = new Twitch()
global.commons = new Commons()

// bot systems
global.systems = require('auto-load')('./libs/systems/')

// Connect the client to the server..
global.client.connect()

global.client.on('connected', function (address, port) {
  global.client.raw('CAP REQ :twitch.tv/commands')
  global.client.raw('CAP REQ :twitch.tv/membership')
  global.client.color('Firebrick')
})

global.client.on('chat', function (channel, user, message, self) {
  global.parser.parse(user, message)
})

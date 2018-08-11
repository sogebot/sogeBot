const fs = require('fs')

// setup config
const config = require('../config.json')
config.settings.bot_username = '__mocha__test__'
config.settings.bot_oauth = ''
config.settings.bot_owners = 'soge__'
config.settings.broadcaster_username = 'test__________broadcaster'
fs.writeFileSync('../config.json', JSON.stringify(config))

// set process and debug mode to have only one cpu
process.send = process.send || function () {} // process is not in mocha somehow

// load up a bot
if (require('cluster').isMaster) {
  global.cluster = false
  require('../main.js')
}

global.botTMI = {
  chat: {
    say: function () { },
    color: function () {},
    timeout: function () {},
    on: function () {},
    connect: function () {},
    join: function () {}
  }
}
global.broadcasterTMI = {
  chat: {
    say: function () { },
    color: function () {},
    timeout: function () {},
    on: function () {},
    connect: function () {},
    join: function () {}
  }
}

module.exports = {
  db: require('./helpers/db'),
  message: require('./helpers/messages'),
  tmi: require('./helpers/tmi'),
  variable: require('./helpers/variable'),
  time: require('./helpers/time')
}

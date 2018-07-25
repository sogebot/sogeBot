const fs = require('fs')

// setup config
const config = require('../config.json')
config.settings.bot_username = 'test__________bot'
config.settings.bot_oauth = '96wi94nziumq4fk2w3ocj8g97wb5uj'
config.settings.bot_owners = 'soge__'
config.settings.broadcaster_username = 'test__________broadcaster'
fs.writeFileSync('../config.json', JSON.stringify(config))

// set process and debug mode to have only one cpu
process.send = process.send || function () {} // process is not in mocha somehow

global.client = {
  say: function () { },
  color: function () {},
  timeout: function () {},
  on: function () {},
  connect: function () {},
  readyState: function () { return 'OPEN' },
  isMod: function () { return true }
}

// load up a bot
if (require('cluster').isMaster) {
  global.cluster = false
  require('../main.js')
}

module.exports = {
  db: require('./helpers/db'),
  message: require('./helpers/messages'),
  tmi: require('./helpers/tmi'),
  variable: require('./helpers/variable'),
  time: require('./helpers/time')
}

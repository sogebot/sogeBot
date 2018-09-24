const fs = require('fs')

// setup config
const config = require('../config.json')
config.settings.bot_username = '__mocha__test__'
config.settings.bot_oauth = ''
config.settings.bot_owners = 'soge__'
config.settings.broadcaster_username = 'test__________broadcaster'

config.metrics = config.metrics || {}
config.metrics.translations = false

fs.writeFileSync('../config.json', JSON.stringify(config))

// load up a bot
if (require('cluster').isMaster) {
  global.mocha = true
  require('../dest/main.js')
  global.commons.cached.owners = ['soge__']
}

module.exports = {
  db: require('./helpers/db'),
  message: require('./helpers/messages'),
  tmi: require('./helpers/tmi'),
  variable: require('./helpers/variable'),
  time: require('./helpers/time')
}

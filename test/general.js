const fs = require('fs')
const {
  isMainThread
} = require('worker_threads');

// setup config
const config = require('../config.json')
require('./mocks');

config.metrics = config.metrics || {}
config.metrics.translations = false

fs.writeFileSync('../config.json', JSON.stringify(config))

// load up a bot
if (isMainThread) {
  global.mocha = true
  require('../dest/main.js')
}

module.exports = {
  db: require('./helpers/db'),
  message: require('./helpers/messages'),
  tmi: require('./helpers/tmi'),
  variable: require('./helpers/variable'),
  time: require('./helpers/time')
}

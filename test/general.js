const fs = require('fs')

// setup config
const config = require('../config.json')
config.settings.bot_username = 'test__________bot'
config.settings.bot_oauth = '96wi94nziumq4fk2w3ocj8g97wb5uj'
config.settings.bot_owners = 'soge__'
config.settings.broadcaster_username = 'test__________bot'
fs.writeFileSync('../config.json', JSON.stringify(config))

// load up a bot
require('../main.js')

module.exports = {
  db: require('./helpers/db'),
  message: require('./helpers/messages'),
  tmi: require('./helpers/tmi')
}

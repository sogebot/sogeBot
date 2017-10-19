const fs = require('fs')
const sinon = require('sinon')

// setup config
const config = require('../config.json')
config.settings.bot_owners = 'soge__'
config.settings.broadcaster_username = 'soge__'
fs.writeFileSync('../config.json', JSON.stringify(config))

// load up a bot
require('../main.js')

sinon.stub(global.commons, 'sendMessage')
sinon.stub(global.commons, 'timeout')

module.exports = {
  db: require('./helpers/db')
}

'use strict'

var chalk = require('chalk')
var constants = require('../constants')

function Moderation () {
  if (global.configuration.get().systems.moderation === true) {
    global.parser.registerParser('moderationLinks', this.containsLink, constants.VIEWERS)
  }

  console.log('Moderation system loaded and ' + (global.configuration.get().systems.moderation === true ? chalk.green('enabled') : chalk.red('disabled')))
}

Moderation.prototype.containsLink = function (id, sender, text) {
  var urlRegex = /(https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/ig
  if (text.search(urlRegex) >= 0 && sender.username !== global.configuration.get().owner) {
    global.client.timeout(global.configuration.get().twitch.owner, sender.username, 5)
    global.client.action(global.configuration.get().twitch.owner, 'Sorry, ' + sender.username + ', no links allowed. Ask for !permit first')
    global.updateQueue(id, false)
  } else {
    global.updateQueue(id, true)
  }
}

module.exports = new Moderation()

'use strict'

var chalk = require('chalk')
var constants = require('../constants')

function Moderation () {
  if (global.configuration.get().systems.moderation === true) {
    global.parser.register(this, '!permit', this.permitLink, constants.OWNER_ONLY)
    global.parser.registerParser('moderationLinks', this.containsLink, constants.VIEWERS)
  }

  console.log('Moderation system loaded and ' + (global.configuration.get().systems.moderation === true ? chalk.green('enabled') : chalk.red('disabled')))
}

Moderation.prototype.permitLink = function (self, sender, text) {
  if (text.length < 1) return
  global.botDB.insert({type: 'permitLink', username: text.trim()})
  global.client.action(global.configuration.get().twitch.owner, 'User ' + text.trim() + ' is permitted to post a link.')
}

Moderation.prototype.containsLink = function (id, sender, text) {
  var urlRegex = /(https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/ig
  if (text.search(urlRegex) >= 0 && sender.username !== global.configuration.get().owner) {
    global.botDB.findOne({type: 'permitLink', username: sender.username}, function (err, item) {
      if (err) console.log(err)
      try {
        global.botDB.remove({_id: item._id}, {}, function (err, numRemoved) {
          if (err) console.log(err)
          console.log(numRemoved)
          if (numRemoved === 1) global.updateQueue(id, true)
          else global.updateQueue(id, false)
        })
      } catch (err) {
        global.client.timeout(global.configuration.get().twitch.owner, sender.username, 5)
        global.client.action(global.configuration.get().twitch.owner, 'Sorry, ' + sender.username + ', no links allowed. Ask for !permit first')
        global.updateQueue(id, false)
      }
    })
  } else {
    global.updateQueue(id, true)
  }
}

module.exports = new Moderation()

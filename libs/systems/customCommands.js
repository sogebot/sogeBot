'use strict'

var chalk = require('chalk')
var constants = require('../constants')

function CustomCommands () {
  if (global.configuration.get().systems.customCommands === true) {
    global.parser.register(this, '!command add', this.add, constants.OWNER_ONLY)
    global.parser.register(this, '!command list', this.list, constants.OWNER_ONLY)
    global.parser.register(this, '!command remove', this.remove, constants.OWNER_ONLY)
    global.parser.register(this, '!command', this.help, constants.OWNER_ONLY)

    // start interval for registering commands from DB
    var self = this
    setInterval(function () {
      self.register(self)
    }, 1000)
  }

  console.log('CustomCommands system loaded and ' + (global.configuration.get().systems.customCommands === true ? chalk.green('enabled') : chalk.red('disabled')))
}

CustomCommands.prototype.help = function () {
  var text = 'Usage: !command add <command> <response> | !command remove <command> | !command list'
  global.client.action(global.configuration.get().twitch.owner, text)
}

CustomCommands.prototype.register = function (self) {
  global.botDB.find({type: 'customCommands'}, function (err, docs) {
    if (err) { console.log(err) }
    docs.forEach(function (e, i, ar) { global.parser.register(self, '!' + e.keyword, self.run, constants.VIEWERS) })
  })
}

CustomCommands.prototype.add = function (self, sender, keyword) {
  var data = {_type: 'customCommands', _keyword: keyword.split(' ')[0], response: keyword.replace(keyword.split(' ')[0], '').trim(), success: 'Custom command was succesfully added', error: 'Sorry, ' + sender.username + ', this custom command already exists.'};
  (data._keyword.length < 1 || data.response.length <= 1 ? global.commons.sendMessage('Sorry, ' + sender.username + ', command is not correct, check !command') : global.commons.insertIfNotExists(data))
}

CustomCommands.prototype.run = function (self, user, msg, fullMsg) {
  global.botDB.findOne({type: 'customCommands', keyword: fullMsg.split('!')[1]}, function (err, item) {
    if (err) { console.log(err) }
    if (typeof item !== 'undefined' && item !== null) {
      global.client.action(global.configuration.get().twitch.owner, item.response)
    } else {
      global.parser.unregister(fullMsg) // unregister if not found in database
    }
  })
}

CustomCommands.prototype.list = function () {
  global.botDB.find({type: 'customCommands'}, function (err, docs) {
    if (err) { console.log(err) }
    var keywords = []
    docs.forEach(function (e, i, ar) { keywords.push('!' + e.keyword) })
    var output = (docs.length === 0 ? 'CustomCommand list is empty.' : 'CustomCommand list: ' + keywords.join(', ') + '.')
    global.client.action(global.configuration.get().twitch.owner, output)
  })
}

CustomCommands.prototype.remove = function (self, sender, text) {
  var data = {_type: 'customCommands', _keyword: text.trim(),
    success: function (cb) {
      global.parser.unregister('!' + cb.keyword)
      global.client.action(global.configuration.get().twitch.owner, 'Custom command was succesfully removed.')
    },
    error: 'Custom command cannot be found.'
  };
  (data._keyword.length < 1 ? global.commons.sendMessage('Sorry, ' + sender.username + ', custom command is not correct, check !command') : global.commons.remove(data))
}

module.exports = new CustomCommands()

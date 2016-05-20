'use strict'

var chalk = require('chalk')
var constants = require('../constants')

function CustomCommands () {
  if (global.configuration.get().systems.customCommands === true) {
    global.parser.register(this, '!command add', this.addCommand, constants.OWNER_ONLY)
    global.parser.register(this, '!command list', this.listCommands, constants.OWNER_ONLY)
    global.parser.register(this, '!command remove', this.delCommand, constants.OWNER_ONLY)
    global.parser.register(this, '!command', this.help, constants.OWNER_ONLY)

    this.addCommand(this, 'sogehige', 'keyword response')

    // start interval for registering commands from DB
    var self = this
    setInterval(function () {
      self.registerCommands(self)
    }, 1000)
  }

  this.delCommand(self, 'sogehige', 'alpha')

  console.log('CustomCommands system loaded and ' + (global.configuration.get().systems.customCommands === true ? chalk.green('enabled') : chalk.red('disabled')))
}

CustomCommands.prototype.help = function () {
  var text = 'Usage: !command add <command> <response> | !command remove <command> | !command list'
  global.client.action(global.configuration.get().twitch.owner, text)
}

CustomCommands.prototype.registerCommands = function (self) {
  global.botDB.find({type: 'customCommands'}, function (err, docs) {
    if (err) { console.log(err) }
    docs.forEach(function (e, i, ar) { global.parser.register(self, '!' + e.keyword, self.customCommand, constants.VIEWERS) })
  })
}

CustomCommands.prototype.addCommand = function (self, sender, keyword) {
  if (keyword.length < 1) {
    global.client.action(global.configuration.get().twitch.owner, 'CustomCommand error: Cannot add empty keyword')
    return
  }

  // check if response after keyword is set
  if (keyword.split(' ').length <= 1) {
    global.client.action(global.configuration.get().twitch.owner, 'CustomCommand error: Cannot add keyword without response')
    return
  }

  var kw = keyword.split(' ')[0]
  var response = keyword.replace(kw, '').trim()

  var data = {_type: 'customCommands', _keyword: kw, response: response, success: 'Custom command was succesfully added', error: 'Sorry, ' + sender + ', this custom command already exists.'}
  global.commons.insertIfNotExists(data)
}

CustomCommands.prototype.customCommand = function (self, user, msg, fullMsg) {
  global.botDB.findOne({type: 'customCommands', keyword: fullMsg.split('!')[1]}, function (err, item) {
    if (err) { console.log(err) }
    if (typeof item !== 'undefined' && item !== null) {
      global.client.action(global.configuration.get().twitch.owner, item.response)
    } else {
      global.parser.unregister(fullMsg) // unregister if not found in database
    }
  })
}

CustomCommands.prototype.listCommands = function () {
  global.botDB.find({type: 'customCommands'}, function (err, docs) {
    if (err) { console.log(err) }
    var keywords = []
    docs.forEach(function (e, i, ar) { keywords.push('!' + e.keyword) })
    var output = (docs.length === 0 ? 'CustomCommand list is empty.' : 'CustomCommand list: ' + keywords.join(', ') + '.')
    global.client.action(global.configuration.get().twitch.owner, output)
  })
}

CustomCommands.prototype.delCommand = function (self, sender, text) {
  var data = {_type: 'customCommands', _keyword: text.trim(),
    success: function (cb) {
      global.parser.unregister('!' + cb.keyword)
      global.client.action(global.configuration.get().twitch.owner, 'Custom command was succesfully removed.')
    },
    error: 'Custom command cannot be found.'
  }
  if (data._keyword.length < 1) {
    global.client.action(global.configuration.get().twitch.owner, 'Sorry, ' + sender + ', custom command is not correct, check !command')
  } else {
    global.commons.remove(data)
  }
}

module.exports = new CustomCommands()

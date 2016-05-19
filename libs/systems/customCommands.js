'use strict'

var chalk = require('chalk')
var Database = require('nedb')
var constants = require('../constants')

var database = new Database({
  filename: 'db/customCommands.db',
  autoload: true
})
database.persistence.setAutocompactionInterval(60000)

function CustomCommands () {
  if (global.configuration.get().systems.customCommands === true) {
    global.parser.register(this, '!command add', this.addCommand, constants.OWNER_ONLY)
    global.parser.register(this, '!command list', this.listCommands, constants.OWNER_ONLY)
    global.parser.register(this, '!command remove', this.delCommand, constants.OWNER_ONLY)
    global.parser.register(this, '!command', this.help, constants.OWNER_ONLY)

    // start interval for registering commands from DB
    var self = this
    setInterval(function () {
      self.registerCommands(self)
    }, 1000)
  }

  console.log('CustomCommands system loaded and ' + (global.configuration.get().systems.customCommands === true ? chalk.green('enabled') : chalk.red('disabled')))
}

CustomCommands.prototype.help = function () {
  var text = 'Usage: !command add <command> <response> | !command remove <command> | !command list'
  global.client.action(global.configuration.get().twitch.owner, text)
}

CustomCommands.prototype.registerCommands = function (self) {
  database.find({}, function (err, docs) {
    if (err) { console.log(err) }
    docs.forEach(function (e, i, ar) { global.parser.register(self, '!' + e.keyword, self.customCommand, constants.VIEWERS) })
  })
}

CustomCommands.prototype.addCommand = function (self, user, keyword) {
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

  database.find({ keyword: kw }, function (err, docs) {
    if (err) { console.log(err) }
    if (docs.length === 0) { // it is safe to insert new notice?
      database.insert({keyword: kw, response: response}, function (err, newItem) {
        if (err) { console.log(err) }
        global.client.action(global.configuration.get().twitch.owner, 'CustomCommand#' + kw + ' succesfully added')
      })
    } else {
      global.client.action(global.configuration.get().twitch.owner, 'CustomCommand error: Cannot add duplicate command.')
    }
  })
}

CustomCommands.prototype.customCommand = function (self, user, msg, fullMsg) {
  database.findOne({keyword: fullMsg.split('!')[1]}, function (err, item) {
    if (err) { console.log(err) }
    if (typeof item !== 'undefined' && item !== null) {
      global.client.action(global.configuration.get().twitch.owner, item.response)
    } else {
      global.parser.unregister(fullMsg) // unregister if not found in database
    }
  })
}

CustomCommands.prototype.listCommands = function () {
  database.find({}, function (err, docs) {
    if (err) { console.log(err) }
    var keywords = []
    docs.forEach(function (e, i, ar) { keywords.push('!' + e.keyword) })
    var output = (docs.length === 0 ? 'CustomCommand list is empty.' : 'CustomCommand list: ' + keywords.join(', ') + '.')
    global.client.action(global.configuration.get().twitch.owner, output)
  })
}

CustomCommands.prototype.delCommand = function (self, user, keyword) {
  if (keyword.length < 1) {
    global.client.action(global.configuration.get().twitch.owner, 'CustomCommand error: Cannot delete keyword without keyword.')
    return
  }

  database.remove({keyword: keyword}, {}, function (err, numRemoved) {
    if (err) { console.log(err) }
    var output = (numRemoved === 0 ? 'CustomCommand#' + keyword + ' cannot be found.' : 'CustomCommand#' + keyword + ' is succesfully deleted.')
    global.client.action(global.configuration.get().twitch.owner, output)
    if (numRemoved > 0) global.parser.unregister('!' + keyword)
  })
}
module.exports = new CustomCommands()

'use strict'

var chalk = require('chalk')
var Database = require('nedb')
var constants = require('../constants')

var database = new Database({
  filename: 'db/alias.db',
  autoload: true
})
database.persistence.setAutocompactionInterval(60000)

// TODO - add parsing of (sender)

function Alias (configuration) {
  if (global.configuration.get().systems.keywords === true) {
    global.parser.register(this, '!alias add', this.add, constants.OWNER_ONLY)
    global.parser.register(this, '!alias list', this.list, constants.OWNER_ONLY)
    global.parser.register(this, '!alias remove', this.remove, constants.OWNER_ONLY)
    global.parser.register(this, '!alias', this.help, constants.OWNER_ONLY)

    global.parser.registerParser('alias', this.parse, constants.VIEWERS)
  }

  console.log('Alias system loaded and ' + (global.configuration.get().systems.alias === true ? chalk.green('enabled') : chalk.red('disabled')))
}

Alias.prototype.help = function () {
  var text = 'Usage: !alias add <command> <alias> | !alias remove <alias> | !alias list'
  global.client.action(global.configuration.get().twitch.owner, text)
}

Alias.prototype.add = function (self, sender, text) {
  if (text.length < 1 || text.split(' ').length <= 1) {
    global.client.action(global.configuration.get().twitch.owner, 'Sorry, ' + sender + ', alias command is not correct, check !alias')
    return
  }

  var command = text.split(' ')[0]
  var alias = text.replace(command, '').trim()

  database.find({ alias: alias }, function (err, docs) {
    if (err) console.log(err)
    if (docs.length === 0) { // it is safe to insert new keyword?
      database.insert({alias: alias, command: command}, function (err, newItem) {
        if (err) console.log(err)
        global.client.action(global.configuration.get().twitch.owner, 'Alias#' + alias + ' for ' + command + ' succesfully added')
      })
    } else {
      global.client.action(global.configuration.get().twitch.owner, 'Sorry, ' + sender + ', this alias already exists')
    }
  })
}

Alias.prototype.list = function () {
  database.find({}, function (err, docs) {
    if (err) { console.log(err) }
    var list = []
    docs.forEach(function (e, i, ar) { list.push('!' + e.alias) })
    var output = (docs.length === 0 ? 'Alias list is empty.' : 'Alias list: ' + list.join(', ') + '.')
    global.client.action(global.configuration.get().twitch.owner, output)
  })
}

Alias.prototype.remove = function (self, sender, text) {
  if (text.length < 1) {
    global.client.action(global.configuration.get().twitch.owner, 'Sorry, ' + sender + ', alias command is not correct, check !alias')
    return
  }

  var alias = text.trim()
  database.remove({alias: alias}, {}, function (err, numRemoved) {
    if (err) { console.log(err) }
    var output = (numRemoved === 0 ? 'Alias#' + alias + ' cannot be found.' : 'Alias#' + alias + ' is succesfully deleted.')
    global.client.action(global.configuration.get().twitch.owner, output)
  })
}

Alias.prototype.parse = function (id, sender, text) {
  if (!text.startsWith('!')) {
    global.updateQueue(id, true) // we want to parse _ONLY_ commands
    return true
  }

  database.find({ }, function (err, items) {
    if (err) console.log(err)
    var itemFound = false
    for (var index in items) {
      if (items.hasOwnProperty(index)) {
        var item = items[index]
        if (text.startsWith('!' + item.alias)) { // if alias is found, parse same command and send fail (to not continue parsing)
          itemFound = true
          global.updateQueue(id, false)
          global.parser.parse(sender, text.replace('!' + item.alias, '!' + item.command))
          global.parser.lineParsed--
          break
        }
      }
    }
    if (!itemFound) global.updateQueue(id, true)
  })
}

module.exports = new Alias()

'use strict'

var chalk = require('chalk')
var constants = require('../constants')
var _ = require('lodash')

function Alias () {
  if (global.configuration.get().systems.alias === true) {
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
  global.commons.sendMessage(text)
}

Alias.prototype.add = function (self, sender, text) {
  try {
    var parsed = text.match(/^(\w+) (\w+)$/)
    global.commons.insertIfNotExists({__id: 'alias_' + parsed[2], _alias: parsed[2], command: parsed[1], success: 'Alias was successfully added', error: 'Sorry, ' + sender.username + ', this alias already exists.'})
  } catch (e) {
    global.commons.sendMessage('Sorry, ' + sender.username + ', alias command is not correct, check !alias')
  }
}

Alias.prototype.list = function () {
  global.botDB.find({type: 'alias'}, function (err, docs) {
    if (err) { console.log(err) }
    var list = []
    docs.forEach(function (e, i, ar) { list.push('!' + e.alias) })
    var output = (docs.length === 0 ? 'Alias list is empty.' : 'Alias list: ' + list.join(', ') + '.')
    global.client.action(global.configuration.get().twitch.owner, output)
  })
}

Alias.prototype.remove = function (self, sender, text) {
  try {
    var parsed = text.match(/^(\w+)$/)
    global.commons.remove({__id: 'alias_' + parsed[1], success: 'Alias was succesfully removed', error: 'Alias cannot be found'})
  } catch (e) {
    global.commons.sendMessage('Sorry, ' + sender.username + ', alias command is not correct, check !alias')
  }
}

Alias.prototype.parse = function (id, sender, text) {
  global.botDB.findOne({$where: function () { return text.startsWith('!' + this.alias) }}, function (err, item) {
    if (err) console.log(err)
    if (!_.isNull(item)) {
      global.parser.parse(sender, text.replace('!' + item.alias, '!' + item.command))
      global.parser.lineParsed--
    }
    global.updateQueue(id, _.isNull(item))
  })
}

module.exports = new Alias()

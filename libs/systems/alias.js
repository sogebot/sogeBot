'use strict'

var chalk = require('chalk')
var constants = require('../constants')
var _ = require('lodash')

function Alias () {
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
  var data = {_type: 'alias', _alias: text.replace(text.split(' ')[0], '').trim(), command: text.split(' ')[0], success: 'Alias was succesfully added.', error: 'Sorry, ' + sender.username + ', this alias already exists.'}
  data._alias.length <= 1 || data.command.length <= 1 ? global.commons.sendMessage('Sorry, ' + sender.username + ', alias command is not correct, check !alias') : global.commons.insertIfNotExists(data)
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
  var data = {_type: 'alias', _alias: text.trim(), success: 'Alias was succesfully removed.', error: 'Alias cannot be found.'}
  data._alias.length < 1 ? global.commons.sendMessage('Sorry, ' + sender.username + ', alias command is not correct, check !alias') : global.commons.remove(data)
}

Alias.prototype.parse = function (id, sender, text) {
  global.botDB.findOne({type: 'alias', $where: function () { return text.startsWith('!' + this.alias) }}, function (err, item) {
    if (err) console.log(err)
    if (!_.isNull(item)) {
      global.parser.parse(sender, text.replace('!' + item.alias, '!' + item.command))
      global.parser.lineParsed--
    }
    global.updateQueue(id, _.isNull(item))
  })
}

module.exports = new Alias()

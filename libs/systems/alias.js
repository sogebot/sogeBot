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
  console.log('Alias system ' + global.translate('core.loaded') + ' ' + (global.configuration.get().systems.alias === true ? chalk.green(global.translate('core.enabled')) : chalk.red(global.translate('core.disabled'))))
}

Alias.prototype.help = function () {
  var text = global.translate('core.usage') + ': !alias add <command> <alias> | !alias remove <alias> | !alias list'
  global.commons.sendMessage(text)
}

Alias.prototype.add = function (self, sender, text) {
  try {
    var parsed = text.match(/^(\w+) (\w+)$/)
    global.commons.insertIfNotExists({__id: 'alias_' + parsed[2], _alias: parsed[2], command: parsed[1], success: global.translate('alias.success.add'), error: global.translate('alias.failed.add')})
  } catch (e) {
    global.commons.sendMessage(global.translate('alias.failed.parse'), sender)
  }
}

Alias.prototype.list = function () {
  global.botDB.find({type: 'alias'}, function (err, docs) {
    if (err) { console.log(err) }
    var list = []
    docs.forEach(function (e, i, ar) { list.push('!' + e.alias) })
    var output = (docs.length === 0 ? global.translate('alias.failed.list') : global.translate('alias.success.list') + ': ' + list.join(', ') + '.')
    global.client.action(global.configuration.get().twitch.owner, output)
  })
}

Alias.prototype.remove = function (self, sender, text) {
  try {
    var parsed = text.match(/^(\w+)$/)
    global.commons.remove({__id: 'alias_' + parsed[1], success: global.translate('alias.success.remove'), error: global.translate('alias.failed.remove')})
  } catch (e) {
    global.commons.sendMessage(global.translate('alias.failed.parse'), sender)
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

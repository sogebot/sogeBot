'use strict'

var ini = require('ini')
var fs = require('fs')
var Database = require('nedb')
var constants = require('./constants')
var _ = require('lodash')

global.botDB = new Database({
  filename: 'sogeBot.db',
  autoload: true
})
global.botDB.persistence.setAutocompactionInterval(60000)

function Configuration () {
  this.config = null
  this.cfgL = {}
  this.loadFile()

  global.parser.register(this, '!set list', this.listSets, constants.OWNER_ONLY)
  global.parser.register(this, '!set', this.setValue, constants.OWNER_ONLY)

  global.parser.register(this, '!enable', this.enableCmd, constants.OWNER_ONLY)
  global.parser.register(this, '!disable', this.disableCmd, constants.OWNER_ONLY)
  global.parser.registerParser(this, 'disabled', this.isDisabledCmd, constants.VIEWERS)

  this.loadValues()

  this.register('lang', '', 'string', 'en')

  // wait a little bit to get value from db
  var self = this
  setTimeout(function () {
    global.translate.setLocale(self.getValue('lang'))
  }, 1000)
}

Configuration.prototype.loadFile = function () {
  this.config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'))
}

Configuration.prototype.get = function () {
  return this.config
}

Configuration.prototype.register = function (cfgName, success, filter, defaultValue) {
  this.cfgL[cfgName] = {success: success, value: defaultValue, filter: filter}
}

Configuration.prototype.setValue = function (self, sender, text) {
  try {
    var cmd = text.split(' ')[0]
    var value = text.replace(text.split(' ')[0], '').trim()
    var filter = self.cfgL[cmd].filter
    var data = {_type: 'settings', success: self.cfgL[cmd].success}
    data['_' + cmd] = {$exists: true}
    if (filter === 'number' && Number.isInteger(parseInt(value.trim(), 10))) {
      data[cmd] = parseInt(value.trim(), 10)
      global.commons.updateOrInsert(data)
      self.cfgL[cmd].value = data[cmd]
    } else if (filter === 'bool' && (value === 'true' || value === 'false')) {
      data[cmd] = (value.toLowerCase() === 'true')
      global.commons.updateOrInsert(data)
      self.cfgL[cmd].value = data[cmd]
    } else if (filter === 'string' && value.trim().length > 0) {
      if (cmd === 'lang') {
        global.translate.setLocale(value)
        global.commons.sendMessage(global.translate('core.lang-selected'))
        data.success = function () { return true }
      }
      data[cmd] = value.trim()
      global.commons.updateOrInsert(data)
      self.cfgL[cmd].value = data[cmd]
    } else global.commons.sendMessage('Sorry, ' + sender.username + ', cannot parse !set command.')
  } catch (err) {
    global.commons.sendMessage('Sorry, ' + sender.username + ', cannot parse !set command.')
  }
}

Configuration.prototype.listSets = function (self, sender, text) {
  var setL = Object.keys(self.cfgL).map(function (item) { return item }).join(', ')
  global.commons.sendMessage(setL.length === 0 ? 'Sorry, ' + sender.username + ', you cannot configure anything' : 'List of possible settings: ' + setL)
}

Configuration.prototype.getValue = function (cfgName) {
  return this.cfgL[cfgName].value
}

Configuration.prototype.loadValues = function () {
  var self = this
  global.botDB.find({type: 'settings'}, function (err, items) {
    if (err) console.log(err)
    items.map(function (item) {
      delete item.type
      delete item._id
      if (!_.isUndefined(self.cfgL[Object.keys(item)[0]])) self.cfgL[Object.keys(item)[0]].value = item[Object.keys(item)[0]]
    })
  })
}

Configuration.prototype.disableCmd = function (self, sender, text) {
  try {
    var parsed = text.match(/^(\w+)$/)
    global.botDB.update({_id: 'disabled_' + parsed[1]}, {$set: {command: parsed[1]}}, {upsert: true}, function(err) {
      if (err) log.error(err)
      global.commons.sendMessage(translate('settings.command.disable').replace('(command)', parsed[1]), sender)
    })
  } catch (e) {
    global.commons.sendMessage(translate('settings.command.disableParse'), sender)
  }
}

Configuration.prototype.enableCmd = function (self, sender, text) {
  try {
    var parsed = text.match(/^(\w+)$/)
    global.botDB.remove({_id: 'disabled_' + parsed[1], command: parsed[1]}, {}, function (err, numRemoved) {
      if (err) log.error(err)
      var message = (numRemoved === 0 ? translate('settings.command.notDisabled') : translate('settings.command.enable'))
      global.commons.sendMessage(message.replace('(command)', parsed[1]), sender)
    })
  } catch (e) {
    global.commons.sendMessage(translate('settings.command.enableParse'), sender)
  }
}

Configuration.prototype.isDisabledCmd = function (self, id, sender, text) {
  try {
    var parsed = text.match(/^!(\w+)/)
    global.botDB.findOne({_id: 'disabled_' + parsed[1]}, function (err, item) {
      if (err) log.error(err)
      if (!_.isNull(item)) { global.updateQueue(id, false) }
      else { global.updateQueue(id, true) }
    })
  } catch (err) {
    global.updateQueue(id, true) // it's not a command -> not disabled
  }

}

module.exports = Configuration

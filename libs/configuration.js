'use strict'

var constants = require('./constants')
var _ = require('lodash')
const debug = require('debug')('configuration')

function Configuration () {
  this.config = null
  this.cfgL = {}
  this.default = {}

  global.parser.register(this, '!set list', this.listSets, constants.OWNER_ONLY)
  global.parser.register(this, '!set', this.setValue, constants.OWNER_ONLY)

  this.register('lang', '', 'string', 'en')
  this.register('mute', 'core.mute', 'bool', false)

  this.register('disableWhisperListener', 'whisper.settings.disableWhisperListener', 'bool', true)
  this.register('disableSettingsWhispers', 'whisper.settings.disableSettingsWhispers', 'bool', false)

  const self = this
  setTimeout(function () { global.log.info('Bot is loading configuration data'); self.loadValues() }, 2000)
}

Configuration.prototype.get = function () {
  return this.config
}

Configuration.prototype.register = function (cfgName, success, filter, defaultValue) {
  this.cfgL[cfgName] = {success: success, value: defaultValue, filter: filter}
  this.default[cfgName] = {value: defaultValue}
}

Configuration.prototype.setValue = async function (self, sender, text, quiet) {
  try {
    var cmd = text.split(' ')[0]
    var value = text.replace(text.split(' ')[0], '').trim()
    var filter = self.cfgL[cmd].filter
    quiet = _.isBoolean(quiet) ? quiet : false

    if (value.length === 0) value = self.default[cmd].value
    debug('filter: %s', filter)
    debug('key: %s', cmd)
    debug('value to set: %s', value)
    debug('text: %s', text)
    debug('isQuiet: %s', quiet)

    if (_.isString(value)) value = value.trim()
    if (filter === 'number' && Number.isInteger(parseInt(value, 10))) {
      value = parseInt(value, 10)

      await global.db.engine.update('settings', { key: cmd }, { key: cmd, value: value })
      if (!quiet) global.commons.sendToOwners(global.translate(self.cfgL[cmd].success).replace(/\$value/g, value))

      self.cfgL[cmd].value = value
    } else if (filter === 'bool' && (value === 'true' || value === 'false' || _.isBoolean(value))) {
      value = !_.isBoolean(value) ? (value.toLowerCase() === 'true') : value

      await global.db.engine.update('settings', { key: cmd }, { key: cmd, value: value })
      if (!quiet) global.commons.sendToOwners(global.translate(self.cfgL[cmd].success + '.' + value).replace(/\$value/g, value))

      self.cfgL[cmd].value = value
    } else if (filter === 'string' && !(value === 'true' || value === 'false' || _.isBoolean(value)) && !Number.isInteger(parseInt(value, 10))) {
      self.cfgL[cmd].value = value
      if (cmd === 'lang') {
        if (!quiet) global.commons.sendToOwners(global.translate('core.lang-selected'))
        global.panel.io.emit('lang', global.translate({root: 'webpanel'}))
      }
      await global.db.engine.update('settings', { key: cmd }, { key: cmd, value: value })
      if (cmd !== 'lang' && !quiet) global.commons.sendToOwners(global.translate(self.cfgL[cmd].success).replace(/\$value/g, value))
    } else global.commons.sendMessage('Sorry, $sender, cannot parse !set command.', sender)

    let emit = {}
    _.each(self.sets(self), function (key) {
      emit[key] = self.getValue(key)
    })
    global.panel.io.emit('configuration', emit)
  } catch (err) {
    console.log(err)
    global.commons.sendMessage('Sorry, $sender, cannot parse !set command.', sender)
  }
}

Configuration.prototype.sets = function (self) {
  return Object.keys(self.cfgL).map(function (item) { return item })
}

Configuration.prototype.listSets = function (self, sender, text) {
  var setL = self.sets(self).join(', ')
  global.commons.sendMessage(setL.length === 0 ? 'Sorry, $sender, you cannot configure anything' : 'List of possible settings: ' + setL, sender)
}

Configuration.prototype.getValue = function (cfgName) {
  return this.cfgL[cfgName].value
}

Configuration.prototype.loadValues = async function () {
  var self = this
  let config = await global.db.engine.find('settings')
  _.each(config, function (obj) {
    if (!_.isUndefined(self.cfgL[obj.key])) self.cfgL[obj.key].value = obj.value
  })
  global.log.info('Bot loaded configuration data')
}

module.exports = Configuration

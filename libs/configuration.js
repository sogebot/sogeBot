'use strict'

const constants = require('./constants')
const _ = require('lodash')
const config = require('../config.json')
const debug = require('debug')('configuration')

function Configuration () {
  this.config = null
  this.cfgL = {}
  this.default = {}

  global.parser.register(this, '!set list', this.listSets, constants.OWNER_ONLY)
  global.parser.register(this, '!set', this.setValue, constants.OWNER_ONLY)
  global.parser.register(this, '!_debug', this.debug, constants.OWNER_ONLY)

  this.register('lang', '', 'string', 'en')
  this.register('mute', 'core.mute', 'bool', false)

  this.register('disableWhisperListener', 'whisper.settings.disableWhisperListener', 'bool', true)
  this.register('disableSettingsWhispers', 'whisper.settings.disableSettingsWhispers', 'bool', false)

  const self = this
  setTimeout(function () { global.log.info('Bot is loading configuration data'); self.loadValues() }, 2000)
}

Configuration.prototype.debug = async function (self, sender) {
  let [api, widgets] = await Promise.all([
    global.db.engine.find('APIStats'),
    global.db.engine.find('widgets')
  ])

  let stats = {
    'helix': {
      'total': _.size(_.filter(api, (o) => o.api === 'helix')),
      'errors': _.size(_.filter(api, (o) => o.api === 'helix' && o.code !== 200))
    },
    'kraken': {
      'total': _.size(_.filter(api, (o) => o.api === 'kraken')),
      'errors': _.size(_.filter(api, (o) => o.api === 'kraken' && o.code !== 200))
    },
    'tmi': {
      'total': _.size(_.filter(api, (o) => o.api === 'tmi')),
      'errors': _.size(_.filter(api, (o) => o.api === 'tmi' && o.code !== 200))
    }
  }

  let oauth = {
    broadcaster: _.isNil(config.settings.broadcaster_oauth) || !config.settings.broadcaster_oauth.match(/oauth:[\w]*/),
    bot: _.isNil(config.settings.bot_oauth) || !config.settings.bot_oauth.match(/oauth:[\w]*/)
  }

  global.log.debug(`======= COPY DEBUG MESSAGE FROM HERE =======`)
  global.log.debug(`GENERAL | OS: ${process.env.npm_config_user_agent} | DB: ${config.database.type} | Bot version: ${process.env.npm_package_version} | Bot uptime: ${process.uptime()} | Bot lang: ${global.configuration.getValue('lang')} | Bot mute: ${global.configuration.getValue('mute')}`)
  global.log.debug(`SYSTEMS | ${_.keys(_.pickBy(config.systems)).join(', ')}`)
  global.log.debug(`WIDGETS | ${_.map(widgets, 'widget').join(', ')}`)
  global.log.debug(`API | HELIX ${stats.helix.total}/${stats.helix.errors} | KRAKEN ${stats.kraken.total}/${stats.kraken.errors} | TMI ${stats.tmi.total}/${stats.tmi.errors}`)
  global.log.debug(`WEBHOOKS | ${_.keys(_.pickBy(global.webhooks.enabled)).join(', ')}`)
  global.log.debug(`OAUTH | BOT ${!oauth.bot} | BROADCASTER ${!oauth.broadcaster}`)
  global.log.debug(`QUEUE: ${JSON.stringify(global.parser.getQueue())}`)
  global.log.debug('======= END OF DEBUG MESSAGE =======')
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
  let settings = await global.db.engine.find('settings')
  _.each(settings, function (obj) {
    if (!_.isUndefined(self.cfgL[obj.key])) self.cfgL[obj.key].value = obj.value
  })
  global.log.info('Bot loaded configuration data')

  global.client.connect()
  if (_.get(config, 'settings.broadcaster_oauth', '').match(/oauth:[\w]*/)) {
    global.broadcasterClient.connect()
  } else {
    global.log.error('Broadcaster oauth is not properly set - hosts will not be loaded')
    global.log.error('Broadcaster oauth is not properly set - subscribers will not be loaded')
  }
}

module.exports = Configuration

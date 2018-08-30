'use strict'

const constants = require('./constants')
const _ = require('lodash')
const config = require('@config')
const debug = require('debug')

const DEBUG_CONFIGURATION_SETVALUE = debug('configuration:setValue')

class Configuration {
  constructor () {
    this.config = null
    this.cfgL = {}
    this.default = {}

    this.register('mute', 'core.mute', 'bool', false)
    this.register('disableWhisperListener', 'whisper.settings.disableWhisperListener', 'bool', true)
    this.register('disableSettingsWhispers', 'whisper.settings.disableSettingsWhispers', 'bool', false)
  }

  commands () {
    return [
      { this: this, id: '!set list', command: '!set list', fnc: this.listSets, permission: constants.OWNER_ONLY },
      { this: this, id: '!set', command: '!set', fnc: this.setValue, permission: constants.OWNER_ONLY },
      { this: this, id: '!_debug', command: '!_debug', fnc: this.debug, permission: constants.OWNER_ONLY },
      { this: this, id: '!enable', command: '!enable', fnc: this.enable, permission: constants.OWNER_ONLY },
      { this: this, id: '!disable', command: '!disable', fnc: this.disable, permission: constants.OWNER_ONLY }
    ]
  }

  async debug () {
    let widgets = await global.db.engine.find('widgets')

    let oauth = {
      broadcaster: _.isNil(config.settings.broadcaster_oauth) || !config.settings.broadcaster_oauth.match(/oauth:[\w]*/),
      bot: _.isNil(config.settings.bot_oauth) || !config.settings.bot_oauth.match(/oauth:[\w]*/)
    }

    const lang = await global.configuration.getValue('lang')
    const mute = await global.configuration.getValue('mute')

    let enabledSystems = {}
    for (let category of ['systems', 'games']) {
      if (_.isNil(enabledSystems[category])) enabledSystems[category] = []
      for (let system of Object.keys(global[category]).filter(o => !o.startsWith('_'))) {
        if (!global[category][system].settings) continue
        let [enabled, areDependenciesEnabled, isDisabledByEnv] = await Promise.all([
          global[category][system].settings.enabled,
          global[category][system]._dependenciesEnabled(),
          !_.isNil(process.env.DISABLE) && (process.env.DISABLE.toLowerCase().split(',').includes(system.toLowerCase()) || process.env.DISABLE === '*')
        ])
        if (!enabled || !areDependenciesEnabled || isDisabledByEnv) continue
        enabledSystems[category].push(system)
      }
    }

    global.log.debug('======= COPY DEBUG MESSAGE FROM HERE =======')
    global.log.debug(`GENERAL | OS: ${process.env.npm_config_user_agent} | DB: ${config.database.type} | Bot version: ${process.env.npm_package_version} | Bot uptime: ${process.uptime()} | Bot lang: ${lang} | Bot mute: ${mute}`)
    global.log.debug(`SYSTEMS | ${enabledSystems.systems.join(', ')}`)
    global.log.debug(`GAMES   | ${enabledSystems.games.join(', ')}`)
    global.log.debug(`WIDGETS | ${_.map(widgets, 'id').join(', ')}`)
    global.log.debug(`OAUTH   | BOT ${!oauth.bot} | BROADCASTER ${!oauth.broadcaster}`)
    global.log.debug('======= END OF DEBUG MESSAGE =======')
  }

  get () {
    return this.config
  }

  register (cfgName, success, filter, defaultValue) {
    debug('configuration:register')(`Registering ${cfgName}:${filter} with default value ${defaultValue}`)
    this.cfgL[cfgName] = { success: success, value: defaultValue, filter: filter }
    this.default[cfgName] = { value: defaultValue }
  }

  async setValue2 (opts) {
    // get value so we have a type
    let splitted = opts.parameters.split(' ')
    const pointer = splitted.shift()
    let newValue = splitted.join(' ')
    let currentValue = await _.get(global, pointer, undefined)
    if (typeof currentValue !== 'undefined') {
      if (_.isBoolean(currentValue)) {
        newValue = newValue.toLowerCase().trim()
        if (['true', 'false'].includes(newValue)) {
          _.set(global, pointer, newValue === 'true')
          global.commons.sendMessage(`$sender, ${pointer} set to ${newValue}`, opts.sender)
        } else {
          global.commons.sendMessage('$sender, !set error: bool is expected', opts.sender)
        }
      } else if (_.isNumber(currentValue)) {
        if (_.isFinite(Number(newValue))) {
          _.set(global, pointer, Number(newValue))
          global.commons.sendMessage(`$sender, ${pointer} set to ${newValue}`, opts.sender)
        } else {
          global.commons.sendMessage('$sender, !set error: number is expected', opts.sender)
        }
      } else if (_.isString(currentValue)) {
        _.set(global, pointer, newValue)
        global.commons.sendMessage(`$sender, ${pointer} set to '${newValue}'`, opts.sender)
      } else {
        global.commons.sendMessage(`$sender, ${pointer} is not supported settings to change`, opts.sender)
      }
    } else global.commons.sendMessage(`$sender, ${pointer} settings not exists`, opts.sender)
  }

  async setValue (opts) {
    try {
      if (opts.parameters.includes('.')) return this.setValue2(opts)

      var cmd = opts.parameters.split(' ')[0]
      DEBUG_CONFIGURATION_SETVALUE('cmd: %s', cmd)
      var value = opts.parameters.replace(opts.parameters.split(' ')[0], '').trim()
      var filter = this.cfgL[cmd].filter
      opts.quiet = _.isBoolean(opts.quiet) ? opts.quiet : false

      if (value.length === 0) value = this.default[cmd].value
      DEBUG_CONFIGURATION_SETVALUE('filter: %s', filter)
      DEBUG_CONFIGURATION_SETVALUE('key: %s', cmd)
      DEBUG_CONFIGURATION_SETVALUE('value to set: %s', value)
      DEBUG_CONFIGURATION_SETVALUE('text: %s', opts.parameters)
      DEBUG_CONFIGURATION_SETVALUE('isQuiet: %s', opts.quiet)

      if (_.isString(value)) value = value.trim()
      if (filter === 'number' && Number.isInteger(parseInt(value, 10))) {
        value = parseInt(value, 10)

        await global.db.engine.update('settings', { key: cmd }, { key: cmd, value: value })
        if (!opts.quiet) global.commons.sendToOwners(global.translate(this.cfgL[cmd].success).replace(/\$value/g, value))

        this.cfgL[cmd].value = value
      } else if (filter === 'bool' && (value === 'true' || value === 'false' || _.isBoolean(value))) {
        value = !_.isBoolean(value) ? (value.toLowerCase() === 'true') : value

        await global.db.engine.update('settings', { key: cmd }, { key: cmd, value: value })
        if (!opts.quiet) global.commons.sendToOwners(global.translate(this.cfgL[cmd].success + '.' + value).replace(/\$value/g, value))

        this.cfgL[cmd].value = value
      } else if (filter === 'string' && !(value === 'true' || value === 'false' || _.isBoolean(value)) && !Number.isInteger(parseInt(value, 10))) {
        this.cfgL[cmd].value = value
        await global.db.engine.update('settings', { key: cmd }, { key: cmd, value: value })
        if (cmd === 'lang') {
          process.send({ type: 'lang' })
          await global.lib.translate._load()
          if (!opts.quiet) global.commons.sendToOwners(global.translate('core.lang-selected'))
        }
        if (cmd !== 'lang' && !opts.quiet) global.commons.sendToOwners(global.translate(this.cfgL[cmd].success).replace(/\$value/g, value))
      } else global.commons.sendMessage('Sorry, $sender, cannot parse !set command.', opts.sender)

      let emit = {}
      _.each(this.sets(), async (key) => {
        emit[key] = await this.getValue(key)
      })
    } catch (err) {
      global.commons.sendMessage('Sorry, $sender, cannot parse !set command.', opts.sender)
    }
  }

  sets () {
    return Object.keys(this.cfgL).map(function (item) { return item })
  }

  listSets (opts) {
    var setL = this.sets(this).join(', ')
    global.commons.sendMessage(setL.length === 0 ? 'Sorry, $sender, you cannot configure anything' : 'List of possible settings: ' + setL, opts.sender)
  }

  async getValue (cfgName) {
    let item = await global.db.engine.findOne('settings', { key: cfgName })
    try {
      if (_.isEmpty(item)) return this.cfgL[cfgName].value // return default value if not saved
      if (_.includes(['true', 'false'], item.value.toString().toLowerCase())) return item.value.toString().toLowerCase() === 'true'
      else return item.value
    } catch (e) {
      global.log.error(`Error when loading ${cfgName} value`)
      global.log.error(e.stack)
      return null
    }
  }

  async setStatus (opts) {
    if (opts.parameters.trim().length === 0) return
    try {
      let [type, name] = opts.parameters.split(' ')

      if (type === 'system') type = 'systems'
      else if (type === 'game') type = 'games'
      else throw new Error('Not supported')

      if (_.isNil(global[type][name])) throw new Error(`Not found - ${type} - ${name}`)

      global[type][name].status({ state: opts.enable })
    } catch (e) {
      global.log.error(e.message)
    }
  }

  async enable (opts) {
    opts.enable = true
    this.setStatus(opts)
  }

  async disable (opts) {
    opts.enable = false
    this.setStatus(opts)
  }
}

module.exports = Configuration

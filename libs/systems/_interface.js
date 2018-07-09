const _ = require('lodash')
const chalk = require('chalk')
const cluster = require('cluster')
const Timeout = require('../timeout')
const constants = require('../constants')

class System {
  constructor (opts) {
    this.collection = opts.collection || {}
    this.dependsOn = opts.dependsOn || []
    this.socket = null

    this._settings = {}
    this._commands = []
    this._name = 'systems'

    // populate this._settings
    this._prepare(opts.settings)
    this._sockets()
    this.status()
  }

  _sockets () {
    if (_.isNil(global.panel)) return new Timeout().recursive({ this: this, uid: `${this.constructor.name}.sockets`, wait: 1000, fnc: this._sockets })
    else if (cluster.isMaster) {
      this.socket = global.panel.io.of('/system/' + this.constructor.name)
      if (!_.isNil(this.sockets)) this.sockets()
    }
  }

  _prepare (settingsArg) {
    if (_.isNil(this.collection.settings)) throw Error('This system doesn\'t have collection.settings defined')

    // add enabled if not set
    if (_.isNil(settingsArg.enabled)) settingsArg.enabled = true

    for (let [category, values] of Object.entries(settingsArg)) {
      if (_.isNil(this._settings[category])) this._settings[category] = {} // init if not existing
      if (_.isArray(values)) {
        for (let key of values) {
          if (category === 'commands') {
            this._commands.push(key)
            key = _.isObjectLike(key) ? key.name : key
          } else if (_.isObjectLike(key)) throw Error('You can have only one nested item deep')
          this._settings[category][key] = () => {
            return new Promise(async (resolve, reject) => {
              const currentValue = await global.db.engine.findOne(this.collection.settings, { category, key })
              resolve(_.isNil(currentValue.value) ? key : currentValue.value)
            })
          }

          if (_.isNil(this.settings)) this.settings = {}
          if (_.isNil(this.settings[category])) this.settings[category] = {}
          Object.defineProperty(this.settings[category], `${key}`, {
            get: () => this._settings[category][key](),
            set: (value) => global.db.engine.update(this.collection.settings, { category, key }, { value })
          })
        }
      } else if (_.isString(values) || _.isBoolean(values) || _.isNumber(values)) {
        const key = values
        this._settings[category] = () => {
          return new Promise(async (resolve, reject) => {
            const currentValue = await global.db.engine.findOne(this.collection.settings, { category })
            resolve(_.isNil(currentValue.value) ? key : currentValue.value)
          })
        }

        if (_.isNil(this.settings)) this.settings = {}
        if (_.isNil(this.settings[category])) this.settings[category] = null
        Object.defineProperty(this.settings, `${category}`, {
          get: () => this._settings[category](),
          set: (value) => global.db.engine.update(this.collection.settings, { category, key }, { value })
        })
      } else throw Error(`This variable type cannot be used here ${typeof values}`)
    }
  }

  async _dependenciesEnabled () {
    let status = []
    for (let dependency of this.dependsOn) {
      let dependencyPointer = _.get(global, dependency, null)
      if (!dependencyPointer || !_.isFunction(dependencyPointer.status)) status.push(false)
      else status.push(await dependencyPointer.status())
    }
    return status.length === 0 || _.every(status)
  }

  async status (state) {
    const areDependenciesEnabled = await this._dependenciesEnabled()
    const isMasterAndStatusOnly = cluster.isMaster && _.isNil(state)
    const isStatusChanged = !_.isNil(state)
    const isDisabledByEnv = process.env.DISABLE &&
      (process.env.DISABLE.toLowerCase().split(',').includes(this.constructor.name.toLowerCase()) || process.env.DISABLE === '*')

    if (!areDependenciesEnabled || isDisabledByEnv) state = false // force disable if dependencies are disabled or disabled by env
    else if (_.isNil(state)) state = await this.settings.enabled
    else this.settings.enabled = state

    if (isMasterAndStatusOnly || isStatusChanged) {
      if (isDisabledByEnv) global.log.info(`${chalk.red('DISABLED BY ENV')}: ${this.constructor.name} (${this._name})`)
      else global.log.info(`${state ? chalk.green('ENABLED') : chalk.red('DISABLED')}: ${this.constructor.name} (${this._name})`)
    }
    return state
  }

  addMenu (opts) {
    if (_.isNil(global.panel)) return new Timeout().recursive({ this: this, uid: `${this.constructor.name}.addMenu`, wait: 1000, fnc: this.addMenu, args: [opts] })
    global.panel.addMenu(opts)
  }

  async getAllSettings () {
    let promisedSettings = {}
    for (let [category, values] of Object.entries(this._settings)) {
      if (_.isObject(values) && !_.isFunction(values)) {
        if (_.isNil(promisedSettings[category])) promisedSettings[category] = {} // init if not existing
        for (let [key, getValue] of Object.entries(values)) {
          promisedSettings[category][key] = await getValue()
        }
      } else if (_.isFunction(values)) {
        promisedSettings[category] = await this._settings[category]()
      } else throw Error(`Unexpected data type ${typeof values}`)
    }
    return promisedSettings
  }

  async commands () {
    if (await this.isEnabled()) {
      let commands = []
      for (let command of this._commands) {
        if (typeof command === 'string') {
          let fnc = 'main'
          if (command.split(' ').length > 1) {
            fnc = ''
            let _fnc = command.split(' ')[1].split('-')
            for (let part of _fnc) {
              if (fnc.length === 0) fnc = part
              else {
                fnc = fnc + part.charAt(0).toUpperCase() + part.slice(1)
              }
            }
          }
          commands.push({
            this: this,
            id: command,
            command: await this.settings.commands[command],
            fnc: this[fnc],
            permission: constants.VIEWERS,
            isHelper: false
          })
        } else if (typeof command === 'object') {
          if (_.isNil(command.name)) throw Error('Command name must be defined')

          // if fnc is not set
          if (_.isNil(command.fnc)) {
            command.fnc = 'main'
            if (command.name.split(' ').length > 1) {
              command.fnc = ''
              let _fnc = command.name.split(' ')[1].split('-')
              for (let part of _fnc) {
                if (command.fnc.length === 0) command.fnc = part
                else {
                  command.fnc = command.fnc + part.charAt(0).toUpperCase() + part.slice(1)
                }
              }
            }
          }
          command.permission = _.isNil(command.permission) ? constants.VIEWERS : command.permission
          command.command = _.isNil(command.command) ? await this.settings.commands[command.name] : command.command
          commands.push({
            this: this,
            id: command.name,
            command: command.command,
            fnc: this[command.fnc],
            permission: command.permission,
            isHelper: command.isHelper ? command.isHelper : false
          })
        }
      }
      return commands
    } else return []
  }

  async isEnabled () {
    return this.status()
  }
}

module.exports = System

const _ = require('lodash')
const chalk = require('chalk')
const cluster = require('cluster')
const Timeout = require('../timeout')

class System {
  constructor (opts) {
    this.collection = opts.collection || {}
    this.dependsOn = opts.dependsOn || []
    this.socket = null
    this._settings = {}

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

    // add enabled
    settingsArg.enabled = true

    for (let [category, values] of Object.entries(settingsArg)) {
      if (_.isNil(this._settings[category])) this._settings[category] = {} // init if not existing
      if (_.isArray(values)) {
        for (let key of values) {
          if (_.isObjectLike(key)) throw Error('You can have only one nested item deep')
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
      } else if (_.isString(values) || _.isBoolean(values)) {
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

    if (!areDependenciesEnabled) state = false // force disable if dependencies are disabled
    else if (_.isNil(state)) state = await this.settings.enabled
    else this.settings.enabled = state

    if (isMasterAndStatusOnly || isStatusChanged) {
      global.log.info(`${state ? chalk.green('ENABLED') : chalk.red('DISABLED')}: ${this.constructor.name} System`)
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

  async isEnabled () {
    return this.settings.enabled
  }
}

module.exports = System

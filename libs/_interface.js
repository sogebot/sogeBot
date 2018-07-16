const _ = require('lodash')
const chalk = require('chalk')
const cluster = require('cluster')
const Timeout = require('./timeout')
const constants = require('./constants')

class Module {
  constructor (opts) {
    this.dependsOn = opts.dependsOn || []
    this.socket = null

    this._settings = {}
    this._commands = []
    this._parsers = []
    this._name = opts.name || 'library'

    this.collection = new Proxy({}, {
      get: (target, name, receiver) => {
        if (_.isSymbol(name)) return undefined
        let collection = ''
        if (name === 'data') collection = `${this._name}.${this.constructor.name.toLowerCase()}`
        else collection = `${this._name}.${this.constructor.name.toLowerCase()}.${name}`
        return collection
      }
    })

    // populate this._settings
    this._prepare(opts.settings)
    this._sockets()
    this.status()
  }
  _sockets () {
    if (_.isNil(global.panel)) return new Timeout().recursive({ this: this, uid: `${this.constructor.name}.sockets`, wait: 1000, fnc: this._sockets })
    else if (cluster.isMaster) {
      this.socket = global.panel.io.of('/system/' + this.constructor.name.toLowerCase())
      if (!_.isNil(this.sockets)) this.sockets()

      // default socket listeners
      this.socket.on('connection', (socket) => {
        socket.on('settings', async (cb) => {
          cb(null, await this.getAllSettings())
        })
        socket.on('settings.update', async (data, cb) => {
          for (let [key, value] of Object.entries(data)) {
            if (key === 'enabled' && this._name === 'library') continue
            else if (key === 'enabled') this.status({ state: value })
            else if (key === 'commands') {
              for (let [defaultValue, currentValue] of Object.entries(value)) {
                this.settings.commands[defaultValue] = currentValue
              }
            } else {
              this.settings[key] = value
            }
          }
          setTimeout(() => cb(null), 1000)
        })
        socket.on('update', async (items, cb) => {
          for (let item of items) {
            const _id = item._id; delete item._id
            let itemFromDb = item
            if (_.isNil(_id)) itemFromDb = await global.db.engine.insert(this.collection.data, item)
            else await global.db.engine.update(this.collection.data, { _id }, item)

            if (_.isFunction(cb)) cb(null, itemFromDb)
          }
        })
        socket.on('delete', async (_id, cb) => {
          await global.db.engine.remove(this.collection.data, { _id })
          cb(null)
        })
        socket.on('find', async (where, cb) => {
          where = where || {}
          cb(null, await global.db.engine.find(this.collection.data, where))
        })
        socket.on('findOne', async (where, cb) => {
          where = where || {}
          cb(null, await global.db.engine.findOne(this.collection.data, where))
        })
      })
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
          if (category === 'parsers') {
            this._parsers.push(key)
            continue // nothing else to do with parsers (not updateable)
          } else if (category === 'commands') {
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
        this._settings[category] = () => {
          return new Promise(async (resolve, reject) => {
            const currentValue = await global.db.engine.findOne(this.collection.settings, { category })
            resolve(_.isNil(currentValue.value) ? values : currentValue.value)
          })
        }

        if (_.isNil(this.settings)) this.settings = {}
        if (_.isNil(this.settings[category])) this.settings[category] = null
        Object.defineProperty(this.settings, `${category}`, {
          get: () => this._settings[category](),
          set: (value) => global.db.engine.update(this.collection.settings, { category }, { value })
        })
      } else if (_.isObjectLike(values)) {
        for (let [key, value] of Object.entries(values)) {
          if (_.isNil(this.settings)) this.settings = {}
          if (_.isNil(this.settings[category])) this.settings[category] = {}
          if (_.isNil(this.settings[category][key])) this.settings[category][key] = null

          this._settings[category][key] = () => {
            return new Promise(async (resolve, reject) => {
              const currentValue = await global.db.engine.find(this.collection.settings, { category, key })
              if (_.isEmpty(currentValue)) {
                resolve(value)
              } else {
                resolve(_.every(currentValue, 'isMultiValue') ? currentValue.map(o => o.value) : currentValue[0].value)
              }
            })
          }
          Object.defineProperty(this.settings[category], `${key}`, {
            get: () => this._settings[category][key](),
            set: async (values) => {
              if (_.isArray(values)) {
                const valuesFromDb = (await global.db.engine.find(this.collection.settings, { category })).map((o) => o.value)
                for (let toRemoveValue of _.difference(valuesFromDb, values)) await global.db.engine.remove(this.collection.settings, { category, key, value: toRemoveValue })
                for (let toAddValue of _.difference(values, valuesFromDb)) await global.db.engine.insert(this.collection.settings, { category, key, value: toAddValue, isMultiValue: true })
              } else {
                await global.db.engine.update(this.collection.settings, { category, key }, { value: values, isMultiValue: false })
              }
            }
          })
        }
      } else throw Error(`This variable type cannot be used here ${typeof values}`)
    }
  }

  async _dependenciesEnabled () {
    return new Promise((resolve) => {
      let check = async (retry) => {
        let status = []
        for (let dependency of this.dependsOn) {
          let dependencyPointer = _.get(global, dependency, null)
          if (!dependencyPointer || !_.isFunction(dependencyPointer.status)) {
            if (retry > 0) setTimeout(() => check(--retry), 10)
            else throw new Error(`[${this.constructor.name}] Dependency error - possibly wrong path`)
            return
          } else {
            status.push(await dependencyPointer.status({ quiet: true }))
          }
        }
        resolve(status.length === 0 || _.every(status))
      }
      check(1000)
    })
  }

  async status (opts) {
    opts = opts || {}
    if (this._name === 'library') return true

    const areDependenciesEnabled = await this._dependenciesEnabled()
    const isMasterAndStatusOnly = cluster.isMaster && _.isNil(opts.state)
    const isStatusChanged = !_.isNil(opts.state)
    const isDisabledByEnv = !_.isNil(process.env.DISABLE) &&
      (process.env.DISABLE.toLowerCase().split(',').includes(this.constructor.name.toLowerCase()) || process.env.DISABLE === '*')

    if (isStatusChanged) this.settings.enabled = opts.state
    else opts.state = await this.settings.enabled

    if (!areDependenciesEnabled || isDisabledByEnv) opts.state = false // force disable if dependencies are disabled or disabled by env

    if ((isMasterAndStatusOnly || isStatusChanged) && !opts.quiet) {
      if (isDisabledByEnv) global.log.info(`${chalk.red('DISABLED BY ENV')}: ${this.constructor.name} (${this._name})`)
      else if (areDependenciesEnabled) global.log.info(`${opts.state ? chalk.green('ENABLED') : chalk.red('DISABLED')}: ${this.constructor.name} (${this._name})`)
      else global.log.info(`${chalk.red('DISABLED BY DEP')}: ${this.constructor.name} (${this._name})`)
    }
    return opts.state
  }

  addMenu (opts) {
    if (_.isNil(global.panel)) return new Timeout().recursive({ this: this, uid: `${this.constructor.name}.addMenu`, wait: 1000, fnc: this.addMenu, args: [opts] })
    global.panel.addMenu(opts)
  }

  addWidget (...opts) {
    if (_.isNil(global.panel)) return new Timeout().recursive({ this: this, uid: `${this.constructor.name}.addWidget`, wait: 1000, fnc: this.addWidget, args: [opts] })
    global.panel.addWidget(opts[0], opts[1], opts[2])
  }

  async getAllSettings () {
    let promisedSettings = {}
    for (let [category, values] of Object.entries(this._settings)) {
      if (category === 'parsers' || category === '_') continue
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

  async parsers () {
    if (!(await this.isEnabled())) return []

    let parsers = []
    for (let parser of this._parsers) {
      const defaults = {
        permission: constants.VIEWERS,
        priority: constants.LOW
      }

      if (typeof parser === 'object') {
        if (_.isNil(parser.name)) throw Error('Parsers name must be defined')

        parser.permission = _.isNil(parser.permission) ? defaults.permission : parser.permission
        parser.priority = _.isNil(parser.priority) ? defaults.priority : parser.priority

        if (parser.dependsOn) {
          if (_.isString(parser.dependsOn)) parser.dependsOn = parser.dependsOn.split(',')
          for (let dependency of parser.dependsOn) {
            let dependencyPointer = _.get(global, dependency, null)
            // skip parser if dependency is not enabled
            if (!dependencyPointer || !_.isFunction(dependencyPointer.status) || !(await dependencyPointer.status())) continue
          }
        }

        parsers.push({
          this: this,
          name: `${this.constructor.name}.${parser.name}`,
          fnc: this[parser.name],
          permission: parser.permission,
          priority: parser.priority,
          fireAndForget: parser.fireAndForget ? parser.fireAndForget : false
        })
      } else {
        throw new Error('Parsers needs to be type of object')
      }
    }
    return parsers
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

          if (command.dependsOn) {
            if (_.isString(command.dependsOn)) command.dependsOn = command.dependsOn.split(',')
            for (let dependency of command.dependsOn) {
              let dependencyPointer = _.get(global, dependency, null)
              // skip command if dependency is not enabled
              if (!dependencyPointer || !_.isFunction(dependencyPointer.status) || !(await dependencyPointer.status())) continue
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
    return this.status({ quiet: true })
  }
}

module.exports = Module

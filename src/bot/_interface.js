const _ = require('lodash')
const chalk = require('chalk')
const cluster = require('cluster')
const constants = require('./constants')

let listeners = 0

class Module {
  timeouts = {}
  isLoaded = false

  constructor (opts) {
    /* Prepare default settings configuration
     * set enabled by default to true
     */
    opts = opts || {}
    this._settings = opts.settings || {}
    this._settings.enabled = typeof this._settings.enabled !== 'undefined' ? this._settings.enabled : true

    this.onChange = opts.onChange || {}
    this.dependsOn = opts.dependsOn || []
    this.socket = null

    this._commands = []
    this._parsers = []
    this._name = opts.name || 'core'
    this._ui = opts.ui || {}
    this._opts = opts

    this.collection = new Proxy({}, {
      get: (target, name, receiver) => {
        if (_.isSymbol(name)) return undefined
        let collection = ''
        if (name === 'data') collection = `${this._name}.${this.constructor.name.toLowerCase()}`
        else collection = `${this._name}.${this.constructor.name.toLowerCase()}.${name}`
        return collection
      }
    })

    // prepare proxies for variables
    this.threadListener()
    this.prepareCommandProxies()
    this.prepareVariableProxies()
    this.prepareParsers()
    this.loadVariableValues()
    this._sockets()
    this._cleanEmptySettingsValues()
    this._indexDbs()
    this._status()
  }

  _status (retries) {
    if (typeof retries === 'undefined') retries = 0
    if (retries === 6000) throw new Error('Something went wrong')
    if (!this.isLoaded) setTimeout(() => this._status(++retries), 10)
    else this.status({ state: this.settings.enabled }) // force status change
  }

  prepareParsers () {
    this.settings = this.settings || {}
    if (this._settings.parsers) {
      this._parsers = this._settings.parsers
    }
  }

  async loadVariableValues () {
    const variables = await global.db.engine.find(this.collection.settings)
    for (let i = 0, length = variables.length; i < length; i++) {
      if (_.has(this._opts.settings, variables[i].key) && variables[i].value !== null) _.set(this._settings, variables[i].key, variables[i].value)
      else await global.db.engine.remove(this.collection.settings, { _id: String(variables[i]._id) })
    }
    this.isLoaded = true
  }

  threadListener () {
    if (cluster.isWorker) {
      process.setMaxListeners(++listeners + 10)
      process.on('message', async (data) => {
        if (data.type === '/' + this._name + '/' + this.constructor.name.toLowerCase()) {
          _.set(this.settings, data.path, data.value)
        }
      })
    } else {
      cluster.setMaxListeners(++listeners + 10)
      cluster.on('message', (worker, data) => {
        if (data.type === '/' + this._name + '/' + this.constructor.name.toLowerCase()) {
          _.set(this.settings, data.path, data.value)
        }
      })
    }
  }

  updateSettings (key, value) {
    const proc = { type: '/' + this._name + '/' + this.constructor.name.toLowerCase(), path: key, value }

    if (cluster.isMaster) {
      global.db.engine.update(this.collection.settings, { key }, { value })
      // send to all cluster
      // eslint-disable-next-line
      for (let w of Object.entries(cluster.workers)) {
        if (w[1].isConnected()) w[1].send(proc)
      }

      if (this.onChange[key]) {
        // run onChange functions only on master
        for (let fnc of this.onChange[key]) {
          if (typeof this[fnc] === 'function') this[fnc](key, value)
          else global.log.error(`${fnc}() is not function in ${this._name}/${this.constructor.name.toLowerCase()}`)
        }
      }
    } else {
      // send to master to update
      if (process.send) process.send(proc)
    }
  }

  prepareVariableProxies () {
    // add main level proxy
    this.settings = new Proxy(this._settings, {
      get: (target, key, receiver) => {
        if (key === 'then' || key === 'toJSON') return Reflect.get(target, key, receiver) // promisify
        if (_.isSymbol(key)) return undefined // handle iterator

        if (typeof target[key] === 'object' && target[key] !== null) {
          const path = key
          return new Proxy(target[key], {
            get: (target, key, receiver) => {
              if (key === 'then' || key === 'toJSON') return Reflect.get(target, key, receiver) // promisify
              if (_.isSymbol(key)) return undefined // handle iterator
              return target[key]
            },
            set: (target, key, value) => {
              if (_.isEqual(target[key], value)) return true
              // check if types match
              // skip when saving to undefined
              if (typeof target[key] !== 'undefined') {
                // if default value is null or new value is null -> skip checks
                if (value !== null && target[key] !== null) {
                  if (typeof target[key] !== typeof value) {
                    const error = path + '.' + key + ' set failed\n\texpected:\t' + typeof target[key] + '\n\tset:     \t' + typeof value
                    // try retype if expected is number and we got string (from ui settings e.g.)
                    if (typeof target[key] === 'number') {
                      value = Number(value)
                      if (isNaN(value)) throw new Error(error)
                    } else throw new Error(error)
                  }
                }

                target[key] = value
                this.updateSettings(`${path}.${key}`, value)
              }
              return true
            }
          })
        }

        return target[key]
      },
      set: (target, key, value) => {
        if (_.isEqual(target[key], value)) return true
        // check if types match
        if (typeof target[key] !== 'undefined') {
          if (typeof target[key] !== typeof value) throw new Error(key + ' set failed\n\texpected:\t' + typeof target[key] + '\n\tset:     \t' + typeof value)
          target[key] = value
          this.updateSettings(key, value)
        }
        return true
      }
    })
  }

  prepareCommandProxies () {
    let commands = {}
    if (this._settings.commands) {
      for (let i = 0, length = this._settings.commands.length; i < length; i++) {
        let key = this._settings.commands[i]
        let permission = constants.VIEWERS
        let fnc = null
        let isHelper = false

        if (_.isObjectLike(key)) {
          permission = key.permission
          fnc = key.fnc || fnc
          isHelper = key.isHelper || false
          key = _.isObjectLike(key) ? key.name : key
        }

        // basic loadup of commands
        this._commands.push({ name: key, permission, fnc, isHelper })

        commands[key] = key // remap to default value
      }
    }
    this._settings.commands = commands
  }

  async _indexDbs () {
    if (cluster.isMaster) {
      clearTimeout(this.timeouts[`${this.constructor.name}._indexDbs`])
      if (!global.db.engine.connected) {
        this.timeouts[`${this.constructor.name}._indexDbs`] = setTimeout(() => this._indexDbs(), 1000)
      } else {
        // add indexing to settings
        global.db.engine.index({ table: this.collection.settings, index: 'key' })
      }
    }
  }

  async _cleanEmptySettingsValues () {
    clearTimeout(this.timeouts[`${this.constructor.name}._cleanEmptySettingsValues`])
    let settings = await global.db.engine.find(this.collection.settings)
    for (let setting of settings) {
      if (typeof setting.value === 'undefined') {
        await global.db.engine.remove(this.collection.settings, { _id: String(setting._id) })
      }
    }
    this.timeouts[`${this.constructor.name}._cleanEmptySettingsValues`] = setTimeout(() => this._cleanEmptySettingsValues(), 30000)
  }

  _sockets () {
    clearTimeout(this.timeouts[`${this.constructor.name}.sockets`])

    if (_.isNil(global.panel)) {
      this.timeouts[`${this.constructor.name}._sockets`] = setTimeout(() => this._sockets(), 1000)
    } else if (cluster.isMaster) {
      this.socket = global.panel.io.of('/' + this._name + '/' + this.constructor.name.toLowerCase())
      if (!_.isNil(this.sockets)) {
        this.sockets()
        this.sockets = function () {
          global.log.error('/' + this._name + '/' + this.constructor.name.toLowerCase() + ': Cannot initialize sockets second time')
        }
      }

      // default socket listeners
      this.socket.on('connection', (socket) => {
        socket.on('settings', async (cb) => {
          cb(null, await this.getAllSettings(), await this.getUI())
        })
        socket.on('settings.update', async (data, cb) => {
          try {
            for (let [key, value] of Object.entries(data)) {
              if (key === 'enabled' && this._name === 'core') continue
              else if (key === '_permissions') {
                for (let [command, currentValue] of Object.entries(value)) {
                  command = this._commands.find(o => o.name === command)
                  if (currentValue === command.permission) await global.db.engine.remove('permissions', { key: command.name })
                  else await global.db.engine.update('permissions', { key: command.name }, { permission: currentValue })
                }
              } else if (key === 'enabled') this.status({ state: value })
              else if (key === 'commands') {
                for (let [defaultValue, currentValue] of Object.entries(value)) {
                  this.settings.commands[defaultValue] = currentValue
                }
              } else {
                if (_.isObjectLike(value)) {
                  for (let [defaultValue, currentValue] of Object.entries(value)) {
                    this.settings[key][defaultValue] = currentValue
                  }
                } else this.settings[key] = value
              }
            }
          } catch (e) {
            global.log.error(e.stack)
            setTimeout(() => cb(e.stack), 1000)
          }
          setTimeout(() => cb(null), 1000)
        })
        socket.on('update', async (opts, cb) => {
          opts.collection = opts.collection || 'data'
          if (opts.collection.startsWith('_')) {
            opts.collection = opts.collection.replace('_', '')
          } else opts.collection = this.collection[opts.collection]

          if (opts.items) {
            for (let item of opts.items) {
              let itemFromDb = Object.assign({}, item)
              const _id = item._id; delete item._id
              if (_.isNil(_id)) itemFromDb = await global.db.engine.insert(opts.collection, item)
              else await global.db.engine.update(opts.collection, { _id }, item)
              if (_.isFunction(cb)) cb(null, Object.assign({ _id }, itemFromDb))
            }
          } else {
            if (_.isFunction(cb)) cb(null, [])
          }
        })
        socket.on('delete', async (opts, cb) => {
          opts.collection = opts.collection || 'data'
          if (opts.collection.startsWith('_')) {
            opts.collection = opts.collection.replace('_', '')
          } else opts.collection = this.collection[opts.collection]

          if (opts._id) {
            await global.db.engine.remove(opts.collection, { _id: opts._id })
          } else if (opts.where) {
            await global.db.engine.remove(opts.collection, opts.where)
          }

          if (_.isFunction(cb)) cb(null)
        })
        socket.on('find', async (opts, cb) => {
          opts.collection = opts.collection || 'data'
          opts.omit = opts.omit || []
          if (opts.collection.startsWith('_')) {
            opts.collection = opts.collection.replace('_', '')
          } else opts.collection = this.collection[opts.collection]

          opts.where = opts.where || {}
          if (_.isFunction(cb)) {
            let items = await global.db.engine.find(opts.collection, opts.where)
            if (opts.omit.length > 0) {
              items = items.map(o => {
                for (let omit of opts.omit) delete o[omit]
                return o
              })
            }
            cb(null, items)
          }
        })
        socket.on('findOne', async (opts, cb) => {
          opts.collection = opts.collection || 'data'
          opts.omit = opts.omit || []
          if (opts.collection.startsWith('_')) {
            opts.collection = opts.collection.replace('_', '')
          } else opts.collection = this.collection[opts.collection]

          opts.where = opts.where || {}
          if (_.isFunction(cb)) {
            let items = await global.db.engine.findOne(opts.collection, opts.where)
            if (opts.omit.length > 0) {
              items = items.map(o => {
                for (let omit of opts.omit) delete o[omit]
                return o
              })
            }
            cb(null, items)
          }
        })
      })
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
    if (this._name === 'core') return true

    const areDependenciesEnabled = await this._dependenciesEnabled()
    const isMasterAndStatusOnly = cluster.isMaster && _.isNil(opts.state)
    const isStatusChanged = !_.isNil(opts.state)
    const isDisabledByEnv = !_.isNil(process.env.DISABLE) &&
      (process.env.DISABLE.toLowerCase().split(',').includes(this.constructor.name.toLowerCase()) || process.env.DISABLE === '*')

    if (isStatusChanged) this.settings.enabled = opts.state
    else opts.state = await this.settings.enabled

    if (!areDependenciesEnabled || isDisabledByEnv) opts.state = false // force disable if dependencies are disabled or disabled by env

    // onChange handler on enabled
    if (cluster.isMaster && isStatusChanged) {
      if (this.onChange.enabled) {
        // run onChange functions only on master
        for (let fnc of this.onChange.enabled) {
          if (typeof this[fnc] === 'function') this[fnc]('enabled', opts.state)
          else global.log.error(`${fnc}() is not function in ${this._name}/${this.constructor.name.toLowerCase()}`)
        }
      }
    }

    if ((isMasterAndStatusOnly || isStatusChanged) && !opts.quiet) {
      if (isDisabledByEnv) global.log.info(`${chalk.red('DISABLED BY ENV')}: ${this.constructor.name} (${this._name})`)
      else if (areDependenciesEnabled) global.log.info(`${opts.state ? chalk.green('ENABLED') : chalk.red('DISABLED')}: ${this.constructor.name} (${this._name})`)
      else global.log.info(`${chalk.red('DISABLED BY DEP')}: ${this.constructor.name} (${this._name})`)
    }
    return opts.state
  }

  addMenu (opts) {
    if (cluster.isMaster) {
      clearTimeout(this.timeouts[`${this.constructor.name}.${opts.id}.addMenu`])

      if (_.isNil(global.panel)) {
        this.timeouts[`${this.constructor.name}.${opts.id}.addMenu`] = setTimeout(() => this.addMenu(opts), 1000)
      } else {
        global.panel.addMenu(opts)
      }
    }
  }

  addWidget (...opts) {
    if (cluster.isMaster) {
      clearTimeout(this.timeouts[`${this.constructor.name}.${opts[0]}.addWidget`])

      if (_.isNil(global.panel)) {
        this.timeouts[`${this.constructor.name}.${opts[0]}.addWidget`] = setTimeout(() => this.addWidget(opts), 1000)
      } else {
        global.panel.addWidget(opts[0], opts[1], opts[2])
      }
    }
  }

  async getAllSettings () {
    let promisedSettings = {}

    // go through expected settings
    for (let [category, values] of Object.entries(this._settings)) {
      if (category === 'parsers') continue
      promisedSettings[category] = {}

      if (!_.isObject(values)) {
        // we are expecting bool, string, number
        promisedSettings[category] = await this.settings[category]
      } else {
        // we are expecting one more layer
        for (let o of Object.entries(values)) {
          promisedSettings[category][o[0]] = await this.settings[category][o[0]]
        }
      }
    }

    // add command permissions
    promisedSettings._permissions = {}
    for (let command of this._commands) {
      const key = _.isNil(command.name) ? command : command.name
      let permission = await global.db.engine.findOne('permissions', { key })
      if (!_.isEmpty(permission)) promisedSettings._permissions[key] = permission.permission // change to custom permission
      else promisedSettings._permissions[key] = _.isNil(command.permission) ? constants.VIEWERS : command.permission
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

  async getUI () {
    // we need to go through all ui and trigger functions and delete attr if false
    let ui = _.cloneDeep(this._ui)
    for (let [k, v] of Object.entries(ui)) {
      if (typeof v.type !== 'undefined') {
        // final object
        if (typeof v.if === 'function') {
          if (!v.if()) {
            delete ui[k]
          }
        }
      } else {
        for (let [k2, v2] of Object.entries(v)) {
          if (typeof v2.if === 'function') {
            if (!v2.if()) {
              delete ui[k][k2]
            }
          }
        }
      }
    }
    return ui
  }
}

module.exports = Module

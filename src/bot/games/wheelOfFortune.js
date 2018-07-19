'use strict'

// 3rdparty libraries
const _ = require('lodash')
const chalk = require('chalk')
const debug = require('debug')
const cluster = require('cluster')

const constants = require('../constants.js')

class WheelOfFortune {
  constructor () {
    this.collection = 'games.wheelOfFortune'

    this.defaults = {
      enabled: true,
      command: '!wof',
      options: []
    }

    if (cluster.isMaster) {
      global.panel.addMenu({category: 'settings', name: 'games', id: 'games'})

      this.status()
      this.sockets()
    }
  }

  get command () {
    // return true if not set
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne(this.collection, { key: 'command' }), 'value', this.defaults.command)))
  }

  set command (value) {
    if (_.isNil(value)) value = this.defaults.command
    global.db.engine.update(this.collection, { key: 'command' }, { value })
  }

  get enabled () {
    // return true if not set
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne(this.collection, { key: 'enabled' }), 'value', this.defaults.enabled)))
  }

  set enabled (value) {
    if (_.isNil(value)) value = this.defaults.enabled
    global.db.engine.update(this.collection, { key: 'enabled' }, { value })
  }

  get options () {
    // return true if not set
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne(this.collection, { key: 'options' }), 'value', this.defaults.options)))
  }

  set options (value) {
    if (_.isNil(value)) value = this.defaults.options
    global.db.engine.update(this.collection, { key: 'options' }, { value })
  }

  async commands () {
    const [command, enabled] = await Promise.all([this.command, this.enabled])
    if (!enabled) return {}
    else {
      return [
        {this: this, id: '!wof', command, fnc: this.run, permission: constants.VIEWERS}
      ]
    }
  }

  sockets () {
    const d = debug('events:sockets')
    global.panel.io.of('/games/wheelOfFortune').on('connection', (socket) => {
      d('Socket /games/wheelOfFortune connected, registering sockets')
      socket.on('load.settings', async (callback) => {
        callback(null, {
          enabled: await this.enabled,
          command: await this.command,
          options: await this.options
        })
      })
      socket.on('set', async (attr, val) => {
        this[attr] = val
      })
      socket.on('set.default', async (attr, cb) => {
        this[attr] = this.defaults[attr]
        cb(null, this.defaults[attr])
      })
      socket.on('test.spin', async () => {
        global.panel.io.of('/games/wheelOfFortune').emit('spin', {options: await this.options, username: global.commons.getOwner()})
      })
      socket.on('win', async (index, username) => {
        let options = await this.options
        // compensate for slight delay
        setTimeout(() => {
          for (let response of options[index].responses) {
            if (response.trim().length > 0) global.commons.sendMessage(response, { username })
          }
        }, 2000)
      })
    })
  }

  async status (state) {
    let enabled
    if (_.isNil(state)) enabled = await this.enabled
    else enabled = state

    if (!enabled) {
      global.log.info(`${chalk.red('DISABLED')}: Wheel Of Fortune Game`)
    } else {
      global.log.info(`${chalk.green('ENABLED')}: Wheel Of Fortune Game`)
    }
    return enabled
  }

  async toggleEnable () {
    const state = !(await this.enabled)
    this.enabled = state
    return this.status(state)
  }

  async run (opts) {
    console.log(opts)
    if (cluster.isMaster) {
      global.panel.io.of('/games/wheelOfFortune').emit('spin', {options: await this.options, username: opts.sender.username})
    } else {
      process.send({ type: 'call', ns: 'games.wheelOfFortune', fnc: 'run', args: [opts] })
    }
  }
}

module.exports = new WheelOfFortune()

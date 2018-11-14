'use strict'

// 3rdparty libraries
const _ = require('lodash')
const io = require('socket.io-client')
const chalk = require('chalk')

class Streamlabs {
  constructor () {
    if (require('cluster').isWorker) return
    this.collection = 'integrations.streamlabs'
    this.socket = null

    global.panel.addMenu({ category: 'main', name: 'integrations', id: 'integrations' })

    this.status({ connect: true })
    this.sockets()
  }

  get enabled () {
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne(this.collection, { key: 'enabled' }), 'value', false)))
  }
  set enabled (v) {
    (async () => {
      v = !!v // force boolean
      await global.db.engine.update(this.collection, { key: 'enabled' }, { value: v })
      if (!v) this.disconnect()
      if (v) this.status({ connect: true })
    })()
  }

  get socketToken () {
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne(this.collection, { key: 'socketToken' }), 'value', null)))
  }
  set socketToken (v) {
    this.enabled = false
    global.db.engine.update(this.collection, { key: 'socketToken' }, { value: _.isNil(v) || v.trim().length === 0 ? null : v })
  }

  sockets () {
    const io = global.panel.io.of('/integrations/streamlabs')

    io.on('connection', (socket) => {
      socket.on('settings', async (callback) => {
        callback(null, {
          socketToken: await this.socketToken,
          enabled: await this.status({ log: false, connect: false })
        })
      })
      socket.on('toggle.enabled', async (cb) => {
        let enabled = await this.enabled
        this.enabled = !enabled
        cb(null, !enabled)
      })
      socket.on('set.variable', async (data, cb) => {
        try {
          this[data.key] = data.value
        } catch (e) {
          console.error(e)
        }
        cb(null, data.value)
      })
    })
  }

  async disconnect () {
    if (!_.isNil(this.socket)) this.socket.close().off()
  }

  async connect () {
    this.disconnect()
    this.socket = io.connect('https://sockets.streamlabs.com?token=' + (await this.socketToken))

    this.socket.off('reconnect_attempt').on('reconnect_attempt', () => global.log.info('streamlabs:onReconnectAttempt'))
    this.socket.off('connect').on('connect', () => {
      global.log.info('Streamlabs socket connected')
    })
    this.socket.off('disconnect').on('disconnect', () => {
      global.log.info('Streamlabs socket disconnected')
      this.socket.open()
    })

    this.socket.on('event', async (eventData) => {
      if (eventData.type === 'donation') {
        for (let event of eventData.message) {
          if (!event.isTest) {
            const id = await global.users.getIdByName(event.from.toLowerCase(), false)
            if (id) global.db.engine.insert('users.tips', { id, amount: event.amount, message: event.message, currency: event.currency, timestamp: _.now() })
            if (await global.cache.isOnline()) await global.db.engine.increment('api.current', { key: 'tips' }, { value: parseFloat(global.currency.exchange(event.amount, event.currency, global.currency.settings.currency.mainCurrency)) })
          }
          global.overlays.eventlist.add({
            type: 'tip',
            amount: event.amount,
            currency: event.currency,
            username: event.from.toLowerCase(),
            message: event.message
          })
          global.log.tip(`${event.from.toLowerCase()}, amount: ${event.amount}${event.currency}, message: ${event.message}`)
          global.events.fire('tip', { username: event.from.toLowerCase(), amount: parseFloat(event.amount).toFixed(2), message: event.message, currency: event.currency })
        }
      }
    })
  }

  async status (options) {
    options = _.defaults(options, { log: true, connect: false })
    let [enabled, socketToken] = await Promise.all([this.enabled, this.socketToken])
    enabled = !(_.isNil(socketToken)) && enabled

    let color = enabled ? chalk.green : chalk.red
    if (options.log) global.log.info(`${color(enabled ? 'ENABLED' : 'DISABLED')}: Streamlabs Integration`)

    if (options.connect) {
      enabled ? this.connect() : this.disconnect()
    }
    return enabled
  }
}

module.exports = new Streamlabs()

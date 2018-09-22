'use strict'

// 3rdparty libraries
const _ = require('lodash')
const chalk = require('chalk')

class Donationalerts {
  constructor () {
    if (require('cluster').isWorker) return
    this.collection = 'integrations.donationalerts'
    this.socket = null

    global.panel.addMenu({ category: 'main', name: 'integrations', id: 'integrations' })

    this.status()
    this.sockets()
  }

  get enabled () {
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne(this.collection, { key: 'enabled' }), 'value', false)))
  }
  set enabled (v) {
    (async () => {
      v = !!v // force boolean
      await global.db.engine.update(this.collection, { key: 'enabled' }, { value: v })
      this.status()
    })()
  }

  get clientSecret () {
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne(this.collection, { key: 'clientSecret' }), 'value', null)))
  }
  set clientSecret (v) {
    this.socket = null;

    (async () => {
      await global.db.engine.update(this.collection, { key: 'clientSecret' }, { value: _.isNil(v) || v.trim().length === 0 ? null : v })
      await this.status({ log: false })
    })()
  }

  async connect () {
    if (_.isNil(this.socket)) {
      this.socket = require('socket.io-client').connect('http://socket.donationalerts.ru:80',
        {
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: Infinity
        })
    } else this.socket.connect()

    this.socket.emit('add-user', { token: (await this.clientSecret), type: 'minor' })

    this.socket.off('connect').on('connect', () => { global.log.info('donationalerts.ru: Successfully connected socket to service') })
    this.socket.off('reconnect_attempt').on('reconnect_attempt', () => global.log.info('donationalerts.ru: Trying to reconnect to service'))
    this.socket.off('disconnect').on('disconnect', () => {
      this.socket.open()
    })

    this.socket.off('donation').on('donation', async (data) => {
      data = JSON.parse(data)
      if (parseInt(data.alert_type, 10) !== 1) return
      let additionalData = JSON.parse(data.additional_data)
      global.overlays.eventlist.add({
        type: 'tip',
        amount: data.amount,
        currency: data.currency,
        username: data.username.toLowerCase(),
        message: data.message,
        song_title: _.get(additionalData, 'media_data.title', undefined),
        song_url: _.get(additionalData, 'media_data.url', undefined)
      })
      global.events.fire('tip', { username: data.username.toLowerCase(), amount: parseFloat(data.amount).toFixed(2), message: data.message, currency: data.currency })
      global.db.engine.insert('users.tips', { username: data.username.toLowerCase(), amount: data.amount, message: data.message, currency: data.currency, timestamp: _.now() })
      if (await global.cache.isOnline()) await global.db.engine.increment('api.current', { key: 'tips' }, { value: parseFloat(global.currency.exchange(data.amount, data.currency, await global.configuration.getValue('currency'))) })
    })
  }
  sockets () {
    const io = global.panel.io.of('/integrations/donationalerts')

    io.on('connection', (socket) => {
      socket.on('settings', async (callback) => {
        callback(null, {
          clientSecret: await this.clientSecret,
          enabled: await this.status({ log: false })
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

  async status (options) {
    options = _.defaults(options, { log: true })
    let [enabled, clientSecret] = await Promise.all([this.enabled, this.clientSecret, this.clientId, this.redirectURI, this.code, this.accessToken, this.refreshToken])
    enabled = !(_.isNil(clientSecret)) && enabled

    let color = enabled ? chalk.green : chalk.red
    if (options.log) global.log.info(`${color(enabled ? 'ENABLED' : 'DISABLED')}: DonationAlerts.ru Integration`)

    if (enabled) {
      this.connect()
    } else if (!enabled) {
      if (!_.isNil(this.socket)) this.socket.disconnect()
    }
    return enabled
  }
}

module.exports = new Donationalerts()

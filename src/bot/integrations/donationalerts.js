// @flow

'use strict'

// 3rdparty libraries
const _ = require('lodash')
const chalk = require('chalk')
const constants = require('../constants.js')
const cluster = require('cluster')

// bot libraries
const Integration = require('./_interface')

class Donationalerts extends Integration {
  socket: Socket = null

  constructor () {
    const settings = {
      secretToken: ''
    }
    const ui = {
      secretToken: {
        type: 'text-input',
        secret: true
      }
    }
    const onChange = {
      enabled: ['onStateChange'],
      secretToken: ['connect']
    }
    super({ settings, onChange, ui })

    if (cluster.isMaster) {
      setInterval(() => this.connect(), constants.HOUR) // restart socket each hour
    }
  }

  onStateChange (key: String, val: String) {
    if (val) this.connect()
    else this.disconnect()
  }

  async disconnect () {
    if (this.socket !== null) {
      this.socket.removeAllListeners()
      this.socket.off()
      this.socket.close()
    }
  }

  async connect () {
    this.disconnect()

    if (this.settings.secretToken.trim() === '' || !this.settings.enabled) return

    this.socket = require('socket.io-client').connect('wss://socket.donationalerts.ru:443',
      {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity
      })

    if (this.socket !== null) {
      this.socket.on('connect', () => {
        this.socket.emit('add-user', { token: this.settings.secretToken, type: 'minor' })
        global.log.info(chalk.yellow('DONATIONALERTS.RU:') + ' Successfully connected socket to service')
      })
      this.socket.on('reconnect_attempt', () => {
        global.log.info(chalk.yellow('DONATIONALERTS.RU:') + ' Trying to reconnect to service')
      })
      this.socket.on('disconnect', () => {
        global.log.info(chalk.yellow('DONATIONALERTS.RU:') + ' Socket disconnected from service')
        this.socket.removeAllListeners()
        this.socket.off()
        this.socket.close()
        this.socket = null
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

        global.log.tip(`${data.username.toLowerCase()}, amount: ${data.amount}${data.currency}, message: ${data.message}`)
        global.events.fire('tip', { username: data.username.toLowerCase(), amount: parseFloat(data.amount).toFixed(2), message: data.message, currency: data.currency })

        if (!data._is_test_alert) {
          const id = await global.users.getIdByName(data.username.toLowerCase(), false)
          if (id) global.db.engine.insert('users.tips', { id, amount: data.amount, message: data.message, currency: data.currency, timestamp: _.now() })
          if (await global.cache.isOnline()) await global.db.engine.increment('api.current', { key: 'tips' }, { value: parseFloat(global.currency.exchange(data.amount, data.currency, global.currency.settings.currency.mainCurrency)) })
        }
      })
    }
  }
}

module.exports = new Donationalerts()

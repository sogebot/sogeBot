// @flow

'use strict'

// 3rdparty libraries
const _ = require('lodash')
const io = require('socket.io-client')
const chalk = require('chalk')

// bot libraries
const Integration = require('./_interface')

class Streamlabs extends Integration {
  socket = null

  constructor () {
    const settings = {
      socketToken: ''
    }
    const ui = {
      socketToken: {
        type: 'text-input',
        secret: true
      }
    }
    const onChange = {
      enabled: ['onStateChange'],
      socketToken: ['connect']
    }
    super({ settings, onChange, ui })
  }

  onStateChange (key, val) {
    if (val) this.connect()
    else this.disconnect()
  }

  async disconnect () {
    if (!_.isNil(this.socket)) this.socket.close().off()
  }

  async connect () {
    this.disconnect()

    if (this.settings.socketToken.trim() === '') return

    this.socket = io.connect('https://sockets.streamlabs.com?token=' + this.settings.socketToken)

    this.socket.off('reconnect_attempt').on('reconnect_attempt', () => {
      global.log.info(chalk.yellow('STREAMLABS:') + ' socket reconnecting')
    })
    this.socket.off('connect').on('connect', () => {
      global.log.info(chalk.yellow('STREAMLABS:') + ' Successfully connected socket to service')
    })
    this.socket.off('disconnect').on('disconnect', () => {
      global.log.info(chalk.yellow('STREAMLABS:') + ' socket disconnected')
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
}

module.exports = new Streamlabs()

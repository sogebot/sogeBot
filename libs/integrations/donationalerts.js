'use strict'

// 3rdparty libraries
const _ = require('lodash')

const config = require('../../config.json')

class Donationalerts {
  constructor () {
    if (global.commons.isIntegrationEnabled(this)) {
      this.connect()
    }
  }

  async connect () {
    this.socket = require('socket.io-client').connect('http://socket.donationalerts.ru:3001',
      {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity
      })
    this.socket.emit('add-user', {token: config.integrations.donationalerts.secretToken, type: 'minor'})
    this.sockets()
  }

  async sockets () {
    this.socket.on('donation', (data) => {
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
      global.events.fire('tip', { username: data.username.toLowerCase(), amount: data.amount, message: data.message, currency: data.currency })
    })
  }
}

module.exports = new Donationalerts()

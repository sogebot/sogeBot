'use strict'

// 3rdparty libraries
const config = require('../../config.json')

class Donationalerts {
  constructor () {
    if (global.commons.isIntegrationEnabled(this)) {
      this.connect()
    }
  }

  async connect () {
    this.socket = require('socket.io-client').connect('http://socket.donationalerts.ru:3001')
    this.socket.emit('add-user', {token: config.integrations.donationalerts.secretToken, type: 'minor'})
    this.sockets()
  }

  async sockets () {
    this.socket.on('donation', (data) => {
      data = JSON.parse(data)
      global.overlays.eventlist.add({
        type: 'tip',
        amount: data.amount,
        currency: data.currency,
        username: data.username.toLowerCase(),
        message: data.message
      })
      global.events.fire('tip', { username: data.username.toLowerCase(), amount: data.amount, message: data.message, currency: data.currency })
    })
  }
}

module.exports = new Donationalerts()

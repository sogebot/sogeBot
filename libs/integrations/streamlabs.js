'use strict'

// 3rdparty libraries
const snekfetch = require('snekfetch')
const _ = require('lodash')

const config = require('../../config.json')

class Streamlabs {
  constructor () {
    if (global.commons.isIntegrationEnabled(this)) {
      if (!config.integrations.streamlabs.oauth.match(/oauth:[\w]*/)) {
        console.error('Streamlabs oauth is not correct, disabling')
        return
      }

      this.connect()
    }
  }

  async connect () {
    let accessTokenFromDb = await global.db.engine.findOne('integrations.streamlabs', { key: 'accessToken' })
    let refreshTokenFromDb = await global.db.engine.findOne('integrations.streamlabs', { key: 'refreshToken' })

    if (_.isNil(accessTokenFromDb.value)) {
      // get tokens
      let tokens = await snekfetch
        .post('https://streamlabs.com/api/v1.0/token')
        .send({
          grant_type: 'authorization_code',
          client_id: 'uG8feqO86Gc8N0fOqiuZGYGsOBp2ronnjHKILOcR',
          client_secret: '014i1cwixvI4ICyoZE7707i5qsPKftOMKyGv9sz3',
          redirect_uri: 'http://oauth.sogehige.tv/',
          code: config.integrations.streamlabs.oauth.replace('oauth:', '').trim()
        })
      this.refreshToken = tokens.body.refresh_token
      this.accessToken = tokens.body.access_token
      await Promise.all([
        global.db.engine.update('integrations.streamlabs', { key: 'accessToken' }, { value: this.accessToken }),
        global.db.engine.update('integrations.streamlabs', { key: 'refreshToken' }, { value: this.refreshToken })
      ])
      setTimeout(() => this.refresh(), 300000) // init token refresh
      this.connectSocket() // connect socket
    } else {
      this.refreshToken = refreshTokenFromDb.value
      this.accessToken = accessTokenFromDb.value
      await this.refresh() // refresh instantly
      this.connectSocket() // connect socket
    }
  }

  async connectSocket () {
    let token = await snekfetch.get('https://streamlabs.com/api/v1.0/socket/token', { query: { access_token: this.accessToken } })
    this.socketToken = token.body.socket_token
    this.socket = require('socket.io-client').connect('https://sockets.streamlabs.com?token=' + this.socketToken)
    this.sockets()
  }

  async refresh () {
    let tokens = await snekfetch
      .post('https://streamlabs.com/api/v1.0/token')
      .send({
        grant_type: 'refresh_token',
        client_id: 'uG8feqO86Gc8N0fOqiuZGYGsOBp2ronnjHKILOcR',
        client_secret: '014i1cwixvI4ICyoZE7707i5qsPKftOMKyGv9sz3',
        redirect_uri: 'http://oauth.sogehige.tv/',
        refresh_token: this.refreshToken
      })
    this.accessToken = tokens.body.access_token
    this.refreshToken = tokens.body.refresh_token
    await Promise.all([
      global.db.engine.update('integrations.streamlabs', { key: 'accessToken' }, { value: this.accessToken }),
      global.db.engine.update('integrations.streamlabs', { key: 'refreshToken' }, { value: this.refreshToken })
    ])
    setTimeout(() => this.refresh(), 300000)
  }

  async sockets () {
    this.socket.on('connect', () => {
      this.socket.on('event', (eventData) => {
        if (eventData.type === 'donation') {
          for (let event of eventData.message) {
            global.overlays.eventlist.add({
              type: 'tip',
              amount: event.amount,
              currency: event.currency,
              username: event.from.toLowerCase(),
              message: event.message
            })
            global.events.fire('tip', { username: event.from.toLowerCase(), amount: event.amount, message: event.message, currency: event.currency })
          }
        }
      })
    })
  }
}

module.exports = new Streamlabs()

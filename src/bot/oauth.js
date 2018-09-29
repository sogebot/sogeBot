// @flow

'use strict'

const axios = require('axios')
const cluster = require('cluster')

const Core = require('./_interface')
const constants = require('./constants')

class OAuth extends Core {
  timeouts: Object = {}
  currentChannel: string = ''

  constructor () {
    const settings = {
      _: {
        broadcaster: '',
        bot: '',
        clientId: '',
        botId: '',
        broadcasterId: '',
        channelId: ''
      },
      general: {
        channel: '',
        owners: []
      },
      broadcaster: {
        accessToken: '',
        refreshToken: '',
        username: '',
        scopes: [
          'chat_login',
          'channel_subscriptions',
          'channel_check_subscription'
        ],
        _authenticatedScopes: []
      },
      bot: {
        accessToken: '',
        refreshToken: '',
        username: '',
        scopes: [
          'chat_login',
          'channel_editor',
          'channel_commercial',
          'clips:edit',
          'user:edit:broadcast',
          'user:read:broadcast'
        ],
        _authenticatedScopes: []
      },
      commands: []
    }

    // define special property name as readonly
    const ui = {
      broadcaster: {
        accessToken: {
          type: 'text-input',
          secret: true
        },
        refreshToken: {
          type: 'text-input',
          secret: true
        },
        username: {
          readOnly: true,
          type: 'text-input'
        },
        scopes: {
          type: 'check-list',
          current: '_authenticatedScopes'
        },
        generate: {
          type: 'link',
          href: 'https://twitchtokengenerator.com/quick/Wwv9XnaPVM',
          class: 'btn btn-primary btn-block',
          text: 'commons.generate',
          target: '_blank'
        }
      },
      bot: {
        accessToken: {
          type: 'text-input',
          secret: true
        },
        refreshToken: {
          type: 'text-input',
          secret: true
        },
        username: {
          readOnly: true,
          type: 'text-input'
        },
        scopes: {
          type: 'check-list',
          current: '_authenticatedScopes'
        },
        generate: {
          type: 'link',
          href: 'https://twitchtokengenerator.com/quick/6CEB7gfCHA',
          class: 'btn btn-primary btn-block',
          text: 'commons.generate',
          target: '_blank'
        }
      }
    }

    super({ settings, ui })

    this.addMenu({ category: 'settings', name: 'core', id: 'core' })
    this.validateOAuth('bot')
    this.validateOAuth('broadcaster')
    this.getChannelId()
    this.sendDataToClusters()
  }

  async getChannelId () {
    if (cluster.isWorker || global.mocha) return
    clearTimeout(this.timeouts['getChannelId'])

    const channel = await this.settings.general.channel
    if (this.currentChannel !== channel && channel !== '') {
      this.currentChannel = channel
      const cid = await global.users.getIdFromTwitch(channel)
      this.settings._.channelId = cid
      global.log.info('Channel ID set to ' + cid)
      global.tmi.reconnect('bot')
      global.tmi.reconnect('broadcaster')
    }

    this.timeouts['getChannelId'] = setTimeout(() => this.getChannelId(), 10000)
  }

  async sendDataToClusters () {
    clearTimeout(this.timeouts['sendDataToClusters'])
    global.commons.cached.owners = await this.settings.general.owners
    global.commons.processAll({ ns: 'commons', fnc: 'load', args: ['owners', global.commons.cached.owners] })

    global.commons.cached.broadcaster = await this.settings.broadcaster.username
    global.commons.processAll({ ns: 'commons', fnc: 'load', args: ['broadcaster', global.commons.cached.broadcaster] })

    global.commons.cached.bot = await this.settings.bot.username
    global.commons.processAll({ ns: 'commons', fnc: 'load', args: ['bot', global.commons.cached.bot] })
    this.timeouts['sendDataToClusters'] = setTimeout(() => this.sendDataToClusters(), 10000)
  }

  /*
   * Validates OAuth access tokens
   * and sets this.settings.<bot|broadcaster>.username
   * and sets this.settings.<bot|broadcaster>._scopes\
   * if invalid refreshAccessToken()
   * @param {string} type - bot or broadcaster
   *
   * Example output:
      {
        "client_id": "<your client ID>",
        "login": "<authorized user login>",
        "scopes": [
          "<requested scopes>"
        ],
        "user_id": "<authorized user ID>"
      }
    */
  async validateOAuth (type: string) {
    if (cluster.isWorker || global.mocha) return
    clearTimeout(this.timeouts[`validateOAuth-${type}`])

    const url = 'https://id.twitch.tv/oauth2/validate'
    let status = true
    try {
      if (['bot', 'broadcaster'].includes(type) && (await this.settings[type].accessToken) === '') throw new Error('no accessfresh token for ' + type)
      else if (!['bot', 'broadcaster'].includes(type)) throw new Error(`Type ${type} is not supported`)

      const request = await axios.get(url, {
        headers: {
          'Authorization': 'OAuth ' + await this.settings[type].accessToken
        }
      })
      this.settings._.clientId = request.data.client_id

      if (type === 'bot') this.settings._.botId = request.data.user_id
      else this.settings._.broadcasterId = request.data.user_id

      this.settings[type]._authenticatedScopes = request.data.scopes
      this.settings[type].username = request.data.login

      const cache = await this.settings._[type]
      if (cache !== '' && cache !== request.data.login + request.data.scopes.join(',')) {
        this.settings._[type] = request.data.login + request.data.scopes.join(',')
        global.tmi.reconnect(type) // force TMI reconnect
      }

      global.status.API = request.status === 200 ? constants.CONNECTED : constants.DISCONNECTED
    } catch (e) {
      status = false
      if ((await this.settings[type].refreshToken) !== '') this.refreshAccessToken(type)
      else {
        this.settings[type].username = ''
        this.settings[type]._authenticatedScopes = []

        if (type === 'bot') this.settings._.botId = ''
        else this.settings._.broadcasterId = ''
      }
    }
    this.timeouts[`validateOAuth-${type}`] = setTimeout(() => this.validateOAuth(type), 60000)
    return status
  }

  /*
   * Refresh OAuth access tokens - we are using twitchtokengenerator for this
   * @param {string} type - bot or broadcaster
   *
   * Example output:
      {
        "access_token": "asdfasdf",
        "refresh_token": "eyJfMzUtNDU0OC04MWYwLTQ5MDY5ODY4NGNlMSJ9%asdfasdf=",
        "scope": "viewing_activity_read"
      }
    */
  async refreshAccessToken (type: string) {
    if (cluster.isWorker) return
    global.log.warning('Refreshing access token of ' + type)
    const url = 'https://twitchtokengenerator.com/api/refresh/'
    try {
      if (['bot', 'broadcaster'].includes(type) && (await this.settings[type].refreshToken) === '') throw new Error('no refresh token for ' + type)
      else if (!['bot', 'broadcaster'].includes(type)) throw new Error(`Type ${type} is not supported`)

      const request = await axios.post(url + encodeURIComponent(await this.settings[type].refreshToken))
      this.settings[type].accessToken = request.data.token
      this.settings[type].refreshToken = request.data.refresh

      global.log.warning('Access token of ' + type + ' was refreshed.')
      return request.data.token
    } catch (e) {
      this.settings[type].username = ''
      this.settings[type]._authenticatedScopes = []

      if (type === 'bot') this.settings._.botId = ''
      else this.settings._.broadcasterId = ''

      global.log.error('Access token of ' + type + ' was not refreshed.')
    }
  }
}

module.exports = OAuth

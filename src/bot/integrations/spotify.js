// @flow

'use strict'

// 3rdparty libraries
const _ = require('lodash')
const chalk = require('chalk')
const SpotifyWebApi = require('spotify-web-api-node')
const crypto = require('crypto')
const urljoin = require('url-join')
const cluster = require('cluster')

// bot libraries
const Integration = require('./_interface')

/*
 * How to integrate:
 * 1. Create app in https://beta.developer.spotify.com/dashboard/applications
 * 1a. Set redirect URI as http://whereYouAccessDashboard.com/oauth/spotify
 * 2. Update your clientId, clientSecret, redirectURI in Integrations UI
 * 3. Authorize your user through UI
 */

class Spotify extends Integration {
  scopes: Array<String> = [ 'user-read-currently-playing', 'user-read-private', 'user-read-email' ]
  client: any = null

  constructor () {
    const settings = {
      _: {
        accessToken: '',
        refreshToken: '',
        code: '',
        currentSong: JSON.stringify({})
      },
      output: {
        format: '$song - $artist'
      },
      connection: {
        clientId: '',
        clientSecret: '',
        redirectURI: '',
        username: ''
      }
    }
    const ui = {
      connection: {
        clientId: {
          type: 'text-input',
          secret: true
        },
        clientSecret: {
          type: 'text-input',
          secret: true
        },
        username: {
          type: 'text-input',
          readOnly: true
        },
        overlay: {
          type: 'button-socket',
          on: '/integrations/spotify',
          emit: 'revoke',
          class: 'btn btn-primary btn-block',
          rawText: 'revoke'
        }
      }
    }
    const onChange = {
      enabled: ['onStateChange']
    }

    super({ settings, ui, onChange })

    if (cluster.isMaster) {
      this.timeouts.IRefreshToken = setTimeout(() => this.IRefreshToken(), 60000)
      this.timeouts.ICurrentSong = setTimeout(() => this.ICurrentSong(), 10000)
      this.timeouts.getMe = setTimeout(() => this.getMe(), 10000)
    }
  }

  onStateChange (key: string, value: string) {
    this.currentSong = JSON.stringify({})
    if (value) {
      this.connect()
      this.getMe()
    } else this.disconnect()
  }

  async getMe () {
    clearTimeout(this.timeouts['getMe'])

    try {
      if (this.settings.enabled && !_.isNil(this.client)) {
        let data = await this.client.getMe()
        this.settings.connection.username = data.body.display_name ? data.body.display_name : data.body.id
      }
    } catch (e) {
      if (e.message !== 'Unauthorized') {
        global.log.info(chalk.yellow('SPOTIFY: ') + 'Get of user failed, check your credentials')
      }
      this.settings.connection.username = ''
    }

    this.timeouts['getMe'] = setTimeout(() => this.getMe(), 30000)
  }

  async ICurrentSong () {
    clearTimeout(this.timeouts['ICurrentSong'])

    try {
      let data = await this.client.getMyCurrentPlayingTrack()
      let song = {
        song: data.body.item.name,
        artist: data.body.item.artists[0].name,
        is_playing: data.body.is_playing,
        is_enabled: await this.status({ log: false })
      }
      this.currentSong = JSON.stringify(song)
    } catch (e) {
      this.currentSong = JSON.stringify({})
    }
    this.timeouts['ICurrentSong'] = setTimeout(() => this.ICurrentSong(), 10000)
  }

  async IRefreshToken () {
    clearTimeout(this.timeouts['IRefreshToken'])

    try {
      if (!_.isNil(this.client)) {
        let data = await this.client.refreshAccessToken()
        this.settings._.accessToken = data.body['access_token']
      }
    } catch (e) {
      global.log.info(chalk.yellow('SPOTIFY: ') + 'Refreshing access token failed')
    }
    this.timeouts['IRefreshToken'] = setTimeout(() => this.IRefreshToken(), 60000)
  }

  sockets () {
    const io = global.panel.io.of('/integrations/spotify')

    io.on('connection', (socket) => {
      socket.on('state', async (callback) => {
        callback(null, await this.state)
      })
      socket.on('code', async (token, callback) => {
        this.code = token
        setTimeout(() => this.status(), 5000)
        callback(null, true)
      })
      socket.on('getMe', async (callback) => {
        callback(null, await this.getMe())
      })
      socket.on('getCurrentSong', async (callback) => {
        callback(null, await this.getCurrentSong())
      })
      socket.on('authorize', async (cb) => {
        cb(null, await this.authorizeURI())
      })
      socket.on('revoke', async (cb) => {
        this.settings._.accessToken = null
        this.settings._.refreshToken = null
        this.settings._.currentSong = JSON.stringify({})
        cb(null, null)
      })
    })
  }

  connect () {
    try {
      let error = []
      if (this.settings.connection.clientId.trim().length === 0) error.push('clientId')
      if (this.settings.connection.clientSecret.trim().length === 0) error.push('clientSecret')
      if (this.settings.connection.redirectURI.trim().length === 0) error.push('redirectURI')
      if (error.length > 0) throw new Error(error.join(', ') + 'missing')

      let url = urljoin(this.settings.connection.redirectURI, 'oauth', 'spotify')
      this.client = new SpotifyWebApi({
        clientId: this.settings.connection.clientId,
        clientSecret: this.settings.connection.clientSecret,
        redirectUri: url
      })

      try {
        if (!_.isNil(this.settings._.code) && !_.isNil(this.client)) {
          this.client.authorizationCodeGrant(this.settings._.code)
            .then((data) => {
              this.accessToken = data.body['access_token']
              this.refreshToken = data.body['refresh_token']
            })
          this.settings._.code = null
        }
        if (!_.isNil(this.client) && !_.isNil(this.settings._.accessToken)) {
          this.client.setAccessToken(this.settings._.accessToken)
          this.client.setRefreshToken(this.settings._.refreshToken)
        }
        global.log.info(chalk.yellow('SPOTIFY: ') + 'Client connected to service')
      } catch (e) {
        global.log.info(chalk.yellow('SPOTIFY: ') + 'Client connection failed')
      }
    } catch (e) {
      global.log.info(chalk.yellow('SPOTIFY: ') + e.message)
    }
  }

  disconnect () {
    this.client = null
    global.log.info(chalk.yellow('SPOTIFY: ') + 'Client disconnected from service')
  }

  authorizeURI () {
    if (_.isNil(this.client)) return null
    let state = crypto.createHash('md5').update(Math.random().toString()).digest('hex')
    this.state = state
    return this.client.createAuthorizeURL(this.scopes, state)
  }
}

module.exports = new Spotify()

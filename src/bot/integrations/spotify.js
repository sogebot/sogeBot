// @flow

'use strict'

// 3rdparty libraries
const _ = require('lodash')
const chalk = require('chalk')
const SpotifyWebApi = require('spotify-web-api-node')
const crypto = require('crypto')
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
  scopes: Array<string> = [ 'user-read-currently-playing', 'user-read-private', 'user-read-email' ]
  client: any = null

  constructor () {
    const settings = {
      _: {
        accessToken: '',
        refreshToken: '',
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
        username: {
          type: 'text-input',
          readOnly: true
        },
        clientId: {
          type: 'text-input',
          secret: true
        },
        clientSecret: {
          type: 'text-input',
          secret: true
        },
        authorize: {
          type: 'button-socket',
          on: '/integrations/spotify',
          class: 'btn btn-primary btn-block',
          text: 'integrations.spotify.settings.authorize',
          if: () => this.settings.connection.username.length === 0,
          emit: 'authorize'
        },
        revoke: {
          type: 'button-socket',
          on: '/integrations/spotify',
          if: () => this.settings.connection.username.length > 0,
          emit: 'revoke',
          class: 'btn btn-primary btn-block',
          text: 'integrations.spotify.settings.revoke'
        }
      }
    }
    const onChange = {
      enabled: ['onStateChange'],
      'connection.username': ['onUsernameChange']
    }

    super({ settings, ui, onChange })

    if (cluster.isMaster) {
      this.timeouts.IRefreshToken = setTimeout(() => this.IRefreshToken(), 60000)
      this.timeouts.ICurrentSong = setTimeout(() => this.ICurrentSong(), 10000)
      this.timeouts.getMe = setTimeout(() => this.getMe(), 10000)
    }
  }

  onUsernameChange (key: string, value: string) {
    if (value.length > 0) global.log.info(chalk.yellow('SPOTIFY: ') + `Access to account ${value} granted`)
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
        is_enabled: this.settings.enabled
      }
      this.settings._.currentSong = JSON.stringify(song)
    } catch (e) {
      this.settings._.currentSong = JSON.stringify({})
    }
    this.timeouts['ICurrentSong'] = setTimeout(() => this.ICurrentSong(), 10000)
  }

  async IRefreshToken () {
    clearTimeout(this.timeouts['IRefreshToken'])

    try {
      if (!_.isNil(this.client) && this.settings._.refreshToken) {
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
        callback(null, this.state)
      })
      socket.on('code', async (token, callback) => {
        const waitForUsername = () => {
          return new Promise((resolve, reject) => {
            let check = async (resolve) => {
              this.client.getMe()
                .then((data) => {
                  this.settings.connection.username = data.body.display_name ? data.body.display_name : data.body.id
                  resolve()
                }, () => {
                  setTimeout(() => {
                    check(resolve)
                  }, 1000)
                })
            }
            check(resolve)
          })
        }

        this.currentSong = JSON.stringify({})
        this.connect({ token })
        await waitForUsername()
        callback(null, true)
      })
      socket.on('revoke', async (cb) => {
        clearTimeout(this.timeouts['IRefreshToken'])

        const username = this.settings.connection.username
        this.client.resetAccessToken()
        this.client.resetRefreshToken()
        this.settings._.accessToken = null
        this.settings._.refreshToken = null
        this.settings.connection.username = ''
        this.settings._.currentSong = JSON.stringify({})

        global.log.info(chalk.yellow('SPOTIFY: ') + `Access to account ${username} is revoked`)

        this.timeouts['IRefreshToken'] = setTimeout(() => this.IRefreshToken(), 60000)
        cb(null, { do: 'refresh' })
      })
      socket.on('authorize', async (cb) => {
        if (
          this.settings.connection.clientId === '' ||
          this.settings.connection.clientSecret === ''
        ) {
          cb('Cannot authorize! Missing clientId or clientSecret.', null)
        } else {
          try {
            const authorizeURI = this.authorizeURI()
            if (!authorizeURI) cb('Integration must enabled to authorize')
            else {
              cb(null, { do: 'redirect', opts: [authorizeURI] })
            }
          } catch (e) {
            global.log.error(e.stack)
            cb(e.stack, null)
          }
        }
      })
    })
  }

  connect (opts: Object = {}) {
    let isNewConnection = this.client === null
    try {
      let error = []
      if (this.settings.connection.clientId.trim().length === 0) error.push('clientId')
      if (this.settings.connection.clientSecret.trim().length === 0) error.push('clientSecret')
      if (this.settings.connection.redirectURI.trim().length === 0) error.push('redirectURI')
      if (error.length > 0) throw new Error(error.join(', ') + 'missing')

      if (!this.client) {
        this.client = new SpotifyWebApi({
          clientId: this.settings.connection.clientId,
          clientSecret: this.settings.connection.clientSecret,
          redirectUri: this.settings.connection.redirectURI
        })
      }

      try {
        if (opts.token && !_.isNil(this.client)) {
          this.client.authorizationCodeGrant(opts.token)
            .then((data) => {
              this.settings._.accessToken = data.body['access_token']
              this.settings._.refreshToken = data.body['refresh_token']

              this.client.setAccessToken(this.settings._.accessToken)
              this.client.setRefreshToken(this.settings._.refreshToken)
            }, (err) => {
              if (err) global.log.info(chalk.yellow('SPOTIFY: ') + 'Getting of accessToken and refreshToken failed')
            })
        }
        if (!_.isNil(this.client) && this.settings._.accessToken && this.settings._.refreshToken) {
          this.client.setAccessToken(this.settings._.accessToken)
          this.client.setRefreshToken(this.settings._.refreshToken)
        }
        if (isNewConnection) global.log.info(chalk.yellow('SPOTIFY: ') + 'Client connected to service')
      } catch (e) {
        global.log.error(e.stack)
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

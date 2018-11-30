// @flow

'use strict'

// 3rdparty libraries
const _ = require('lodash')
const chalk = require('chalk')
const SpotifyWebApi = require('spotify-web-api-node')
const crypto = require('crypto')
const cluster = require('cluster')
const axios = require('axios')

// bot libraries
const constants = require('../constants')
const Expects = require('../expects.js')
const Integration = require('./_interface')

/*
 * How to integrate:
 * 1. Create app in https://beta.developer.spotify.com/dashboard/applications
 * 1a. Set redirect URI as http://whereYouAccessDashboard.com/oauth/spotify
 * 2. Update your clientId, clientSecret, redirectURI in Integrations UI
 * 3. Authorize your user through UI
 */

class Spotify extends Integration {
  client: any = null
  uris: Array<string> = []
  currentUris: Array<string> = []
  originalUri: string | null = null

  constructor () {
    const settings = {
      commands: [
        { name: '!spotify', permission: constants.DISABLE }
      ],
      _: {
        accessToken: '',
        refreshToken: '',
        userId: null,
        playlistId: null,
        currentSong: JSON.stringify({})
      },
      output: {
        format: '$song - $artist',
        playlistToPlay: ''
      },
      connection: {
        clientId: '',
        clientSecret: '',
        redirectURI: 'http://localhost:20000/oauth/spotify',
        username: '',
        scopes: [
          'user-read-currently-playing',
          'user-read-private',
          'user-read-email',
          'playlist-modify-public',
          'playlist-modify',
          'playlist-read-collaborative',
          'playlist-modify-private',
          'playlist-read-private',
          'user-modify-playback-state' ],
        _authenticatedScopes: []
      }
    }
    const ui = {
      connection: {
        username: {
          type: 'text-input',
          readOnly: true
        },
        scopes: {
          type: 'check-list',
          current: '_authenticatedScopes'
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
          // $FlowFixMe - flow is complaining about 'this', although its used after super
          if: () => this.settings.connection.username.length === 0,
          emit: 'authorize'
        },
        revoke: {
          type: 'button-socket',
          on: '/integrations/spotify',
          // $FlowFixMe - flow is complaining about 'this', although its used after super
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
      setInterval(() => this.sendSongs(), 500)
    }
  }

  onUsernameChange (key: string, value: string) {
    if (value.length > 0) global.log.info(chalk.yellow('SPOTIFY: ') + `Access to account ${value} granted`)
  }

  onStateChange (key: string, value: string) {
    this.settings._.currentSong = JSON.stringify({})
    if (value) {
      this.connect()
      this.getMe()
    } else this.disconnect()
  }

  async sendSongs () {
    if (!this.settings._.userId || !this.settings.enabled) {
      return
    }

    const song = JSON.parse(this.settings._.currentSong)

    // if song is not part of currentUris => save context
    if (typeof song.uri !== 'undefined' && !this.currentUris.includes(song.uri) && this.uris.length === 0) {
      this.originalUri = song.uri
    }

    // if song is part of currentUris and is playing, do nothing
    if (typeof song.uri !== 'undefined' && this.currentUris.includes(song.uri) && song.is_playing) {
      return
    }

    // if song is part of currentUris and is not playing (finished playing), continue from playlist if set
    if (typeof song.uri !== 'undefined' && this.currentUris.includes(song.uri) && !song.is_playing && this.uris.length === 0) {
      if (this.settings.output.playlistToPlay.length > 0) {
        this.currentUris = []
        try {
          // play from playlist
          const offset = this.originalUri ? { uri: this.originalUri } : undefined
          await axios({
            method: 'put',
            url: 'https://api.spotify.com/v1/me/player/play',
            headers: {
              'Authorization': 'Bearer ' + this.settings._.accessToken,
              'Content-Type': 'application/json'
            },
            data: {
              context_uri: this.settings.output.playlistToPlay,
              offset
            }
          })
          // skip to next song in playlist
          await axios({
            method: 'post',
            url: 'https://api.spotify.com/v1/me/player/next',
            headers: {
              'Authorization': 'Bearer ' + this.settings._.accessToken
            }
          })
        } catch (e) {
          global.log.error(e.stack)
        }
      }
    } else if (this.uris.length > 0) { // or we have requests
      if (Date.now() - song.finished_at <= 0 || this.originalUri !== song.uri || this.originalUri === null || !song.is_playing) { // song should be finished
        try {
          this.currentUris = [...this.uris]
          this.uris = []
          await axios({
            method: 'put',
            url: 'https://api.spotify.com/v1/me/player/play',
            headers: {
              'Authorization': 'Bearer ' + this.settings._.accessToken,
              'Content-Type': 'application/json'
            },
            data: {
              uris: this.currentUris
            }
          })

          // force is_playing and uri just to not skip until track refresh
          song.uri = this.currentUris[0]
          song.is_playing = true
          this.settings._.currentSong = JSON.stringify(song)
        } catch (e) {
          global.log.error(e.stack)
        }
      }
    }
  }

  async getMe () {
    clearTimeout(this.timeouts['getMe'])

    try {
      if (this.settings.enabled && !_.isNil(this.client)) {
        let data = await this.client.getMe()
        this.settings._.userId = data.body.id
        this.settings.connection.username = data.body.display_name ? data.body.display_name : data.body.id
      }
    } catch (e) {
      if (e.message !== 'Unauthorized') {
        global.log.info(chalk.yellow('SPOTIFY: ') + 'Get of user failed, check your credentials')
      }
      this.settings.connection.username = ''
      this.settings._.userId = null
    }

    this.timeouts['getMe'] = setTimeout(() => this.getMe(), 30000)
  }

  async ICurrentSong () {
    clearTimeout(this.timeouts['ICurrentSong'])

    try {
      if (!(await global.cache.isOnline())) throw Error('Stream is offline')
      let data = await this.client.getMyCurrentPlayingTrack()

      let currentSong = JSON.parse(this.settings._.currentSong)
      if (typeof currentSong.song === 'undefined' || currentSong.song !== data.body.item.name) {
        currentSong = {
          finished_at: Date.now() - data.body.item.duration_ms, // may be off ~10s, but its important for requests
          song: data.body.item.name,
          artist: data.body.item.artists[0].name,
          uri: data.body.item.uri,
          is_playing: data.body.is_playing,
          is_enabled: this.settings.enabled
        }
      }
      currentSong.is_playing = data.body.is_playing
      currentSong.is_enabled = this.settings.enabled
      this.settings._.currentSong = JSON.stringify(currentSong)
    } catch (e) {
      this.settings._.currentSong = JSON.stringify({})
    }
    this.timeouts['ICurrentSong'] = setTimeout(() => this.ICurrentSong(), 5000)
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

        this.settings._.currentSong = JSON.stringify({})
        this.connect({ token })
        await waitForUsername()
        callback(null, true)
      })
      socket.on('revoke', async (cb) => {
        clearTimeout(this.timeouts['IRefreshToken'])

        const username = this.settings.connection.username
        this.client.resetAccessToken()
        this.client.resetRefreshToken()
        this.settings._.userId = null
        this.settings._.accessToken = null
        this.settings._.refreshToken = null
        this.settings.connection._authenticatedScopes = []
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

      this.client = new SpotifyWebApi({
        clientId: this.settings.connection.clientId,
        clientSecret: this.settings.connection.clientSecret,
        redirectUri: this.settings.connection.redirectURI
      })

      try {
        if (opts.token && !_.isNil(this.client)) {
          this.client.authorizationCodeGrant(opts.token)
            .then((data) => {
              this.settings.connection._authenticatedScopes = data.body.scope.split(' ')
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
    return this.client.createAuthorizeURL(this.settings.connection.scopes, state)
  }

  async main (opts: CommandOptions) {
    if (!(await global.cache.isOnline())) return // don't do anything on offline stream
    if (!cluster.isMaster) {
      // we have client connected on master -> send process to master
      if (process.send) process.send({ type: 'call', ns: 'integrations.spotify', fnc: 'main', args: [opts] })
      return
    }

    try {
      let [spotifyId] = new Expects(opts.parameters)
        .everything()
        .toArray()

      if (spotifyId.startsWith('spotify:')) {
        let response = await axios({
          method: 'get',
          url: 'https://api.spotify.com/v1/tracks/' + spotifyId.replace('spotify:track:', ''),
          headers: {
            'Authorization': 'Bearer ' + this.settings._.accessToken
          }
        })
        let track = response.data
        global.commons.sendMessage(
          global.commons.prepare('integrations.spotify.song-requested', {
            name: track.name, artist: track.artists[0].name
          }), opts.sender)
        this.uris.push(spotifyId)
      } else {
        let response = await axios({
          method: 'get',
          url: 'https://api.spotify.com/v1/search?type=track&limit=1&q=' + encodeURI(spotifyId),
          headers: {
            'Authorization': 'Bearer ' + this.settings._.accessToken,
            'Content-Type': 'application/json'
          }
        })
        let track = response.data.tracks.items[0]
        global.commons.sendMessage(
          global.commons.prepare('integrations.spotify.song-requested', {
            name: track.name, artist: track.artists[0].name
          }), opts.sender)
        this.uris.push(track.uri)
      }
    } catch (e) {
      global.commons.sendMessage(
        global.commons.prepare('integrations.spotify.song-not-found'), opts.sender)
      global.log.error(e.stack)
    }
  }
}

module.exports = new Spotify()

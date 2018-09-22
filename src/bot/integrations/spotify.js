'use strict'

// 3rdparty libraries
const _ = require('lodash')
const chalk = require('chalk')
const SpotifyWebApi = require('spotify-web-api-node')
const crypto = require('crypto')
const urljoin = require('url-join')

/*
 * How to integrate:
 * 1. Create app in https://beta.developer.spotify.com/dashboard/applications
 * 1a. Set redirect URI as http://whereYouAccessDashboard.com/oauth/spotify
 * 2. Update your clientId, clientSecret, redirectURI in Integrations UI
 * 3. Authorize your user through UI
 */

class Spotify {
  constructor () {
    this.defaults = {
      format: '$song - $artist'
    }

    if (require('cluster').isWorker) return
    this.collection = 'integrations.spotify'
    this.timeouts = {}
    this.scopes = [ 'user-read-currently-playing', 'user-read-private', 'user-read-email' ]
    this.client = null

    global.panel.addMenu({ category: 'main', name: 'integrations', id: 'integrations' })

    this.status()
    this.sockets()

    this.timeouts.IRefreshToken = setTimeout(() => this.IRefreshToken(), 60000)
    this.timeouts.ICurrentSong = setTimeout(() => this.ICurrentSong(), 10000)
  }

  get format () {
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne('cache', { key: 'integration_spotify_format' }), 'value', this.defaults.format)))
  }

  set format (value) {
    if (_.isNil(value)) value = this.defaults.format
    global.db.engine.update('cache', { key: 'integration_spotify_format' }, { value })
  }

  get currentSong () {
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne('cache', { key: 'integration_spotify_currentSong' }), 'value', {})))
  }

  set currentSong (v) {
    global.db.engine.update('cache', { key: 'integration_spotify_currentSong' }, { value: v })
  }

  async getMe () {
    try {
      const enabled = await this.status({ log: false })
      if (enabled && !_.isNil(this.client)) {
        let data = await this.client.getMe()
        return data.body.display_name ? data.body.display_name : data.body.id
      } else return null
    } catch (e) {
      if (e.message !== 'Unauthorized') {
        global.log.error('Spotify user get failed')
        global.log.error(e.message)
      }
      return null
    }
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
      this.currentSong = song
    } catch (e) {
      this.currentSong = {}
    }
    this.timeouts['ICurrentSong'] = setTimeout(() => this.ICurrentSong(), 10000)
  }

  async IRefreshToken () {
    clearTimeout(this.timeouts['IRefreshToken'])

    try {
      if (!_.isNil(this.client)) {
        let data = await this.client.refreshAccessToken()
        this.accessToken = data.body['access_token']
      }
    } catch (e) {
      global.log.error('Spotify refresh token failed')
      global.log.error(e)
    }
    this.timeouts['IRefreshToken'] = setTimeout(() => this.IRefreshToken(), 60000)
  }

  get enabled () {
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne(this.collection, { key: 'enabled' }), 'value', false)))
  }
  set enabled (v) {
    (async () => {
      v = !!v // force boolean
      await global.db.engine.update(this.collection, { key: 'enabled' }, { value: v })
      if (v === false) this.currentSong = {}
      this.status()
    })()
  }

  get clientId () {
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne(this.collection, { key: 'clientId' }), 'value', null)))
  }
  set clientId (v) {
    this.accessToken = null
    this.refreshToken = null
    this.client = null;

    (async () => {
      await global.db.engine.update(this.collection, { key: 'clientId' }, { value: _.isNil(v) || v.trim().length === 0 ? null : v })
      await this.status({ log: false })
    })()
  }

  get clientSecret () {
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne(this.collection, { key: 'clientSecret' }), 'value', null)))
  }
  set clientSecret (v) {
    this.accessToken = null
    this.refreshToken = null
    this.client = null;

    (async () => {
      await global.db.engine.update(this.collection, { key: 'clientSecret' }, { value: _.isNil(v) || v.trim().length === 0 ? null : v })
      await this.status({ log: false })
    })()
  }

  get redirectURI () {
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne(this.collection, { key: 'redirectURI' }), 'value', null)))
  }
  set redirectURI (v) {
    this.accessToken = null
    this.refreshToken = null
    this.client = null;

    (async () => {
      await global.db.engine.update(this.collection, { key: 'redirectURI' }, { value: _.isNil(v) || v.trim().length === 0 ? null : v })
      await this.status({ log: false })
    })()
  }

  get code () {
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne(this.collection, { key: 'code' }), 'value', null)))
  }
  set code (v) { global.db.engine.update(this.collection, { key: 'code' }, { value: _.isNil(v) || v.trim().length === 0 ? null : v }) }

  get refreshToken () {
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne(this.collection, { key: 'refreshToken' }), 'value', null)))
  }
  set refreshToken (v) {
    if (!_.isNil(this.client)) this.client.setRefreshToken(v)
    global.db.engine.update(this.collection, { key: 'refreshToken' }, { value: _.isNil(v) || v.trim().length === 0 ? null : v })
  }

  get accessToken () {
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne(this.collection, { key: 'accessToken' }), 'value', null)))
  }
  set accessToken (v) {
    if (!_.isNil(this.client)) this.client.setAccessToken(v)
    global.db.engine.update(this.collection, { key: 'accessToken' }, { value: _.isNil(v) || v.trim().length === 0 ? null : v })
  }

  get state () {
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne(this.collection, { key: 'state' }), 'value', null)))
  }
  set state (v) { global.db.engine.update(this.collection, { key: 'state' }, { value: _.isNil(v) || v.trim().length === 0 ? null : v }) }

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
      socket.on('settings', async (callback) => {
        callback(null, {
          clientId: await this.clientId,
          clientSecret: await this.clientSecret,
          redirectURI: await this.redirectURI,
          format: await this.format,
          enabled: await this.status({ log: false })
        })
      })
      socket.on('toggle.enabled', async (cb) => {
        let enabled = await this.enabled
        this.enabled = !enabled
        cb(null, !enabled)
      })
      socket.on('set.variable', async (data, cb) => {
        this[data.key] = data.value
        cb(null, data.value)
      })
      socket.on('authorize', async (cb) => {
        cb(null, await this.authorizeURI())
      })
      socket.on('revoke', async (cb) => {
        this.accessToken = null
        this.refreshToken = null
        this.currentSong = null
        cb(null, null)
      })
    })
  }

  async status (options) {
    options = _.defaults(options, { log: true })
    let [enabled, clientSecret, clientId, redirectURI, code, accessToken, refreshToken] = await Promise.all([this.enabled, this.clientSecret, this.clientId, this.redirectURI, this.code, this.accessToken, this.refreshToken])
    enabled = !(_.isNil(clientSecret) || _.isNil(clientId) || _.isNil(redirectURI)) && enabled

    let color = enabled ? chalk.green : chalk.red
    if (options.log) global.log.info(`${color(enabled ? 'ENABLED' : 'DISABLED')}: Spotify Integration`)

    if (_.isNil(this.client) && enabled) {
      let url = urljoin(redirectURI, 'oauth', 'spotify')
      this.client = new SpotifyWebApi({
        clientId: clientId,
        clientSecret: clientSecret,
        redirectUri: url
      })
    } else if (!enabled) {
      this.client = null
    }

    try {
      if (!_.isNil(code) && !_.isNil(this.client) && enabled) {
        this.client.authorizationCodeGrant(code)
          .then((data) => {
            this.accessToken = data.body['access_token']
            this.refreshToken = data.body['refresh_token']
          })
        this.code = null
      }
      if (!_.isNil(this.client) && enabled && !_.isNil(accessToken)) {
        this.client.setAccessToken(accessToken)
        this.client.setRefreshToken(refreshToken)
      }
    } catch (e) {
      console.error(e)
    }
    return enabled
  }

  authorizeURI () {
    if (_.isNil(this.client)) return null
    let state = crypto.createHash('md5').update(Math.random().toString()).digest('hex')
    this.state = state
    return this.client.createAuthorizeURL(this.scopes, state)
  }
}

module.exports = new Spotify()

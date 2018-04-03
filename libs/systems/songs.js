'use strict'

// 3rdparty libraries
const _ = require('lodash')
const ytdl = require('ytdl-core')
const ytsearch = require('youtube-search')
// bot libraries
const config = require('../../config.json')
const constants = require('../constants')
const debug = require('debug')('systems:songs')
const cluster = require('cluster')

class Songs {
  constructor () {
    if (global.commons.isSystemEnabled(this)) {
      global.configuration.register('songs_volume', 'core.settings.songs.volume', 'number', 25)
      global.configuration.register('songs_duration', 'core.settings.songs.duration', 'number', 10)
      global.configuration.register('songs_shuffle', 'core.settings.songs.shuffle', 'bool', false)
      global.configuration.register('songs_songrequest', 'core.settings.songs.songrequest', 'bool', true)
      global.configuration.register('songs_playlist', 'core.settings.songs.playlist', 'bool', true)
      global.configuration.register('songs_notify', 'core.settings.songs.notify', 'bool', false)

      if (cluster.isMaster) {
        cluster.on('message', (worker, d) => {
          if (d.type !== 'songs') return
          this[d.fnc](this, global.panel.io)
        })

        this.getMeanLoudness(this)
        this.getToggles(this)

        global.panel.addMenu({category: 'manage', name: 'songs', id: 'songs'})
        global.panel.addWidget('ytplayer', 'widget-title-ytplayer', 'fas fa-headphones')
        global.panel.registerSockets({
          self: this,
          expose: ['togglePlaylist', 'toggleSongRequests', 'getCurrentVolume', 'send', 'setTrim', 'sendConfiguration', 'banSong', 'getSongRequests', 'stealSong', 'sendNextSongID', 'removeSongFromPlaylist', 'unbanSong']
        })
      }
    }
  }

  get meanLoudness () {
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne('cache', { key: 'songs_meanLoudness' }), 'value', -15)))
  }

  set meanLoudness (v) {
    global.db.engine.update('cache', { key: 'songs_meanLoudness' }, { value: v })
  }

  get currentSong () {
    return new Promise(async (resolve, reject) => resolve(await global.db.engine.findOne('cache', { key: 'songs_currentSong' })))
  }

  set currentSong (v) {
    delete v._id
    global.db.engine.update('cache', { key: 'songs_currentSong' }, v)
  }

  commands () {
    return !global.commons.isSystemEnabled('songs')
      ? []
      : [
        {this: this, command: '!songrequest', fnc: this.addSongToQueue, permission: constants.VIEWERS},
        {this: this, command: '!wrongsong', fnc: this.removeSongFromQueue, permission: constants.VIEWERS},
        {this: this, command: '!currentsong', fnc: this.getCurrentSong, permission: constants.VIEWERS},
        {this: this, command: '!skipsong', fnc: this.sendNextSongID, permission: constants.OWNER_ONLY},
        {this: this, command: '!bansong', fnc: this.banSong, permission: constants.OWNER_ONLY},
        {this: this, command: '!unbansong', fnc: this.unbanSong, permission: constants.OWNER_ONLY},
        {this: this, command: '!playlist add', fnc: this.addSongToPlaylist, permission: constants.OWNER_ONLY},
        {this: this, command: '!playlist remove', fnc: this.removeSongFromPlaylist, permission: constants.OWNER_ONLY},
        {this: this, command: '!playlist steal', fnc: this.stealSong, permission: constants.OWNER_ONLY},
        {this: this, command: '!playlist', fnc: this.help, permission: constants.OWNER_ONLY}
      ]
  }

  async togglePlaylist () {
    let value = (await global.configuration.getValue('songs_playlist')).toString().toLowerCase() === 'true' ? 'false' : 'true'
    global.configuration.setValue(global.configuration, { username: global.parser.getOwner() }, `songs_playlist ${value}`, true)
  }

  async toggleSongRequests () {
    let value = (await global.configuration.getValue('songs_songrequest')).toString().toLowerCase() === 'true' ? 'false' : 'true'
    global.configuration.setValue(global.configuration, { username: global.parser.getOwner() }, `songs_songrequest ${value}`, true)
  }

  async getToggles (self) {
    setInterval(async () => {
      global.panel.io.emit('songs.toggles', {
        playlist: await global.configuration.getValue('songs_playlist'),
        songrequest: await global.configuration.getValue('songs_songrequest')
      })
    }, 1000)
  }

  async getMeanLoudness (self) {
    let playlist = await global.db.engine.find('playlist')
    if (_.isEmpty(playlist)) {
      self.meanLoudness = -15
      return -15
    }

    var loudness = 0
    for (let item of playlist) {
      if (_.isNil(item.loudness)) {
        loudness = loudness + -15
      } else {
        loudness = loudness + parseFloat(item.loudness)
      }
    }
    self.meanLoudness = loudness / playlist.length
    return loudness / playlist.length
  }

  async getVolume (self, item) {
    item.loudness = !_.isNil(item.loudness) ? item.loudness : -15
    const volume = await global.configuration.getValue('songs_volume')
    var correction = Math.ceil((volume / 100) * 3)
    var loudnessDiff = parseFloat(parseFloat(await self.meanLoudness) - item.loudness)
    return Math.round(volume + (correction * loudnessDiff))
  }

  async getCurrentVolume (self, socket) {
    socket.emit('newVolume', await self.getVolume(self, await self.currentSong))
  }

  setTrim (self, socket, data) {
    global.db.engine.update('playlist', { videoID: data.id }, { startTime: data.lowValue, endTime: data.highValue })
  }

  async sendConfiguration (self, socket) {
    socket.emit('songsConfiguration', {
      volume: await global.configuration.getValue('songs_volume'),
      shuffle: await global.configuration.getValue('songs_shuffle'),
      duration: await global.configuration.getValue('songs_duration'),
      songrequest: await global.configuration.getValue('songs_songrequest'),
      playlist: await global.configuration.getValue('songs_playlist'),
      notify: await global.configuration.getValue('songs_notify')
    })
  }

  async send (self, socket) {
    if (cluster.isWorker) return process.send({ type: 'songs', fnc: 'send' })

    let playlist = await global.db.engine.find('playlist')
    _.each(playlist, async function (item) { item.volume = await self.getVolume(self, item) })
    socket.emit('songPlaylistList', _.orderBy(playlist, ['addedAt'], ['asc']))

    let bannedSongs = await global.db.engine.find('bannedsong')
    socket.emit('bannedSongsList', _.orderBy(bannedSongs, ['title'], ['asc']))
  }

  banSong (self, sender, text) {
    text.trim().length === 0 ? self.banCurrentSong(self, sender) : self.banSongById(self, sender, text.trim())
  }

  async banCurrentSong (self, sender) {
    let currentSong = await self.currentSong
    if (_.isNil(currentSong.videoID)) return

    let update = await global.db.engine.update('bannedsong', { videoId: currentSong.videoID }, { videoId: currentSong.videoID, title: currentSong.title })
    if (update.length > 0) {
      let message = await global.commons.prepare('songs.song-was-banned', { name: currentSong.title })
      debug(message); global.commons.sendMessage(message, sender)

      await Promise.all([global.db.engine.remove('playlist', { videoID: currentSong.videoID }), global.db.engine.remove('songrequest', { videoID: currentSong.videoID })])

      global.commons.timeout(currentSong.username, global.translate('songs.song-was-banned-timeout-message'), 300)
      self.getMeanLoudness(self)

      self.sendNextSongID(self)
      self.send(self)
    }
  }

  async banSongById (self, sender, text) {
    text = text.trim()
    ytdl.getInfo('https://www.youtube.com/watch?v=' + text, async function (err, videoInfo) {
      if (err) global.log.error(err, { fnc: 'Songs.prototype.banSongById#1' })
      if (_.isNil(videoInfo.title)) return

      let updated = await global.db.engine.update('bannedsong', { videoId: text }, { videoId: text, title: videoInfo.title })
      if (updated.length > 0) {
        global.commons.sendMessage(global.translate('songs.bannedSong').replace(/\$title/g, videoInfo.title), sender)

        await Promise.all([global.db.engine.remove('playlist', { videoID: text }), global.db.engine.remove('songrequest', { videoID: text })])

        const currentSong = await self.currentSong
        global.commons.timeout(currentSong.username, global.translate('songs.bannedSongTimeout'), 300)

        self.getMeanLoudness(self)
        self.sendNextSongID(self)
        self.send(self)
      }
    })
  }

  async unbanSong (self, sender, text) {
    let removed = await global.db.engine.remove('bannedsong', { videoId: text.trim() })
    if (removed > 0) global.commons.sendMessage(global.translate('songs.song-was-unbanned'), sender)
    else global.commons.sendMessage(global.translate('songs.song-was-not-banned'), sender)
  }

  async sendNextSongID (self, socket) {
    if (cluster.isWorker) return process.send({ type: 'songs', fnc: 'sendNextSongID' })
    // check if there are any requests
    if (await global.configuration.getValue('songs_songrequest')) {
      let sr = await global.db.engine.find('songrequests')
      sr = _.head(_.orderBy(sr, ['addedAt'], ['asc']))
      if (!_.isNil(sr)) {
        let currentSong = sr
        currentSong.volume = await self.getVolume(self, currentSong)
        currentSong.type = 'songrequests'
        self.currentSong = currentSong

        if (await global.configuration.getValue('songs_notify')) self.notifySong(self)
        socket.emit('videoID', currentSong)
        await global.db.engine.remove('songrequests', { videoID: sr.videoID })
        return
      }
    }

    // get song from playlist
    if (await global.configuration.getValue('songs_playlist')) {
      let pl = await global.db.engine.find('playlist')
      if (_.isEmpty(pl)) {
        socket.emit('videoID', null) // send null and skip to next empty song
        return // don't do anything if no songs in playlist
      }
      pl = _.head(_.orderBy(pl, [(await global.configuration.getValue('songs_shuffle') ? 'seed' : 'lastPlayedAt')], ['asc']))

      // shuffled song is played again
      if (await global.configuration.getValue('songs_shuffle') && pl.seed === 1) {
        self.createRandomSeeds()
        self.sendNextSongID(self, socket) // retry with new seeds
        return
      }

      await global.db.engine.update('playlist', { _id: pl._id.toString() }, { seed: 1, lastPlayedAt: new Date().getTime() })
      let currentSong = pl
      currentSong.volume = await self.getVolume(self, currentSong)
      currentSong.type = 'playlist'
      self.currentSong = currentSong

      if (await global.configuration.getValue('songs_notify')) self.notifySong(self)

      socket.emit('videoID', currentSong)
      return
    }

    // nothing to send
    socket.emit('videoID', null)
  }

  async getCurrentSong (self) {
    let translation = 'songs.no-song-is-currently-playing'
    const currentSong = await self.currentSong
    if (!_.isNil(currentSong.title)) {
      if (currentSong.type === 'playlist') translation = 'songs.current-song-from-playlist'
      else translation = 'songs.current-song-from-songrequest'
    }
    let message = await global.commons.prepare(translation, { name: currentSong.title, username: currentSong.username })
    debug(message); global.commons.sendMessage(message, {username: config.settings.broadcaster_username})
  }

  async notifySong (self) {
    var translation
    const currentSong = await self.currentSong
    if (!_.isNil(currentSong.title)) {
      if (currentSong.type === 'playlist') translation = 'songs.current-song-from-playlist'
      else translation = 'songs.current-song-from-songrequest'
    } else return
    let message = await global.commons.prepare(translation, { name: currentSong.title, username: currentSong.username })
    debug(message); global.commons.sendMessage(message, {username: config.settings.broadcaster_username})
  }

  async stealSong (self) {
    try {
      const currentSong = await self.currentSong
      self.addSongToPlaylist(self, null, currentSong.videoID)
    } catch (err) {
      global.commons.sendMessage(global.translate('songs.noCurrentSong'), {username: config.settings.broadcaster_username})
    }
  }

  async createRandomSeeds () {
    let playlist = await global.db.engine.find('playlist')
    _.each(playlist, function (item) {
      global.db.engine.update('playlist', { _id: item._id.toString() }, { seed: Math.random() })
    })
  }

  async getSongRequests (self, socket) {
    let songrequests = await global.db.engine.find('songrequests')
    socket.emit('songRequestsList', _.orderBy(songrequests, ['addedAt'], ['asc']))
  }

  help () {
    global.commons.sendMessage(global.translate('core.usage') + ': !playlist add <youtubeid> | !playlist remove <youtubeid> | !playlist ban <youtubeid> | !playlist random on/off | !playlist steal', {username: config.settings.broadcaster_username})
  }

  async addSongToQueue (self, sender, text) {
    if (text.length < 1 || !await global.configuration.getValue('songs_songrequest')) {
      if (await global.configuration.getValue('songs_songrequest')) {
        global.commons.sendMessage(global.translate('core.usage') + ': !songrequest <video-id|video-url|search-string>', sender)
      } else {
        global.commons.sendMessage('$sender, ' + global.translate('core.settings.songs.songrequest.false'), sender)
      }
      return
    }

    const urlRegex = /^.*(?:youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#&?]*).*/
    const idRegex = /^[a-zA-Z0-9-_]{11}$/
    var match = text.trim().match(urlRegex)
    var videoID = (match && match[1].length === 11) ? match[1] : text.trim()

    if (_.isNil(videoID.match(idRegex))) { // not id or url
      ytsearch(text.trim(), { maxResults: 1, key: 'AIzaSyDYevtuLOxbyqBjh17JNZNvSQO854sngK0' }, function (err, results) {
        if (err) return global.log.error(err, { fnc: 'Songs.prototype.addSongToQueue#3' })
        self.addSongToQueue(self, sender, results[0].id)
      })
      return
    }

    // is song banned?
    let ban = await global.db.engine.findOne('songbanned', { videoID: videoID })
    if (!_.isEmpty(ban)) {
      global.commons.sendMessage(global.translate('songs.song-is-banned'), sender)
      return
    }

    ytdl.getInfo('https://www.youtube.com/watch?v=' + videoID, async function (err, videoInfo) {
      if (err) return global.log.error(err, { fnc: 'Songs.prototype.addSongToQueue#1' })
      if (_.isUndefined(videoInfo) || _.isUndefined(videoInfo.title) || _.isNull(videoInfo.title)) {
        global.commons.sendMessage(global.translate('songs.song-was-not-found'), sender)
      } else if (videoInfo.length_seconds / 60 > await global.configuration.getValue('songs_duration')) global.commons.sendMessage(global.translate('songs.tooLong'), sender)
      else {
        global.db.engine.update('songrequests', { addedAt: new Date().getTime() }, { videoID: videoID, title: videoInfo.title, addedAt: new Date().getTime(), loudness: videoInfo.loudness, length_seconds: videoInfo.length_seconds, username: sender.username })
        let message = await global.commons.prepare('songs.song-was-added-to-queue', { name: videoInfo.title })
        debug(message); global.commons.sendMessage(message, sender)
        self.getMeanLoudness(self)
      }
    })
  }

  async removeSongFromQueue (self, sender, text) {
    let sr = await global.db.engine.find('songrequests', { username: sender.username })
    sr = _.head(_.orderBy(sr, ['addedAt'], ['desc']))
    if (!_.isNil(sr)) {
      await global.db.engine.remove('songrequests', { username: sender.username, _id: sr._id.toString() })
      let m = await global.commons.prepare('songs.song-was-removed-from-queue', { name: sr.title })
      debug(m); global.commons.sendMessage(m, sender)
      self.getMeanLoudness(self)
    }
  }

  async addSongToPlaylist (self, sender, text) {
    if (_.isNil(text)) return

    var urlRegex = /^.*(?:youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#&?]*).*/
    var match = text.trim().match(urlRegex)
    var videoID = (match && match[1].length === 11) ? match[1] : text.trim()

    // is song banned?
    let ban = await global.db.engine.findOne('songbanned', { videoID: videoID })
    if (!_.isEmpty(ban)) {
      global.commons.sendMessage(global.translate('songs.isBanned'), sender)
      return
    }

    // is song already in playlist?
    let playlist = await global.db.engine.findOne('playlist', { videoID: videoID })
    if (!_.isEmpty(playlist)) {
      let message = await global.commons.prepare('songs.song-is-already-in-playlist', { name: playlist.title })
      debug(message); global.commons.sendMessage(message, sender)
      return
    }

    ytdl.getInfo('https://www.youtube.com/watch?v=' + videoID, async function (err, videoInfo) {
      if (err) global.log.error(err, { fnc: 'Songs.prototype.addSongToPlaylist#1' })
      if (_.isUndefined(videoInfo) || _.isUndefined(videoInfo.title) || _.isNull(videoInfo.title)) {
        global.commons.sendMessage(global.translate('songs.song-was-not-found'), sender)
        return
      }
      global.db.engine.update('playlist', { videoID: videoID }, {videoID: videoID, title: videoInfo.title, loudness: videoInfo.loudness, length_seconds: videoInfo.length_seconds, lastPlayedAt: new Date().getTime(), seed: 1})
      let message = await global.commons.prepare('songs.song-was-added-to-playlist', { name: videoInfo.title })
      debug(message); global.commons.sendMessage(message, sender)
      self.send(self, global.panel.io)
      self.getMeanLoudness(self)
    })
  }

  removeSongFromPlaylist (self, sender, text) {
    if (text.length < 1) return
    var videoID = text.trim()

    ytdl.getInfo('https://www.youtube.com/watch?v=' + videoID, async function (err, videoInfo) {
      if (err) global.log.error(err, { fnc: 'Songs.prototype.removeSongFromPlaylist#1' })
      if (_.isUndefined(videoInfo) || _.isUndefined(videoInfo.title) || _.isNull(videoInfo.title)) {
        global.commons.sendMessage(global.translate('songs.song-was-not-found'), sender)
        return
      }

      let removed = await global.db.engine.remove('playlist', { videoID: videoID })
      if (removed > 0) {
        let message = await global.commons.prepare('songs.song-was-removed-from-playlist', { name: videoInfo.title })
        debug(message); global.commons.sendMessage(message, sender)
        self.getMeanLoudness(self)
        self.send(self, global.panel.io)
      }
    })
  }
}

module.exports = new Songs()

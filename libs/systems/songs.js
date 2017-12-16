'use strict'

// 3rdparty libraries
const _ = require('lodash')
const ytdl = require('ytdl-core')
const ytsearch = require('youtube-search')
// bot libraries
const config = require('../../config.json')
const constants = require('../constants')
const debug = require('debug')('systems:songs')

class Songs {
  constructor () {
    if (global.commons.isSystemEnabled(this)) {
      this.currentSong = {}
      this.meanLoudness = -15

      global.parser.register(this, '!songrequest', this.addSongToQueue, constants.VIEWERS)
      global.parser.register(this, '!wrongsong', this.removeSongFromQueue, constants.VIEWERS)
      global.parser.register(this, '!currentsong', this.getCurrentSong, constants.VIEWERS)
      global.parser.register(this, '!skipsong', this.sendNextSongID, constants.OWNER_ONLY)
      global.parser.register(this, '!bansong', this.banSong, constants.OWNER_ONLY)
      global.parser.register(this, '!unbansong', this.unbanSong, constants.OWNER_ONLY)
      global.parser.register(this, '!playlist add', this.addSongToPlaylist, constants.OWNER_ONLY)
      global.parser.register(this, '!playlist remove', this.removeSongFromPlaylist, constants.OWNER_ONLY)
      global.parser.register(this, '!playlist steal', this.stealSong, constants.OWNER_ONLY)
      global.parser.register(this, '!playlist', this.help, constants.OWNER_ONLY)

      global.parser.registerHelper('!songrequest')

      global.configuration.register('songs_volume', 'core.settings.songs.volume', 'number', 25)
      global.configuration.register('songs_duration', 'core.settings.songs.duration', 'number', 10)
      global.configuration.register('songs_shuffle', 'core.settings.songs.shuffle', 'bool', false)
      global.configuration.register('songs_songrequest', 'core.settings.songs.songrequest', 'bool', true)
      global.configuration.register('songs_playlist', 'core.settings.songs.playlist', 'bool', true)

      this.getMeanLoudness(this)

      global.panel.addMenu({category: 'manage', name: 'songs', id: 'songs'})
      global.panel.addWidget('ytplayer', 'widget-title-ytplayer', 'headphones')
      global.panel.registerSockets({
        self: this,
        expose: ['getCurrentVolume', 'send', 'setTrim', 'sendConfiguration', 'banSong', 'getSongRequests', 'stealSong', 'sendNextSongID', 'removeSongFromPlaylist', 'unbanSong'],
        finally: this.send
      })
    }
  }

  async getMeanLoudness (self) {
    let playlist = await global.db.engine.find('playlist')
    if (_.isEmpty(playlist)) {
      self.meanLoudness = -15
      return self.meanLoudness
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
    return self.meanLoudness
  }

  getVolume (self, item) {
    item.loudness = !_.isNil(item.loudness) ? item.loudness : -15
    var correction = Math.ceil((global.configuration.getValue('songs_volume') / 100) * 3)
    var loudnessDiff = parseFloat(parseFloat(self.meanLoudness) - item.loudness)
    return Math.round(global.configuration.getValue('songs_volume') + (correction * loudnessDiff))
  }

  getCurrentVolume (self, socket) {
    socket.emit('newVolume', self.getVolume(self, self.currentSong))
  }

  setTrim (self, socket, data) {
    global.db.engine.update('playlist', { videoID: data.id }, { startTime: data.lowValue, endTime: data.highValue })
  }

  sendConfiguration (self, socket) {
    socket.emit('songsConfiguration', {
      volume: global.configuration.getValue('songs_volume'),
      shuffle: global.configuration.getValue('songs_shuffle'),
      duration: global.configuration.getValue('songs_duration'),
      songrequest: global.configuration.getValue('songs_songrequest'),
      playlist: global.configuration.getValue('songs_playlist')
    })
  }

  async send (self, socket) {
    let playlist = await global.db.engine.find('playlist')
    _.each(playlist, function (item) { item.volume = self.getVolume(self, item) })
    socket.emit('songPlaylistList', _.orderBy(playlist, ['addedAt'], ['asc']))

    let bannedSongs = await global.db.engine.find('bannedsong')
    socket.emit('bannedSongsList', _.orderBy(bannedSongs, ['title'], ['asc']))
  }

  banSong (self, sender, text) {
    text.trim().length === 0 ? self.banCurrentSong(self, sender) : self.banSongById(self, sender, text.trim())
  }

  async banCurrentSong (self, sender) {
    if (_.isNil(self.currentSong.videoID)) return

    let update = await global.db.engine.update('bannedsong', { videoId: self.currentSong.videoID }, { videoId: self.currentSong.videoID, title: self.currentSong.title })
    if (update.length > 0) {
      let message = global.commons.prepare('songs.song-was-banned', { name: self.currentSong.title })
      debug(message); global.commons.sendMessage(message, sender)

      await Promise.all([global.db.engine.remove('playlist', { videoID: self.currentSong.videoID }), global.db.engine.remove('songrequest', { videoID: self.currentSong.videoID })])

      global.commons.timeout(self.currentSong.username, global.translate('songs.song-was-banned-timeout-message'), 300)
      self.getMeanLoudness(self)
      self.sendNextSongID(self, global.panel.io)
      self.send(self, global.panel.io)
    }
  }

  async banSongById (self, sender, text) {
    text = text.trim()
    ytdl.getInfo('https://www.youtube.com/watch?v=' + text, async function (err, videoInfo) {
      if (err) global.log.error(err, { fnc: 'Songs.prototype.banSongById#1' })
      if (_.isNil(videoInfo.title)) return

      let updated = await global.db.engine.update('bannedsong', { videoId: text }, { videoId: text, title: videoInfo.title })
      if (updated.length > 0) {
        global.commons.sendMessage(global.translate('songs.bannedSong').replace(/\$title/g, self.currentSong.title), sender)

        await Promise.all([global.db.engine.remove('playlist', { videoID: text }), global.db.engine.remove('songrequest', { videoID: text })])

        global.commons.timeout(self.currentSong.username, global.translate('songs.bannedSongTimeout'), 300)
        self.getMeanLoudness(self)
        self.sendNextSongID(self, global.panel.io)
        self.send(self, global.panel.io)
      }
    })
  }

  async unbanSong (self, sender, text) {
    let removed = await global.db.engine.remove('bannedsong', { videoId: text.trim() })
    if (removed > 0) global.commons.sendMessage(global.translate('songs.song-was-unbanned'), sender)
    else global.commons.sendMessage(global.translate('songs.song-was-not-banned'), sender)
  }

  async sendNextSongID (self, socket) {
    // check if there are any requests
    if (global.configuration.getValue('songs_songrequest')) {
      let sr = await global.db.engine.find('songrequests')
      sr = _.head(_.orderBy(sr, ['addedAt'], ['asc']))
      if (!_.isNil(sr)) {
        self.currentSong = sr
        self.currentSong.volume = self.getVolume(self, self.currentSong)
        socket.emit('videoID', self.currentSong)
        await global.db.engine.remove('songrequests', { _id: sr._id.toString() })
        return
      }
    }

    // get song from playlist
    if (global.configuration.getValue('songs_playlist')) {
      let pl = await global.db.engine.find('playlist')
      if (_.isEmpty(pl)) {
        socket.emit('videoID', null) // send null and skip to next empty song
        return // don't do anything if no songs in playlist
      }
      pl = _.head(_.orderBy(pl, [(global.configuration.getValue('songs_shuffle') ? 'seed' : 'lastPlayedAt')], ['asc']))

      // shuffled song is played again
      if (global.configuration.getValue('songs_shuffle') && pl.seed === 1) {
        self.createRandomSeeds()
        self.sendNextSongID(self, socket) // retry with new seeds
        return
      }

      await global.db.engine.update('playlist', { _id: pl._id.toString() }, { seed: 1, lastPlayedAt: new Date().getTime() })
      self.currentSong = pl
      self.currentSong.volume = self.getVolume(self, self.currentSong)
      socket.emit('videoID', self.currentSong)
      return
    }

    // nothing to send
    socket.emit('videoID', null)
  }

  getCurrentSong (self) {
    let translation = 'songs.no-song-is-currently-playing'
    if (!_.isNil(self.currentSong.title)) {
      if (self.currentSong.type === 'playlist') translation = 'songs.current-song-from-playlist'
      else translation = 'songs.current-song-from-songrequest'
    }
    let message = global.commons.prepare(translation, { name: self.currentSong.title, username: self.currentSong.username })
    debug(message); global.commons.sendMessage(message, {username: config.settings.broadcaster_username})
  }

  stealSong (self) {
    try {
      self.addSongToPlaylist(self, null, self.currentSong.videoID)
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
    if (text.length < 1 || !global.configuration.getValue('songs_songrequest')) {
      if (global.configuration.getValue('songs_songrequest')) {
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

    ytdl.getInfo('https://www.youtube.com/watch?v=' + videoID, function (err, videoInfo) {
      if (err) return global.log.error(err, { fnc: 'Songs.prototype.addSongToQueue#1' })
      if (_.isUndefined(videoInfo) || _.isUndefined(videoInfo.title) || _.isNull(videoInfo.title)) {
        global.commons.sendMessage(global.translate('songs.song-was-not-found'), sender)
      } else if (videoInfo.length_seconds / 60 > global.configuration.getValue('songs_duration')) global.commons.sendMessage(global.translate('songs.tooLong'), sender)
      else {
        global.db.engine.update('songrequests', { addedAt: new Date().getTime() }, { videoID: videoID, title: videoInfo.title, addedAt: new Date().getTime(), loudness: videoInfo.loudness, length_seconds: videoInfo.length_seconds, username: sender.username })
        let message = global.commons.prepare('songs.song-was-added-to-queue', { name: videoInfo.title })
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
      let m = global.commons.prepare('songs.song-was-removed-from-queue', { name: sr.title })
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
      let message = global.commons.prepare('songs.song-is-already-in-playlist', { name: playlist.title })
      debug(message); global.commons.sendMessage(message, sender)
      return
    }

    ytdl.getInfo('https://www.youtube.com/watch?v=' + videoID, function (err, videoInfo) {
      if (err) global.log.error(err, { fnc: 'Songs.prototype.addSongToPlaylist#1' })
      if (_.isUndefined(videoInfo) || _.isUndefined(videoInfo.title) || _.isNull(videoInfo.title)) {
        global.commons.sendMessage(global.translate('songs.song-was-not-found'), sender)
        return
      }
      global.db.engine.update('playlist', { videoID: videoID }, {videoID: videoID, title: videoInfo.title, loudness: videoInfo.loudness, length_seconds: videoInfo.length_seconds, lastPlayedAt: new Date().getTime(), seed: 1})
      let message = global.commons.prepare('songs.song-was-added-to-playlist', { name: videoInfo.title })
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
        let message = global.commons.prepare('songs.song-was-removed-from-playlist', { name: videoInfo.title })
        debug(message); global.commons.sendMessage(message, sender)
        self.getMeanLoudness(self)
        self.send(self, global.panel.io)
      }
    })
  }
}

module.exports = new Songs()

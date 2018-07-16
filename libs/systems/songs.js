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
const System = require('./_interface')

class Songs extends System {
  constructor () {
    const settings = {
      _: {
        meanLoudness: -15,
        currentSong: null
      },
      volume: 25,
      duration: 10,
      shuffle: true,
      songrequest: true,
      playlist: true,
      notify: false,
      commands: [
        {name: '!songrequest', fnc: 'addSongToQueue'},
        {name: '!wrongsong', fnc: 'removeSongFromQueue'},
        {name: '!currentsong', fnc: 'getCurrentSong'},
        {name: '!skipsong', fnc: 'sendNextSongID', permission: constants.OWNER_ONLY},
        {name: '!bansong', fnc: 'banSong', permission: constants.OWNER_ONLY},
        {name: '!unbansong', fnc: 'unbanSong', permission: constants.OWNER_ONLY},
        {name: '!playlist add', fnc: 'addSongToPlaylist', permission: constants.OWNER_ONLY},
        {name: '!playlist remove', fnc: 'removeSongFromPlaylist', permission: constants.OWNER_ONLY},
        {name: '!playlist steal', fnc: 'stealSong', permission: constants.OWNER_ONLY},
        {name: '!playlist', fnc: 'help', permission: constants.OWNER_ONLY}
      ]
    }
    super({settings})

    if (cluster.isMaster) {
      cluster.on('message', (worker, d) => {
        if (d.type !== 'songs') return
        this[d.fnc](this, global.panel.io)
      })

      this.getMeanLoudness(this)

      this.addMenu({category: 'manage', name: 'playlist', id: 'songs/playlist'})
      this.addMenu({category: 'manage', name: 'bannedsongs', id: 'songs/bannedsongs'})
      this.addWidget('ytplayer', 'widget-title-ytplayer', 'fas fa-headphones')
    }
  }

  sockets () {
    this.socket.on('connection', (socket) => {
      socket.on('findPlaylist', async (where, cb) => {
        where = where || {}
        cb(null, await global.db.engine.find(this.collection.playlist, where))
      })
    })
  }

  async getMeanLoudness (self) {
    let playlist = await global.db.engine.find(this.collection.playlist)
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
    const volume = await this.settings.volume
    var correction = Math.ceil((volume / 100) * 3)
    var loudnessDiff = parseFloat(parseFloat(await self.meanLoudness) - item.loudness)
    return Math.round(volume + (correction * loudnessDiff))
  }

  async getCurrentVolume (self, socket) {
    socket.emit('newVolume', await self.getVolume(self, await self.currentSong))
  }

  setTrim (self, socket, data) {
    global.db.engine.update(this.collection.playlist, { videoID: data.id }, { startTime: data.lowValue, endTime: data.highValue })
  }

  async send (self, socket) {
    if (cluster.isWorker) return process.send({ type: 'songs', fnc: 'send' })

    let playlist = await global.db.engine.find(this.collection.playlist)
    _.each(playlist, async function (item) { item.volume = await self.getVolume(self, item) })
    socket.emit('songPlaylistList', _.orderBy(playlist, ['addedAt'], ['asc']))

    let bannedSongs = await global.db.engine.find(this.collection.ban)
    socket.emit('bannedSongsList', _.orderBy(bannedSongs, ['title'], ['asc']))
  }

  banSong (opts) {
    opts.parameters.trim().length === 0 ? this.banCurrentSong(opts) : this.banSongById(opts)
  }

  async banCurrentSong (opts) {
    let currentSong = await this.currentSong
    if (_.isNil(currentSong.videoID)) return

    let update = await global.db.engine.update(this.collection.ban, { videoId: currentSong.videoID }, { videoId: currentSong.videoID, title: currentSong.title })
    if (update.length > 0) {
      let message = await global.commons.prepare('songs.song-was-banned', { name: currentSong.title })
      debug(message); global.commons.sendMessage(message, opts.sender)

      await Promise.all([global.db.engine.remove(this.collection.playlist, { videoID: currentSong.videoID }), global.db.engine.remove(this.collection.request, { videoID: currentSong.videoID })])

      global.commons.timeout(currentSong.username, global.translate('songs.song-was-banned-timeout-message'), 300)
      this.getMeanLoudness(this)

      this.sendNextSongID(this)
      this.send(this)
    }
  }

  async banSongById (opts) {
    ytdl.getInfo('https://www.youtube.com/watch?v=' + opts.parameters, async function (err, videoInfo) {
      if (err) global.log.error(err, { fnc: 'Songs.prototype.banSongById#1' })
      if (_.isNil(videoInfo.title)) return

      let updated = await global.db.engine.update(this.collection.ban, { videoId: opts.parameters }, { videoId: opts.parameters, title: videoInfo.title })
      if (updated.length > 0) {
        global.commons.sendMessage(global.translate('songs.bannedSong').replace(/\$title/g, videoInfo.title), opts.sender)

        await Promise.all([global.db.engine.remove(this.collection.playlist, { videoID: opts.parameters }), global.db.engine.remove(this.collection.request, { videoID: opts.parameters })])

        const currentSong = await this.currentSong
        global.commons.timeout(currentSong.username, global.translate('songs.bannedSongTimeout'), 300)

        this.getMeanLoudness(this)
        this.sendNextSongID(this)
        this.send(this)
      }
    })
  }

  async unbanSong (opts) {
    let removed = await global.db.engine.remove(this.collection.ban, { videoId: opts.parameters })
    if (removed > 0) global.commons.sendMessage(global.translate('songs.song-was-unbanned'), opts.sender)
    else global.commons.sendMessage(global.translate('songs.song-was-not-banned'), opts.sender)
  }

  async sendNextSongID (self, socket) {
    if (cluster.isWorker) return process.send({ type: 'songs', fnc: 'sendNextSongID' })
    // check if there are any requests
    if (await this.settings.songrequest) {
      let sr = await global.db.engine.find(this.collection.request)
      sr = _.head(_.orderBy(sr, ['addedAt'], ['asc']))
      if (!_.isNil(sr)) {
        let currentSong = sr
        currentSong.volume = await self.getVolume(self, currentSong)
        currentSong.type = 'songrequests'
        self.currentSong = currentSong

        if (await this.settings.notify) self.notifySong(self)
        socket.emit('videoID', currentSong)
        await global.db.engine.remove(this.collection.request, { videoID: sr.videoID })
        return
      }
    }

    // get song from playlist
    if (await this.settings.playlist) {
      let pl = await global.db.engine.find(this.collection.playlist)
      if (_.isEmpty(pl)) {
        socket.emit('videoID', null) // send null and skip to next empty song
        return // don't do anything if no songs in playlist
      }
      pl = _.head(_.orderBy(pl, [(await this.settings.shuffle ? 'seed' : 'lastPlayedAt')], ['asc']))

      // shuffled song is played again
      if (await this.settings.shuffle && pl.seed === 1) {
        self.createRandomSeeds()
        self.sendNextSongID(self, socket) // retry with new seeds
        return
      }

      await global.db.engine.update(this.collection.playlist, { _id: pl._id.toString() }, { seed: 1, lastPlayedAt: new Date().getTime() })
      let currentSong = pl
      currentSong.volume = await self.getVolume(self, currentSong)
      currentSong.type = 'playlist'
      self.currentSong = currentSong

      if (await this.settings.notify) self.notifySong(self)

      socket.emit('videoID', currentSong)
      return
    }

    // nothing to send
    socket.emit('videoID', null)
  }

  async getCurrentSong () {
    let translation = 'songs.no-song-is-currently-playing'
    const currentSong = await this.currentSong
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
    let playlist = await global.db.engine.find(this.collection.playlist)
    _.each(playlist, function (item) {
      global.db.engine.update(this.collection.playlist, { _id: item._id.toString() }, { seed: Math.random() })
    })
  }

  async getSongRequests (self, socket) {
    let songrequests = await global.db.engine.find(this.collection.request)
    socket.emit('songRequestsList', _.orderBy(songrequests, ['addedAt'], ['asc']))
  }

  help () {
    global.commons.sendMessage(global.translate('core.usage') + ': !playlist add <youtubeid> | !playlist remove <youtubeid> | !playlist ban <youtubeid> | !playlist random on/off | !playlist steal', {username: config.settings.broadcaster_username})
  }

  async addSongToQueue (opts) {
    if (opts.parameters.length < 1 || !await this.settings.songrequest) {
      if (await this.settings.songrequest) {
        global.commons.sendMessage(global.translate('core.usage') + ': !songrequest <video-id|video-url|search-string>', opts.sender)
      } else {
        global.commons.sendMessage('$sender, ' + global.translate('core.settings.songs.songrequest.false'), opts.sender)
      }
      return
    }

    const urlRegex = /^.*(?:youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#&?]*).*/
    const idRegex = /^[a-zA-Z0-9-_]{11}$/
    var match = opts.parameters.match(urlRegex)
    var videoID = (match && match[1].length === 11) ? match[1] : opts.parameters

    if (_.isNil(videoID.match(idRegex))) { // not id or url
      ytsearch(opts.parameters, { maxResults: 1, key: 'AIzaSyDYevtuLOxbyqBjh17JNZNvSQO854sngK0' }, (err, results) => {
        if (err) return global.log.error(err, { fnc: 'Songs.prototype.addSongToQueue#3' })
        opts.parameters = results[0].id
        this.addSongToQueue(opts)
      })
      return
    }

    // is song banned?
    let ban = await global.db.engine.findOne(this.collection.ban, { videoID: videoID })
    if (!_.isEmpty(ban)) {
      global.commons.sendMessage(global.translate('songs.song-is-banned'), opts.sender)
      return
    }

    ytdl.getInfo('https://www.youtube.com/watch?v=' + videoID, async function (err, videoInfo) {
      if (err) return global.log.error(err, { fnc: 'Songs.prototype.addSongToQueue#1' })
      if (_.isUndefined(videoInfo) || _.isUndefined(videoInfo.title) || _.isNull(videoInfo.title)) {
        global.commons.sendMessage(global.translate('songs.song-was-not-found'), opts.sender)
      } else if (videoInfo.length_seconds / 60 > await this.settings.duration) global.commons.sendMessage(global.translate('songs.tooLong'), opts.sender)
      else {
        global.db.engine.update(this.collection.request, { addedAt: new Date().getTime() }, { videoID: videoID, title: videoInfo.title, addedAt: new Date().getTime(), loudness: videoInfo.loudness, length_seconds: videoInfo.length_seconds, username: opts.sender.username })
        let message = await global.commons.prepare('songs.song-was-added-to-queue', { name: videoInfo.title })
        debug(message); global.commons.sendMessage(message, opts.sender)
        this.getMeanLoudness(this)
      }
    })
  }

  async removeSongFromQueue (opts) {
    let sr = await global.db.engine.find(this.collection.request, { username: opts.sender.username })
    sr = _.head(_.orderBy(sr, ['addedAt'], ['desc']))
    if (!_.isNil(sr)) {
      await global.db.engine.remove(this.collection.request, { username: opts.sender.username, _id: sr._id.toString() })
      let m = await global.commons.prepare('songs.song-was-removed-from-queue', { name: sr.title })
      debug(m); global.commons.sendMessage(m, opts.sender)
      this.getMeanLoudness(this)
    }
  }

  async addSongToPlaylist (opts) {
    if (_.isNil(opts.parameters)) return

    var urlRegex = /^.*(?:youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#&?]*).*/
    var match = opts.parameters.match(urlRegex)
    var videoID = (match && match[1].length === 11) ? match[1] : opts.parameters

    // is song banned?
    let ban = await global.db.engine.findOne(this.collection.ban, { videoID: videoID })
    if (!_.isEmpty(ban)) {
      global.commons.sendMessage(global.translate('songs.isBanned'), opts.sender)
      return
    }

    // is song already in playlist?
    let playlist = await global.db.engine.findOne(this.collection.playlist, { videoID: videoID })
    if (!_.isEmpty(playlist)) {
      let message = await global.commons.prepare('songs.song-is-already-in-playlist', { name: playlist.title })
      debug(message); global.commons.sendMessage(message, opts.sender)
      return
    }

    ytdl.getInfo('https://www.youtube.com/watch?v=' + videoID, async function (err, videoInfo) {
      if (err) global.log.error(err, { fnc: 'Songs.prototype.addSongToPlaylist#1' })
      if (_.isUndefined(videoInfo) || _.isUndefined(videoInfo.title) || _.isNull(videoInfo.title)) {
        global.commons.sendMessage(global.translate('songs.song-was-not-found'), opts.sender)
        return
      }
      global.db.engine.update(this.collection.playlist, { videoID: videoID }, {videoID: videoID, title: videoInfo.title, loudness: videoInfo.loudness, length_seconds: videoInfo.length_seconds, lastPlayedAt: new Date().getTime(), seed: 1})
      let message = await global.commons.prepare('songs.song-was-added-to-playlist', { name: videoInfo.title })
      debug(message); global.commons.sendMessage(message, opts.sender)
      this.send(this, global.panel.io)
      this.getMeanLoudness(this)
    })
  }

  async removeSongFromPlaylist (opts) {
    if (opts.parameters.length < 1) return
    var videoID = opts.parameters

    let song = await global.db.engine.findOne(this.collection.playlist, { videoID: videoID })
    if (!_.isEmpty(song)) {
      await global.db.engine.remove(this.collection.playlist, { videoID: videoID })
      let message = await global.commons.prepare('songs.song-was-removed-from-playlist', { name: song.title })
      debug(message); global.commons.sendMessage(message, opts.sender)
    } else {
      global.commons.sendMessage(global.translate('songs.song-was-not-found'), opts.sender)
    }
  }
}

module.exports = new Songs()

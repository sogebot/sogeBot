'use strict'

// 3rdparty libraries
var _ = require('lodash')
var ytdl = require('ytdl-core')
const ytsearch = require('youtube-search')
// bot libraries
const config = require('../../config.json')
var constants = require('../constants')

function Songs () {
  if (global.commons.isSystemEnabled(this)) {
    this.currentSong = {}
    this.meanLoudness = -15

    global.parser.register(this, '!songrequest', this.addSongToQueue, constants.VIEWERS)
    global.parser.register(this, '!wrongsong', this.removeSongFromQueue, constants.VIEWERS)
    global.parser.register(this, '!currentsong', this.getCurrentSong, constants.VIEWERS)
    global.parser.register(this, '!skipsong', this.skipSong, constants.OWNER_ONLY)
    global.parser.register(this, '!bansong', this.banSong, constants.OWNER_ONLY)
    global.parser.register(this, '!unbansong', this.unbanSong, constants.OWNER_ONLY)
    global.parser.register(this, '!playlist add', this.addSongToPlaylist, constants.OWNER_ONLY)
    global.parser.register(this, '!playlist remove', this.removeSongFromPlaylist, constants.OWNER_ONLY)
    global.parser.register(this, '!playlist steal', this.stealSongToPlaylist, constants.OWNER_ONLY)
    global.parser.register(this, '!playlist', this.help, constants.OWNER_ONLY)

    global.parser.registerHelper('!songrequest')

    global.configuration.register('songs_volume', 'songs.settings.volume', 'number', 25)
    global.configuration.register('songs_duration', 'songs.settings.duration', 'number', 10)
    global.configuration.register('songs_shuffle', 'songs.settings.shuffle', 'bool', false)
    global.configuration.register('songs_songrequest', 'songs.settings.songrequest', 'bool', true)
    global.configuration.register('songs_playlist', 'songs.settings.playlist', 'bool', true)

    this.getMeanLoudness(this)
    this.webPanel()
  }
}

Songs.prototype.webPanel = function () {
  global.panel.addMenu({category: 'settings', name: 'systems', id: 'systems'})
  global.panel.addMenu({category: 'manage', name: 'songs', id: 'songs'})
  global.panel.addWidget('ytplayer', 'widget-title-ytplayer', 'music')

  global.panel.socketListening(this, 'getVideoID', this.sendNextSongID)
  global.panel.socketListening(this, 'getSongRequests', this.sendSongRequestsList)
  global.panel.socketListening(this, 'getPlaylist', this.sendPlaylistList)

  global.panel.socketListening(this, 'getSongsConfiguration', this.sendConfiguration)

  global.panel.socketListening(this, 'setTrim', this.setTrim)

  global.panel.socketListening(this, 'banSong', this.banCurrentSong)
  global.panel.socketListening(this, 'stealSong', this.stealSongToPlaylist)
  global.panel.socketListening(this, 'skipSong', this.skipSong)

  global.panel.socketListening(this, 'getVolume', this.getCurrentVolume)
}

Songs.prototype.getMeanLoudness = async function (self) {
  var loudness = 0
  var count = 0

  let playlist = await global.db.engine.find('playlist')
  if (playlist.length < 1) self.meanLoudness = -15
  else {
    _.each(playlist, function (item) { (typeof item.loudness === 'undefined') ? loudness = loudness + -15 : loudness = loudness + parseFloat(item.loudness); count = count + 1 })
    self.meanLoudness = loudness / count
  }
}

Songs.prototype.getVolume = function (self, item) {
  item.loudness = typeof item.loudness !== 'undefined' ? item.loudness : -15
  var correction = Math.ceil((global.configuration.getValue('songs_volume') / 100) * 3)
  var loudnessDiff = parseFloat(parseFloat(self.meanLoudness) - item.loudness)
  return Math.round(global.configuration.getValue('songs_volume') + (correction * loudnessDiff))
}

Songs.prototype.getCurrentVolume = function (self, socket) {
  socket.emit('newVolume', self.getVolume(self, self.currentSong))
}

Songs.prototype.setTrim = function (self, socket, data) {
  self.savePlaylistTrim(data.id, data.lowValue, data.highValue)
}

Songs.prototype.sendConfiguration = function (self, socket) {
  socket.emit('songsConfiguration', {
    volume: global.configuration.getValue('songs_volume'),
    shuffle: global.configuration.getValue('songs_shuffle'),
    duration: global.configuration.getValue('songs_duration'),
    songrequest: global.configuration.getValue('songs_songrequest'),
    playlist: global.configuration.getValue('songs_playlist')
  })
}

Songs.prototype.banSong = function (self, sender, text) {
  text.trim().length === 0 ? self.banCurrentSong(self, sender) : self.banSongById(self, sender, text.trim())
}

Songs.prototype.banCurrentSong = async function (self, sender) {
  let update = await global.db.engine.update('bannedsong', { videoID: self.currentSong.videoID }, { videoID: self.currentSong.videoID, title: self.currentSong.title })
  if (update > 0) {
    global.commons.sendMessage(global.translate('songs.bannedSong').replace(/\$title/g, self.currentSong.title), sender)

    global.db.engine.remove('playlist', { videoID: self.currentSong.videoID })
    global.db.engine.remove('songrequest', { videoID: self.currentSong.videoID })

    global.commons.timeout(self.currentSong.username, global.translate('songs.bannedSongTimeout'), 300)
    self.getMeanLoudness(self)
    self.sendNextSongID(self, global.panel.io)
    self.sendPlaylistList(self, global.panel.io)
  }
}

Songs.prototype.banSongById = async function (self, sender, text) {
  text = text.trim()
  ytdl.getInfo('https://www.youtube.com/watch?v=' + text, async function (err, videoInfo) {
    if (err) global.log.error(err, { fnc: 'Songs.prototype.banSongById#1' })
    if (typeof videoInfo.title === 'undefined' || videoInfo.title === null) return

    let updated = await global.db.engine.update('bannedsong', { videoID: text }, { videoID: text, title: videoInfo.title })
    if (updated > 0) {
      global.commons.sendMessage(global.translate('songs.bannedSong').replace(/\$title/g, self.currentSong.title), sender)

      global.db.engine.remove('playlist', { videoID: text })
      global.db.engine.remove('songrequest', { videoID: text })

      global.commons.timeout(self.currentSong.username, global.translate('songs.bannedSongTimeout'), 300)
      self.getMeanLoudness(self)
      self.sendNextSongID(self, global.panel.io)
      self.sendPlaylistList(self, global.panel.io)
    }
  })
}

Songs.prototype.unbanSong = async function (self, sender, text) {
  let removed = await global.db.engine.remove('bannedsong', { videoID: text.trim() })
  if (removed > 0) global.commons.sendMessage(global.translate('songs.unbannedSong'), sender)
  else global.commons.sendMessage(global.translate('songs.notBannedSong'), sender)
}

Songs.prototype.getCurrentSong = function (self) {
  let translation = 'songs.noCurrentSong'
  if (!_.isNil(self.currentSong.title)) {
    if (self.currentSong.type === 'playlist') translation = 'songs.currentSong.playlist'
    else translation = 'songs.currentSong.songrequest'
  }
  global.commons.sendMessage(global.translate(translation).replace(/\$title/g, self.currentSong.title).replace(/\$username/g, (global.configuration.getValue('atUsername') ? '@' : '') + self.currentSong.username), {username: config.settings.broadcaster_username})
}

/* TODO: CONTINUE */
Songs.prototype.stealSongToPlaylist = function (self) {
  try {
    self.addSongToPlaylist(self, null, self.currentSong.videoID)
  } catch (err) {
    global.commons.sendMessage(global.translate('songs.noCurrentSong'), {username: config.settings.broadcaster_username})
  }
}

Songs.prototype.skipSong = function (self, socket) {
  self.sendNextSongID(self, socket)
}

Songs.prototype.createRandomSeeds = async function () {
  let playlist = await global.db.engine.find('playlist')
  _.each(playlist, function (item) {
    global.db.engine.update('playlist', { _id: item._id }, { seed: Math.random() })
  })
}

Songs.prototype.sendSongRequestsList = async function (self, socket) {
  let songrequests = await global.db.engine.find('songrequests')
  socket.emit('songRequestsList', _.orderBy(songrequests, ['addedAt'], ['asc']))
}

Songs.prototype.sendPlaylistList = async function (self, socket) {
  let playlist = await global.db.engine.find('playlist')
  _.each(playlist, function (item) { item.volume = self.getVolume(self, item) })
  socket.emit('songPlaylistList', _.orderBy(playlist, ['addedAt'], ['asc']))
}

Songs.prototype.savePlaylistTrim = function (id, startTime, endTime) {
  global.db.engine.update('playlist', { videoID: id }, { startTime: startTime, endTime: endTime })
}

Songs.prototype.sendNextSongID = async function (self, socket) {
  // check if there are any requests
  if (global.configuration.getValue('songs_songrequest')) {
    let sr = await global.db.engine.find('songrequests')
    sr = _.head(_.orderBy(sr, ['addedAt'], ['asc']))
    if (!_.isNil(sr)) {
      self.currentSong = sr
      self.currentSong.volume = self.getVolume(self, self.currentSong)
      socket.emit('videoID', self.currentSong)
      global.db.engine.remove('songrequests', { _id: sr._id })
      return
    }
  }

  // get song from playlist
  if (global.configuration.getValue('songs_playlist')) {
    let pl = await global.db.engine.find('playlist')
    pl = _.head(_.orderBy(pl, [(global.configuration.getValue('songs_shuffle') ? 'seed' : 'lastPlayedAt')], ['asc']))

    // shuffled song is played again
    if (global.configuration.getValue('songs_shuffle') && pl.seed === 1) {
      self.createRandomSeeds()
      self.sendNextSongID(self, socket) // retry with new seeds
      return
    }

    global.db.engine.update('playlist', { _id: pl._id }, { seed: 1, lastPlayedAt: new Date().getTime() })
    self.currentSong = pl
    self.currentSong.volume = self.getVolume(self, self.currentSong)
    socket.emit('videoID', self.currentSong)
    return
  }

  // nothing to send
  socket.emit('videoID', null)
}

Songs.prototype.help = function () {
  global.commons.sendMessage(global.translate('core.usage') + ': !playlist add <youtubeid> | !playlist remove <youtubeid> | !playlist ban <youtubeid> | !playlist random on/off | !playlist steal', {username: config.settings.broadcaster_username})
}

Songs.prototype.addSongToQueue = async function (self, sender, text) {
  if (text.length < 1 || !global.configuration.getValue('songs_songrequest')) {
    if (global.configuration.getValue('songs_songrequest')) {
      global.commons.sendMessage(global.translate('core.usage') + ': !songrequest <video-id|video-url|search-string>', sender)
    } else {
      global.commons.sendMessage('$sender, ' + global.translate('songs.settings.songrequest.false'), sender)
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
    global.commons.sendMessage(global.translate('songs.isBanned'), sender)
    return
  }

  ytdl.getInfo('https://www.youtube.com/watch?v=' + videoID, function (err, videoInfo) {
    if (err) return global.log.error(err, { fnc: 'Songs.prototype.addSongToQueue#1' })
    if (_.isUndefined(videoInfo) || _.isUndefined(videoInfo.title) || _.isNull(videoInfo.title)) {
      global.commons.sendMessage(global.translate('songs.notFound'), sender)
    } else if (videoInfo.length_seconds / 60 > global.configuration.getValue('songs_duration')) global.commons.sendMessage(global.translate('songs.tooLong'), sender)
    else {
      global.db.engine.update('songrequests', { addedAt: new Date().getTime() }, { videoID: videoID, title: videoInfo.title, addedAt: new Date().getTime(), loudness: videoInfo.loudness, length_seconds: videoInfo.length_seconds, username: sender.username })
      global.commons.sendMessage(global.translate('songs.addedSong').replace(/\$title/g, videoInfo.title), sender)
      self.getMeanLoudness(self)
    }
  })
}

Songs.prototype.removeSongFromQueue = async function (self, sender, text) {
  let sr = await global.db.engine.find('songrequests', { username: sender.username })
  sr = _.head(_.orderBy(sr, ['addedAt'], ['desc']))
  if (!_.isNil(sr)) await global.db.engine.remove('songrequests', { username: sender.username, _id: sr._id })
  self.getMeanLoudness(self)
}

Songs.prototype.addSongToPlaylist = async function (self, sender, text) {
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
    global.commons.sendMessage(global.translate('songs.alreadyInPlaylist').replace(/\$title/g, playlist.title), sender)
    return
  }

  ytdl.getInfo('https://www.youtube.com/watch?v=' + videoID, function (err, videoInfo) {
    if (err) global.log.error(err, { fnc: 'Songs.prototype.addSongToPlaylist#1' })
    if (_.isUndefined(videoInfo) || _.isUndefined(videoInfo.title) || _.isNull(videoInfo.title)) {
      global.commons.sendMessage(global.translate('songs.notFound'), sender)
      return
    }
    global.bot.engine.update('playlist', { videoID: videoID }, {videoID: videoID, title: videoInfo.title, loudness: videoInfo.loudness, length_seconds: videoInfo.length_seconds, lastPlayedAt: new Date().getTime(), seed: 1})
    global.commons.sendMessage(global.translate('songs.addedSongPlaylist').replace(/\$title/g, videoInfo.title), sender)
    self.sendPlaylistList(self, global.panel.io)
    self.getMeanLoudness(self)
  })
}

Songs.prototype.removeSongFromPlaylist = function (self, sender, text) {
  if (text.length < 1) return
  var videoID = text.trim()

  ytdl.getInfo('https://www.youtube.com/watch?v=' + videoID, async function (err, videoInfo) {
    if (err) global.log.error(err, { fnc: 'Songs.prototype.removeSongFromPlaylist#1' })
    if (_.isUndefined(videoInfo) || _.isUndefined(videoInfo.title) || _.isNull(videoInfo.title)) {
      global.commons.sendMessage(global.translate('songs.notFound'), sender)
      return
    }

    let removed = await global.db.engine.remove('playlist', { videoID: videoID })
    if (removed > 0) {
      global.commons.sendMessage(global.translate('songs.removeSongPlaylist').replace(/\$title/g, videoInfo.title), sender)
      self.getMeanLoudness(self)
      self.sendPlaylistList(self, global.panel.io)
    }
  })
}

module.exports = new Songs()

'use strict'

var chalk = require('chalk')
var constants = require('../constants')
var _ = require('lodash')
var ytdl = require('ytdl-core')
var log = global.log

function Songs () {
  if (global.configuration.get().systems.songs === true) {
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

    global.configuration.register('volume', 'songs.settings.volume', 'number', 25)
    global.configuration.register('duration', 'songs.settings.duration', 'number', 10)
    global.configuration.register('shuffle', 'songs.settings.shuffle', 'bool', false)

    this.getMeanLoudness(this)
    this.webPanel()
  }

  log.info('Songs system loaded and ' + (global.configuration.get().systems.songs === true ? chalk.green('enabled') : chalk.red('disabled')))
}

Songs.prototype.webPanel = function () {
  global.panel.addMenu({category: 'systems', name: 'Songs', id: 'songs'})
  global.panel.addWidget('ytplayer', 'YouTube player', 'music')
  global.panel.addWidget('songrequests', 'Song Requests', 'list-alt')

  global.panel.socketListening(this, 'getVideoID', this.sendNextSongID)
  global.panel.socketListening(this, 'getSongRequests', this.sendSongRequestsList)
  global.panel.socketListening(this, 'getPlaylist', this.sendPlaylistList)

  global.panel.socketListening(this, 'getSongsConfiguration', this.sendConfiguration)

  global.panel.socketListening(this, 'setTrim', this.setTrim)

  global.panel.socketListening(this, 'banSong', this.banCurrentSong)
  global.panel.socketListening(this, 'stealSong', this.stealSongToPlaylist)
  global.panel.socketListening(this, 'skipSong', this.skipSong)
}

Songs.prototype.getMeanLoudness = function (self) {
  var loudness = 0
  var count = 0
  global.botDB.find({type: 'playlist'}).exec(function (err, items) {
    if (err) log.error(err)
    if (items.length < 1) self.meanLoudness = -15
    else {
      _.each(items, function (item) { (typeof item.loudness === 'undefined') ? loudness = loudness + -15 : loudness = loudness + parseFloat(item.loudness); count = count + 1 })
      self.meanLoudness = loudness / count
    }
  })
}

Songs.prototype.getVolume = function (self, item) {
  item.loudness = typeof item.loudness !== 'undefined' ? item.loudness : -15
  var correction = Math.ceil((global.configuration.getValue('volume') / 100) * 3)
  var loudnessDiff = parseFloat(parseFloat(self.meanLoudness) - item.loudness)
  return Math.round(global.configuration.getValue('volume') + correction * loudnessDiff)
}

Songs.prototype.setTrim = function (self, socket, data) {
  self.savePlaylistTrim(data.id, data.lowValue, data.highValue)
}

Songs.prototype.sendConfiguration = function (self, socket) {
  socket.emit('songsConfiguration', {
    volume: global.configuration.getValue('volume'),
    shuffle: global.configuration.getValue('shuffle'),
    duration: global.configuration.getValue('duration')
  })
}

Songs.prototype.banSong = function (self, sender, text) {
  text.trim().length === 0 ? self.banCurrentSong(self, sender) : self.banSongById(self, sender, text.trim())
}

Songs.prototype.banCurrentSong = function (self, sender) {
  global.botDB.update({type: 'banned-song', _id: self.currentSong.videoID}, {$set: {_id: self.currentSong.videoID, title: self.currentSong.title}}, {upsert: true}, function (err, numAffected) {
    if (err) log.error(err)
    if (numAffected > 0) {
      global.commons.sendMessage(global.translate('songs.bannedSong').replace('(title)', self.currentSong.title), sender)
      global.commons.remove({_type: 'playlist', _videoID: self.currentSong.videoID})
      global.commons.remove({_type: 'songrequest', _videoID: self.currentSong.videoID})
      global.commons.timeout(self.currentSong.username, global.translate('songs.bannedSongTimeout'), 300)
      self.getMeanLoudness(self)
      self.sendNextSongID(self, global.panel.io)
      self.sendPlaylistList(self, global.panel.io)
    }
  })
}

Songs.prototype.banSongById = function (self, sender, text) {
  ytdl.getInfo('https://www.youtube.com/watch?v=' + text, function (err, videoInfo) {
    if (err) log.error(err)
    if (typeof videoInfo.title === 'undefined' || videoInfo.title === null) return
    global.botDB.update({type: 'banned-song', _id: text}, {$set: {_id: text, title: videoInfo.title}}, {upsert: true}, function (err, numAffected) {
      if (err) log.error(err)
      if (numAffected > 0) global.commons.sendMessage(global.translate('songs.bannedSong').replace('(title)', videoInfo.title), sender)
      global.commons.remove({_type: 'playlist', _videoID: text.trim()})
      global.commons.remove({_type: 'songrequest', _videoID: text.trim()})
      self.getMeanLoudness(self)
      self.sendNextSongID(self, global.panel.io)
      self.sendPlaylistList(self, global.panel.io)
    })
  })
}

Songs.prototype.unbanSong = function (self, sender, text) {
  var data = {_type: 'banned-song', __id: text.trim(), success: 'songs.unbannedSong', error: 'songs.notBannedSong'}
  if (data.__id.length > 1) global.commons.remove(data)
}

Songs.prototype.getCurrentSong = function (self) {
  try {
    global.commons.sendMessage(global.translate('songs.currentSong').replace('(title)', self.currentSong.title), {username: global.configuration.get().twitch.owner})
  } catch (err) {
    global.commons.sendMessage(global.translate('songs.noCurrentSong'), {username: global.configuration.get().twitch.owner})
  }
}

Songs.prototype.stealSongToPlaylist = function (self) {
  try {
    self.addSongToPlaylist(self, null, self.currentSong.videoID)
  } catch (err) {
    global.commons.sendMessage(global.translate('songs.noCurrentSong'), {username: global.configuration.get().twitch.owner})
  }
}

Songs.prototype.skipSong = function (self, socket) {
  self.sendNextSongID(self, socket)
}

Songs.prototype.createRandomSeeds = function () {
  global.botDB.find({type: 'playlist'}, function (err, items) {
    if (err) log.error(err)
    _.each(items, function (item) { global.botDB.update({_id: item._id}, {$set: {seed: Math.random()}}) })
  })
}

Songs.prototype.sendSongRequestsList = function (self, socket) {
  global.botDB.find({type: 'songRequests'}).sort({addedAt: 1}).exec(function (err, items) {
    if (err) log.error(err)
    socket.emit('songRequestsList', items)
  })
}

Songs.prototype.sendPlaylistList = function (self, socket) {
  global.botDB.find({type: 'playlist'}).sort({addedAt: 1}).exec(function (err, items) {
    if (err) log.error(err)
    _.each(items, function (item) { item.volume = self.getVolume(self, item) })
    socket.emit('songPlaylistList', items)
  })
}

Songs.prototype.savePlaylistTrim = function (id, startTime, endTime) {
  global.botDB.update({type: 'playlist', videoID: id}, {$set: {startTime: startTime, endTime: endTime}}, {})
}

Songs.prototype.sendNextSongID = function (self, socket) {
  // first, check if there are any requests
  global.botDB.findOne({type: 'songRequests'}).sort({addedAt: 1}).exec(function (err, item) {
    if (err) log.error(err)
    if (typeof item !== 'undefined' && item !== null) { // song is found
      self.currentSong = item
      self.currentSong.volume = self.getVolume(self, self.currentSong)
      socket.emit('videoID', self.currentSong)
      global.botDB.remove({type: 'songRequests', videoID: item.videoID}, {})
    } else { // run from playlist
      if (global.configuration.getValue('shuffle')) {
        global.botDB.findOne({type: 'playlist'}).sort({seed: 1}).exec(function (err, item) {
          if (err) log.error(err)
          if (typeof item !== 'undefined' && item !== null) { // song is found
            if (item.seed === 1) {
              self.createRandomSeeds()
              self.sendNextSongID(self, socket) // retry with new seeds
            } else {
              global.botDB.update({_id: item._id}, {$set: {seed: 1}})
              self.currentSong = item
              self.currentSong.volume = self.getVolume(self, self.currentSong)
              socket.emit('videoID', self.currentSong)
            }
          } else {
            socket.emit('videoID', null)
          }
        })
      } else {
        global.botDB.findOne({type: 'playlist'}).sort({lastPlayedAt: 1}).exec(function (err, item) {
          if (err) log.error(err)
          if (typeof item !== 'undefined' && item !== null) { // song is found
            global.botDB.update({type: 'playlist', videoID: item.videoID}, {$set: {lastPlayedAt: new Date().getTime()}}, {})
            self.currentSong = item
            self.currentSong.volume = self.getVolume(self, self.currentSong)
            socket.emit('videoID', self.currentSong)
          } else {
            socket.emit('videoID', null)
          }
        })
      }
    }
  })
}

Songs.prototype.help = function () {
  global.commons.sendMessage(global.translate('core.usage') + ': !playlist add <youtubeid> | !playlist remove <youtubeid> | !playlist ban <youtubeid> | !playlist random on/off | !playlist steal', {username: global.configuration.get().twitch.owner})
}

Songs.prototype.addSongToQueue = function (self, sender, text) {
  if (text.length < 1) {
    global.commons.sendMessage(global.translate('core.usage') + ': !songrequest <video-id|video-url>', sender)
    return
  }
  var urlRegex = /^.*(?:youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#&\?]*).*/
  var match = text.trim().match(urlRegex)
  var videoID = (match && match[1].length === 11) ? match[1] : text.trim()
  global.botDB.findOne({type: 'song-banned', _id: videoID}, function (err, item) {
    if (err) log.error(err)
    if (!_.isNull(item)) global.commons.sendMessage(global.translate('songs.isBanned'), sender)
    else {
      ytdl.getInfo('https://www.youtube.com/watch?v=' + videoID, function (err, videoInfo) {
        if (err) log.error(err)
        if (_.isUndefined(videoInfo) || _.isUndefined(videoInfo.title) || _.isNull(videoInfo.title)) {
          global.commons.sendMessage(global.translate('songs.notFound'), sender)
        } else if (videoInfo.length_seconds / 60 > global.configuration.getValue('duration')) global.commons.sendMessage(global.translate('songs.tooLong'), sender)
        else {
          global.botDB.insert({type: 'songRequests', videoID: videoID, title: videoInfo.title, addedAt: new Date().getTime(), loudness: videoInfo.loudness, length_seconds: videoInfo.length_seconds, username: sender.username})
          global.commons.sendMessage(global.translate('songs.addedSong').replace('(title)', videoInfo.title), sender)
          self.getMeanLoudness(self)
        }
      })
    }
  })
}

Songs.prototype.removeSongFromQueue = function (self, sender, text) {
  global.botDB.findOne({type: 'songRequests', username: sender.username}).sort({addedAt: -1}).exec(function (err, item) {
    if (err) log.error(err)
    if (typeof item === 'undefined' || item === null) return
    global.botDB.remove({type: 'songRequests', videoID: item.videoID}, {}, function (err, numRemoved) {
      if (err) log.error(err)
      if (numRemoved > 0) global.commons.sendMessage(global.translate('songs.removeSongQueue').replace('(title)', item.title), sender)
      self.getMeanLoudness(self)
    })
  })
}

Songs.prototype.addSongToPlaylist = function (self, sender, text) {
  var urlRegex = /^.*(?:youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#&\?]*).*/
  var match = text.trim().match(urlRegex)
  var videoID = (match && match[1].length === 11) ? match[1] : text.trim()
  global.botDB.findOne({type: 'song-banned', _id: videoID}, function (err, item) {
    if (err) log.error(err)
    if (!_.isNull(item)) global.commons.sendMessage(global.translate('songs.isBanned'), sender)
    else {
      global.botDB.findOne({type: 'playlist', videoID: videoID}, function (err, item) {
        if (err) log.error(err)
        if (typeof item === 'undefined' || item === null) {
          ytdl.getInfo('https://www.youtube.com/watch?v=' + videoID, function (err, videoInfo) {
            if (err) log.error(err)
            global.botDB.insert({type: 'playlist', videoID: videoID, title: videoInfo.title, loudness: videoInfo.loudness, length_seconds: videoInfo.length_seconds, lastPlayedAt: new Date().getTime(), seed: 1})
            global.commons.sendMessage(global.translate('songs.addedSongPlaylist').replace('(title)', videoInfo.title), sender)
            self.sendPlaylistList(self, global.panel.io)
            self.getMeanLoudness(self)
          })
        } else {
          global.commons.sendMessage(global.translate('songs.alreadyInPlaylist').replace('(title)', item.title), sender)
        }
      })
    }
  })
}

Songs.prototype.removeSongFromPlaylist = function (self, sender, text) {
  if (text.length < 1) return

  var videoID = text.trim()

  ytdl.getInfo('https://www.youtube.com/watch?v=' + videoID, function (err, videoInfo) {
    if (err) log.error(err)
    global.botDB.remove({type: 'playlist', videoID: videoID}, {}, function (err, numRemoved) {
      if (err) log.error(err)
      if (numRemoved > 0) global.commons.sendMessage(global.translate('songs.removeSongPlaylist').replace('(title)', videoInfo.title), sender)
      self.getMeanLoudness(self)
      self.sendPlaylistList(self, global.panel.io)
    })
  })
}

module.exports = new Songs()

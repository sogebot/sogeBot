'use strict'

var chalk = require('chalk')
var constants = require('../constants')
var _ = require('lodash')
var ytdl = require('ytdl-core')

function Songs () {
  if (global.configuration.get().systems.songs === true) {
    this.currentSong = {}

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

    global.configuration.register('volume', 'songs.settings.volume', 'number', 25)
    global.configuration.register('duration', 'songs.settings.duration', 'number', 10)
    global.configuration.register('shuffle', 'songs.settings.shuffle', 'bool', false)

    this.webPanel()
  }

  console.log('Songs system loaded and ' + (global.configuration.get().systems.songs === true ? chalk.green('enabled') : chalk.red('disabled')))
}

Songs.prototype.webPanel = function () {
  global.panel.addMenu({category: 'main', icon: 'music', name: 'songs'})
  global.panel.addWidget('ytplayer', 'YouTube player', 'music')
  global.panel.addWidget('songrequests', 'Song Requests', 'list-alt')

  global.panel.socketListening(this, 'getVideoID', this.sendNextSongID)
  global.panel.socketListening(this, 'getMeanLoudness', this.sendMeanLoudness)
  global.panel.socketListening(this, 'getVolume', this.sendVolume)
  global.panel.socketListening(this, 'getSongRequests', this.sendSongRequestsList)
  global.panel.socketListening(this, 'getPlaylist', this.sendPlaylistList)
  global.panel.socketListening(this, 'getRandomize', this.sendRandomize)

  global.panel.socketListening(this, 'banSong', this.banCurrentSong)
  global.panel.socketListening(this, 'stealSong', this.stealSongToPlaylist)
  global.panel.socketListening(this, 'skipSong', this.skipSong)
/*
  socket.on('setTrim', function (id, start, end) {
    self.savePlaylistTrim(id, start, end)
  })
*/
}

Songs.prototype.sendVolume = function (self, socket) {
  socket.emit('volume', global.configuration.getValue('volume'))
}

Songs.prototype.sendRandomize = function (self, socket) {
  socket.emit('shuffle', global.configuration.getValue('shuffle'))
}

Songs.prototype.banSong = function (self, sender, text) {
  text.trim().length === 0 ? self.banCurrentSong(self, sender) : self.banSongById(self, sender, text.trim())
}

Songs.prototype.banCurrentSong = function (self, sender) {
  global.botDB.update({type: 'banned-song', _id: self.currentSong.videoID}, {$set: {_id: self.currentSong.videoID, title: self.currentSong.title}}, {upsert: true}, function (err, numAffected) {
    if (err) console.log(err)
    if (numAffected > 0) {
      global.commons.sendMessage(global.translate('songs.bannedSong').replace('(title)', self.currentSong.title))
      global.commons.remove({_type: 'playlist', _videoID: self.currentSong.videoID})
      global.commons.remove({_type: 'songrequest', _videoID: self.currentSong.videoID})
      global.commons.timeout(self.currentSong.username, global.translate('songs.bannedSongTimeout'), 300)
      self.sendNextSongID(self, global.panel.socket)
      self.sendPlaylistList(self, global.panel.socket)
    }
  })
}

Songs.prototype.banSongById = function (self, sender, text) {
  ytdl.getInfo('https://www.youtube.com/watch?v=' + text, function (err, videoInfo) {
    if (err) console.log(err)
    if (typeof videoInfo.title === 'undefined' || videoInfo.title === null) return
    global.botDB.update({type: 'banned-song', _id: text}, {$set: {_id: text, title: videoInfo.title}}, {upsert: true}, function (err, numAffected) {
      if (err) console.log(err)
      if (numAffected > 0) global.commons.sendMessage(global.translate('songs.bannedSong').replace('(title)', videoInfo.title))
      global.commons.remove({_type: 'playlist', _videoID: text.trim()})
      global.commons.remove({_type: 'songrequest', _videoID: text.trim()})
      self.sendNextSongID(self, global.panel.socket)
      self.sendPlaylistList(self, global.panel.socket)
    })
  })
}

Songs.prototype.unbanSong = function (self, sender, text) {
  var data = {_type: 'banned-song', __id: text.trim(), success: 'songs.unbannedSong', error: 'songs.notBannedSong'}
  if (data.__id.length > 1) global.commons.remove(data)
}

Songs.prototype.getCurrentSong = function (self) {
  try {
    global.commons.sendMessage(global.translate('songs.currentSong').replace('(items)', self.currentSong.title))
  } catch (err) {
    global.commons.sendMessage(global.translate('songs.noCurrentSong'))
  }
}

Songs.prototype.stealSongToPlaylist = function (self) {
  try {
    self.addSongToPlaylist(self, null, self.currentSong.videoID)
  } catch (err) {
    global.commons.sendMessage(global.translate('songs.noCurrentSong'))
  }
}

Songs.prototype.skipSong = function (self, socket) {
  self.sendNextSongID(self, socket)
}

Songs.prototype.createRandomSeeds = function () {
  global.botDB.find({type: 'playlist'}, function (err, items) {
    if (err) console.log(err)
    _.each(items, function (item) { global.botDB.update({_id: item._id}, {$set: {seed: Math.random()}}) })
  })
}

Songs.prototype.sendMeanLoudness = function (self, socket) {
  var loudness = 0
  var count = 0
  global.botDB.find({type: 'playlist'}).exec(function (err, items) {
    if (err) console.log(err)
    if (items.length < 1) socket.emit('meanLoudness', -15)
    else {
      _.each(items, function (item) { (typeof item.loudness === 'undefined') ? loudness = loudness + -15 : loudness = loudness + parseFloat(item.loudness); count = count + 1 })
      socket.emit('meanLoudness', loudness / count)
    }
  })
}

Songs.prototype.sendSongRequestsList = function (self, socket) {
  global.botDB.find({type: 'songRequests'}).sort({addedAt: 1}).exec(function (err, items) {
    if (err) console.log(err)
    socket.emit('songRequestsList', items)
  })
}

Songs.prototype.sendPlaylistList = function (self, socket) {
  global.botDB.find({type: 'playlist'}).sort({addedAt: 1}).exec(function (err, items) {
    if (err) console.log(err)
    socket.emit('songPlaylistList', items)
  })
}

Songs.prototype.savePlaylistTrim = function (id, startTime, endTime) {
  global.botDB.update({type: 'playlist', videoID: id}, {$set: {startTime: startTime, endTime: endTime}}, {})
}

Songs.prototype.sendNextSongID = function (self, socket) {
  // first, check if there are any requests
  global.botDB.findOne({type: 'songRequests'}).sort({addedAt: 1}).exec(function (err, item) {
    if (err) console.log(err)
    if (typeof item !== 'undefined' && item !== null) { // song is found
      socket.emit('videoID', item)
      self.currentSong = item
      global.botDB.remove({type: 'songRequests', videoID: item.videoID}, {})
    } else { // run from playlist
      if (global.configuration.getValue('shuffle')) {
        global.botDB.findOne({type: 'playlist'}).sort({seed: 1}).exec(function (err, item) {
          if (err) console.log(err)
          if (typeof item !== 'undefined' && item !== null) { // song is found
            if (item.seed === 1) {
              self.createRandomSeeds()
              self.sendNextSongID(self, socket) // retry with new seeds
            } else {
              global.botDB.update({_id: item._id}, {$set: {seed: 1}})
              self.currentSong = item
              socket.emit('videoID', item)
            }
          } else {
            socket.emit('videoID', null)
          }
        })
      } else {
        global.botDB.findOne({type: 'playlist'}).sort({lastPlayedAt: 1}).exec(function (err, item) {
          if (err) console.log(err)
          if (typeof item !== 'undefined' && item !== null) { // song is found
            global.botDB.update({type: 'playlist', videoID: item.videoID}, {$set: {lastPlayedAt: new Date().getTime()}}, {})
            self.currentSong = item
            socket.emit('videoID', item)
          } else {
            socket.emit('videoID', null)
          }
        })
      }
    }
  })
}

Songs.prototype.help = function () {
  global.commons.sendMessage(global.translate('core.usage') + ': !playlist add <youtubeid> | !playlist remove <youtubeid> | !playlist ban <youtubeid> | !playlist random on/off | !playlist steal')
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
    if (err) console.log(err)
    if (!_.isNull(item)) global.commons.sendMessage(global.translate('songs.isBanned'), sender)
    else {
      ytdl.getInfo('https://www.youtube.com/watch?v=' + videoID, function (err, videoInfo) {
        if (err) console.log(err)
        if (_.isUndefined(videoInfo) || _.isUndefined(videoInfo.title) || _.isNull(videoInfo.title)) {
          global.commons.sendMessage(global.translate('songs.notFound'), sender)
        } else if (videoInfo.length_seconds / 60 > global.configuration.getValue('duration')) global.commons.sendMessage(global.translate('songs.tooLong'), sender)
        else {
          global.botDB.insert({type: 'songRequests', videoID: videoID, title: videoInfo.title, addedAt: new Date().getTime(), loudness: videoInfo.loudness, length_seconds: videoInfo.length_seconds, username: sender.username})
          global.commons.sendMessage(global.translate('songs.addedSong').replace('(title)', videoInfo.title), sender)
        }
      })
    }
  })
}

Songs.prototype.removeSongFromQueue = function (self, user, text) {
  global.botDB.findOne({type: 'songRequests', username: user.username}).sort({addedAt: -1}).exec(function (err, item) {
    if (err) console.log(err)
    if (typeof item === 'undefined' || item === null) return
    global.botDB.remove({type: 'songRequests', videoID: item.videoID}, {}, function (err, numRemoved) {
      if (err) console.log(err)
      if (numRemoved > 0) global.commons.sendMessage(global.translate('songs.removeSongQueue').replace('(title)', item.title), user)
    })
  })
}

Songs.prototype.addSongToPlaylist = function (self, sender, text) {
  var urlRegex = /^.*(?:youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#&\?]*).*/
  var match = text.trim().match(urlRegex)
  var videoID = (match && match[1].length === 11) ? match[1] : text.trim()
  global.botDB.findOne({type: 'song-banned', _id: videoID}, function (err, item) {
    if (err) console.log(err)
    if (!_.isNull(item)) global.commons.sendMessage(global.translate('songs.isBanned'), sender)
    else {
      global.botDB.findOne({type: 'playlist', videoID: videoID}, function (err, item) {
        if (err) console.log(err)
        if (typeof item === 'undefined' || item === null) {
          ytdl.getInfo('https://www.youtube.com/watch?v=' + videoID, function (err, videoInfo) {
            if (err) console.log(err)
            global.botDB.insert({type: 'playlist', videoID: videoID, title: videoInfo.title, loudness: videoInfo.loudness, length_seconds: videoInfo.length_seconds, lastPlayedAt: new Date().getTime()})
            global.commons.sendMessage(global.translate('songs.addedSongPlaylist').replace('(title)', videoInfo.title), sender)
            self.createRandomSeeds()
          })
        } else {
          global.commons.sendMessage(global.translate('songs.alreadyInPlaylist').replace('(title)', item.title), sender)
        }
      })
    }
  })
}

Songs.prototype.removeSongFromPlaylist = function (self, user, text) {
  if (text.length < 1) return

  var videoID = text.trim()

  ytdl.getInfo('https://www.youtube.com/watch?v=' + videoID, function (err, videoInfo) {
    if (err) console.log(err)
    global.botDB.remove({type: 'playlist', videoID: videoID}, {}, function (err, numRemoved) {
      if (err) console.log(err)
      if (numRemoved > 0) global.commons.sendMessage(global.translate('songs.removeSongPlaylist').replace('(title)', videoInfo.title), user)
      self.sendPlaylistList(self, global.panel.socket)
    })
  })
}

module.exports = new Songs()

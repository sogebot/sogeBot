'use strict'

var chalk = require('chalk')
var constants = require('../constants')
var http = require('http')
var fs = require('fs')
var auth = require('http-auth')
var _ = require('underscore')
var ytdl = require('ytdl-core')

function Songs () {
  if (global.configuration.get().systems.songs === true) {
    this.socketPointer = null
    this.currentSong = {}
    this.randomIndex = 0
    this.checkIfRandomizeIsSaved()

    global.parser.register(this, '!songrequest', this.addSongToQueue, constants.VIEWERS)
    global.parser.register(this, '!wrongsong', this.removeSongFromQueue, constants.VIEWERS)
    global.parser.register(this, '!currentsong', this.getCurrentSong, constants.VIEWERS)
    global.parser.register(this, '!skipsong', this.skipSong, constants.OWNER_ONLY)
    global.parser.register(this, '!playlist add', this.addSongToPlaylist, constants.OWNER_ONLY)
    global.parser.register(this, '!playlist remove', this.removeSongFromPlaylist, constants.OWNER_ONLY)
    global.parser.register(this, '!playlist random', this.randomizePlaylist, constants.OWNER_ONLY)
    global.parser.register(this, '!playlist steal', this.stealSongToPlaylist, constants.OWNER_ONLY)
    global.parser.register(this, '!playlist', this.help, constants.OWNER_ONLY)

    var basic = auth.basic({
      realm: 'YTPlayer'
    }, function (username, password, callback) {
      callback(username === global.configuration.get().ytplayer.username && password === global.configuration.get().ytplayer.password)
    })
    var server = http.createServer(basic, this.handleRequest)
    var io = require('socket.io')(server)

    server.listen(global.configuration.get().ytplayer.port, function () {
      console.log('Songs system listening on %s and endpoint /ytplayer', global.configuration.get().ytplayer.port)
    })

    var self = this
    io.on('connection', function (socket) {
      self.socketPointer = socket
      self.addSocketListening(self, socket)
    })
  }

  console.log('Songs system loaded and ' + (global.configuration.get().systems.songs === true ? chalk.green('enabled') : chalk.red('disabled')))
}

Songs.prototype.getCurrentSong = function (self) {
  try {
    global.client.action(global.configuration.get().twitch.owner, 'Current song is ' + self.currentSong.title)
  } catch (err) {
    global.client.action(global.configuration.get().twitch.owner, 'No song is currently playing')
  }
}

Songs.prototype.stealSongToPlaylist = function (self) {
  try {
    self.addSongToPlaylist(self, null, self.currentSong.videoID)
  } catch (err) {
    global.client.action(global.configuration.get().twitch.owner, 'No song is currently playing')
  }
}

Songs.prototype.skipSong = function (self) {
  self.socketPointer.emit('skipSong')
}

Songs.prototype.checkIfRandomizeIsSaved = function () {
  global.botDB.findOne({type: 'settings', playlistRandomize: {$exists: true}}, function (err, item) {
    if (err) console.log(err)
    if (typeof item === 'undefined' || item === null) {
      global.botDB.insert({type: 'settings', playlistRandomize: false})
    }
  })
}

Songs.prototype.randomizePlaylist = function (self, sender, text) {
  if (text.length < 1) return

  if (text.trim() === 'on') {
    global.botDB.update({type: 'settings', playlistRandomize: {$exists: true}}, {$set: {playlistRandomize: true}}, {}, function (err, numUpdated) {
      if (err) console.log(err)
      if (numUpdated) global.client.action(global.configuration.get().twitch.owner, 'Playlist will play randomly now.')
    })
  } else {
    global.botDB.update({type: 'settings', playlistRandomize: {$exists: true}}, {$set: {playlistRandomize: false}}, {}, function (err, numUpdated) {
      if (err) console.log(err)
      if (numUpdated) global.client.action(global.configuration.get().twitch.owner, "Playlist won't play randomly now.")
    })
  }
}

Songs.prototype.addSocketListening = function (self, socket) {
  socket.on('getVideoID', function () {
    self.sendNextSongID(socket)
  })
  socket.on('getSongRequests', function () {
    self.sendSongRequestsList(socket)
  })
  socket.on('getPlaylist', function () {
    self.sendPlaylistList(socket)
  })
  socket.on('getRandomize', function () {
    self.sendRandomizeStatus(socket)
  })
  socket.on('getMeanLoudness', function () {
    self.sendMeanLoudness(socket)
  })
}

Songs.prototype.sendRandomizeStatus = function (socket) {
  global.botDB.findOne({playlistRandomize: {$exists: true}}).exec(function (err, item) {
    if (err) console.log(err)
    socket.emit('playlistRandomize', item)
  })
}

Songs.prototype.sendMeanLoudness = function (socket) {
  var loudness = 0
  var count = 0
  global.botDB.find({type: 'playlist'}).exec(function (err, items) {
    if (err) console.log(err)
    _.each(items, function (item) { count = count + 1; loudness = loudness + parseFloat(item.loudness) })
    socket.emit('meanLoudness', loudness / count)
  })
}

Songs.prototype.sendSongRequestsList = function (socket) {
  global.botDB.find({type: 'songRequests'}).sort({addedAt: 1}).exec(function (err, items) {
    if (err) console.log(err)
    socket.emit('songRequestsList', items)
  })
}

Songs.prototype.sendPlaylistList = function (socket) {
  global.botDB.find({type: 'playlist'}).sort({addedAt: 1}).exec(function (err, items) {
    if (err) console.log(err)
    socket.emit('songPlaylistList', items)
  })
}

Songs.prototype.sendNextSongID = function (socket) {
  var self = this
  // first, check if there are any requests
  global.botDB.findOne({type: 'songRequests'}).sort({addedAt: 1}).exec(function (err, item) {
    if (err) console.log(err)
    if (typeof item !== 'undefined' && item !== null) { // song is found
      socket.emit('videoID', item.videoID)
      self.currentSong.title = item.title
      self.currentSong.videoID = item.videoID
      global.botDB.remove({type: 'songRequests', videoID: item.videoID}, {})
    } else { // run from playlist
      global.botDB.findOne({type: 'settings', playlistRandomize: {$exists: true}}, function (err, item) {
        if (err) console.log(err)

        var isRandom = item.playlistfetchVideoInfoRandomize
        if (isRandom) {
          global.botDB.find({type: 'playlist'}).sort({_id: 1}).exec(function (err, items) {
            var randomSongIndex = 0
            if (err) console.log(err)
            while (randomSongIndex === self.randomIndex) {
              randomSongIndex = Math.floor((Math.random() * items.length))
            }
            self.randomIndex = randomSongIndex
            socket.emit('videoID', items[self.randomIndex])
          })
        } else {
          global.botDB.findOne({type: 'playlist'}).sort({lastPlayedAt: 1}).exec(function (err, item) {
            if (err) console.log(err)
            if (typeof item !== 'undefined' && item !== null) { // song is found
              global.botDB.update({type: 'playlist', videoID: item.videoID}, {$set: {lastPlayedAt: new Date().getTime()}}, {})
              socket.emit('videoID', item)
            }
          })
        }
      })
    }
  })
}

Songs.prototype.handleRequest = function (request, response) {
  if (request.url === '/ytplayer') {
    fs.readFile('./public/ytplayer.html', 'binary', function (err, file) {
      if (err) {
        response.writeHead(500, {'Content-Type': 'text/plain'})
        response.write(err + '\n')
        response.end()
        return
      }

      response.writeHead(200)
      response.write(file, 'binary')
      response.end()
    })
  } else {
    response.writeHead(404, {'Content-Type': 'text/plain'})
    response.write('404 Not Found\n')
    response.end()
  }
}

Songs.prototype.help = function () {
  global.client.action(global.configuration.get().twitch.owner,
    '!playlist add <youtubeid> | !playlist remove <youtubeid> | !playlist ban <youtubeid> | !playlist random on/off | !playlist steal')
}

Songs.prototype.addSongToQueue = function (self, user, text) {
  if (text.length < 1) return

  var videoID = text.trim()

  ytdl.getInfo('https://www.youtube.com/watch?v=' + videoID, function (err, videoInfo) {
    if (err) console.log(err)
    if (typeof videoInfo.title === 'undefined' || videoInfo.title === null) return
    global.botDB.insert({type: 'songRequests', videoID: videoID, title: videoInfo.title, addedAt: new Date().getTime(), loudness: videoInfo.loudness, length_seconds: videoInfo.length_seconds, username: user.username})
    global.client.action(global.configuration.get().twitch.owner, videoInfo.title + ' was added to queue requested by ' + user.username)
  })
}

Songs.prototype.removeSongFromQueue = function (self, user, text) {
  global.botDB.findOne({type: 'songRequests', username: user.username}).sort({addedAt: -1}).exec(function (err, item) {
    if (err) console.log(err)
    if (typeof item === 'undefined' || item === null) return
    global.botDB.remove({type: 'songRequests', videoID: item.videoID}, {}, function (err, numRemoved) {
      if (err) console.log(err)
      if (numRemoved > 0) global.client.action(global.configuration.get().twitch.owner, item.title + ' was removed from queue')
    })
  })
}

Songs.prototype.addSongToPlaylist = function (self, user, text) {
  if (text.length < 1) return

  var videoID = text.trim()
  global.botDB.findOne({type: 'playlist', videoID: videoID}, function (err, item) {
    if (err) console.log(err)

    if (typeof item === 'undefined' || item === null) {
      ytdl.getInfo('https://www.youtube.com/watch?v=' + videoID, function (err, videoInfo) {
        if (err) console.log(err)
        global.botDB.insert({type: 'playlist', videoID: videoID, title: videoInfo.title, loudness: videoInfo.loudness, length_seconds: videoInfo.length_seconds, lastPlayedAt: new Date().getTime()})
        global.client.action(global.configuration.get().twitch.owner, videoInfo.title + ' was added to playlist')
      })
    } else {
      global.client.action(global.configuration.get().twitch.owner, 'Song ' + item.title + ' is already in playlist')
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
      if (numRemoved > 0) global.client.action(global.configuration.get().twitch.owner, videoInfo.title + ' was removed from playlist')
    })
  })
}

module.exports = new Songs()

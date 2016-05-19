'use strict'

var chalk = require('chalk')
var Database = require('nedb')
var constants = require('../constants')
var http = require('http')
var fs = require('fs')

var fetchVideoInfo = require('youtube-info')

var playlist = new Database({
  filename: 'db/playlist.db',
  autoload: true
})
playlist.persistence.setAutocompactionInterval(60000)

var songRequests = new Database({
  filename: 'db/songRequests.db',
  autoload: true
})
songRequests.persistence.setAutocompactionInterval(60000)

function Songs (configuration) {
  if (global.configuration.get().systems.songs === true) {
    this.socketPointer = null
    this.currentSong = {}
    
    global.parser.register(this, '!songrequest', this.addSongToQueue, constants.VIEWERS)
    global.parser.register(this, '!wrongsong', this.removeSongFromQueue, constants.VIEWERS)
    global.parser.register(this, '!currentsong', this.getCurrentSong, constants.VIEWERS)
    global.parser.register(this, '!skipsong', this.skipSong, constants.OWNER_ONLY)
    global.parser.register(this, '!playlist add', this.addSongToPlaylist, constants.OWNER_ONLY)
    global.parser.register(this, '!playlist remove', this.removeSongFromPlaylist, constants.OWNER_ONLY)
    global.parser.register(this, '!playlist random', this.randomizePlaylist, constants.OWNER_ONLY)
    global.parser.register(this, '!playlist steal', this.stealSongToPlaylist, constants.OWNER_ONLY)
    global.parser.register(this, '!playlist', this.help, constants.OWNER_ONLY)

    this.checkIfRandomizeIsSaved()

    var server = http.createServer(this.handleRequest)
    var io = require('socket.io')(server)
    server.listen(global.configuration.get().systems.songsPort, function () {
      console.log('Songs system listening on %s and endpoint /ytplayer', global.configuration.get().systems.songsPort)
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
  self.sendNextSongID(self.socketPointer)
}

Songs.prototype.checkIfRandomizeIsSaved = function () {
  global.cfgDB.findOne({playlistRandomize: {$exists: true}}, function (err, item) {
    if (err) console.log(err)
    if (typeof item === 'undefined' || item === null) {
      global.cfgDB.insert({playlistRandomize: false})
    }
  })
}

Songs.prototype.randomizePlaylist = function (self, sender, text) {
  if (text.length < 1) return

  if (text.trim() === 'on') {
    global.cfgDB.update({playlistRandomize: {$exists: true}}, {$set: {playlistRandomize: true}}, {}, function (err, numUpdated) {
      if (err) console.log(err)
      if (numUpdated) global.client.action(global.configuration.get().twitch.owner, 'Playlist will play randomly now.')
    })
  } else {
    global.cfgDB.update({playlistRandomize: {$exists: true}}, {$set: {playlistRandomize: false}}, {}, function (err, numUpdated) {
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
}

Songs.prototype.sendSongRequestsList = function (socket) {
  songRequests.find({}).sort({addedAt: 1}).exec(function (err, items) {
    if (err) console.log(err)
    socket.emit('songRequestsList', items)
  })
}

Songs.prototype.sendPlaylistList = function (socket) {
  playlist.find({}).sort({addedAt: 1}).exec(function (err, items) {
    if (err) console.log(err)
    socket.emit('songPlaylistList', items)
  })
}

Songs.prototype.sendNextSongID = function (socket) {
  var self = this
  // first, check if there are any requests
  songRequests.findOne({}).sort({addedAt: 1}).exec(function (err, item) {
    if (err) console.log(err)
    if (typeof item !== 'undefined' && item !== null) { // song is found
      socket.emit('videoID', item.videoID)
      self.currentSong.title = item.title
      self.currentSong.videoID = item.videoID
      songRequests.remove({ videoID: item.videoID }, {})
    } else { // run from playlist
      global.cfgDB.findOne({playlistRandomize: {$exists: true}}, function (err, item) {
        if (err) console.log(err)

        var isRandom = item.playlistRandomize
        if (isRandom) {
          playlist.find({}).sort().exec(function (err, items) {
            if (err) console.log(err)
            var randomSongIndex = Math.floor((Math.random() * items.length))
            self.currentSong.title = items[randomSongIndex].title
            self.currentSong.videoID = items[randomSongIndex].videoID
            socket.emit('videoID', items[randomSongIndex].videoID)
          })
        } else {
          playlist.findOne({}).sort({lastPlayedAt: 1}).exec(function (err, item) {
            if (err) console.log(err)
            if (typeof item !== 'undefined' && item !== null) { // song is found
              playlist.update({videoID: item.videoID}, {$set: {lastPlayedAt: new Date().getTime()}}, {})
              self.currentSong.title = item.title
              self.currentSong.videoID = item.videoID
              socket.emit('videoID', item.videoID)
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

  fetchVideoInfo(videoID, function (err, videoInfo) {
    if (err) console.log(err)
    if (typeof videoInfo.title === 'undefined' || videoInfo.title === null) return
    songRequests.insert({videoID: videoID, title: videoInfo.title, addedAt: new Date().getTime(), username: user.username})
    global.client.action(global.configuration.get().twitch.owner, videoInfo.title + ' was added to queue requested by ' + user.username)
  })
}

Songs.prototype.removeSongFromQueue = function (self, user, text) {
  songRequests.findOne({username: user.username}).sort({addedAt: -1}).exec(function (err, item) {
    if (err) console.log(err)
    if (typeof item === 'undefined' || item === null) return
    songRequests.remove({ videoID: item.videoID }, {}, function (err, numRemoved) {
      if (err) console.log(err)
      if (numRemoved > 0) global.client.action(global.configuration.get().twitch.owner, item.title + ' was removed from queue')
    })
  })
}

Songs.prototype.addSongToPlaylist = function (self, user, text) {
  if (text.length < 1) return

  var videoID = text.trim()

  fetchVideoInfo(videoID, function (err, videoInfo) {
    if (err) console.log(err)
    playlist.insert({videoID: videoID, title: videoInfo.title, lastPlayedAt: new Date().getTime()})
    global.client.action(global.configuration.get().twitch.owner, videoInfo.title + ' was added to playlist')
  })
}

Songs.prototype.removeSongFromPlaylist = function (self, user, text) {
  if (text.length < 1) return

  var videoID = text.trim()

  fetchVideoInfo(videoID, function (err, videoInfo) {
    if (err) console.log(err)
    playlist.remove({ videoID: videoID }, {}, function (err, numRemoved) {
      if (err) console.log(err)
      if (numRemoved > 0) global.client.action(global.configuration.get().twitch.owner, videoInfo.title + ' was removed from playlist')
    })
  })
}

module.exports = new Songs()

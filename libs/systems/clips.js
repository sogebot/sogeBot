'use strict'

// 3rdparty libraries
var request = require('request')
var _ = require('lodash')

// bot libraries
var constants = require('../constants')

function Clips () {
  if (global.commons.isSystemEnabled(this)) {
    global.parser.registerParser(this, 'clips', this.save, constants.VIEWERS)

    this.webPanel()
  }
}

Clips.prototype.webPanel = function () {
  global.panel.addMenu({category: 'manage', name: 'clips', id: 'clips'})
  global.panel.addWidget('clips', 'widget-title-clips', 'scissors')

  global.panel.socketListening(this, 'getClips', this.sendSocket)
  global.panel.socketListening(this, 'getLatestClips', this.sendLatestSocket)
  global.panel.socketListening(this, 'deleteClip', this.deleteSocket)
}

Clips.prototype.sendSocket = function (self, socket) {
  global.botDB.find({$where: function () { return this._id.startsWith('clips') }}).sort({ timestamp: -1 }).exec(function (err, items) {
    if (!err) socket.emit('Clips', items)
  })
}

Clips.prototype.sendLatestSocket = function (self, socket) {
  global.botDB.find({$where: function () { return this._id.startsWith('clips') }}).sort({ timestamp: -1 }).limit(5).exec(function (err, items) {
    if (!err) socket.emit('LatestClips', items)
  })
}

Clips.prototype.deleteSocket = function (self, socket, data) {
  global.botDB.remove({_id: data}, {}, function () {})
  self.sendSocket(self, socket)
}

Clips.prototype.save = function (self, id, sender, text) {
  var clipsRegex = /.*(clips.twitch.tv\/)([\u0500-\u052F\u0400-\u04FF\w]+)\/([\u0500-\u052F\u0400-\u04FF\w]+)/
  var clipsMatch = text.trim().match(clipsRegex)
  if (!_.isNull(clipsMatch) && clipsMatch[2] === global.configuration.get().twitch.channel) {
    var data = {
      _id: 'clips_' + clipsMatch[3],
      slug: clipsMatch[3],
      clip_uri: clipsMatch[0],
      timestamp: new Date().getTime()
    }
    request(data.clip_uri, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        data.game = /game: "(.+)"/g.exec(body)[1]
        data.title = /channel_title: "(.+)"/g.exec(body)[1]
        data.curator = /curator_display_name: "(.+)"/g.exec(body)[1]
        global.botDB.insert(data, function () {})
      }
    })
  }
  global.updateQueue(id, true)
}

module.exports = new Clips()

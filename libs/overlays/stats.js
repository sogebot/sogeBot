'use strict'

// 3rdparty libraries
const _ = require('lodash')
const emoticons = require('twitch-emoticons')

// bot libraries
const constants = require('../constants')

// TODO:
// implement explosions on events

function Stats () {
  global.panel.socketListening(this, 'overlay.stats.get', this._get)
}

Stats.prototype._get = function (self, socket) {
  const stats = {
    uptime: global.twitch.getTime(false),
    viewers: global.twitch.currentViewers,
    followers: global.twitch.currentFollowers
  }
  socket.emit('overlay.stats', stats)
}

module.exports = new Stats()

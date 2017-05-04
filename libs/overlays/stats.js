'use strict'

function Stats () {
  global.panel.addMenu({category: 'settings', name: 'overlays', id: 'overlays'})
  global.panel.socketListening(this, 'overlay.stats.get', this._get)
}

Stats.prototype._get = function (self, socket) {
  const stats = {
    uptime: global.twitch.getTime(global.twitch.isOnline ? global.twitch.when.online : global.twitch.when.offline, false),
    viewers: global.twitch.currentViewers,
    followers: global.twitch.currentFollowers
  }
  socket.emit('overlay.stats', stats)
}

module.exports = new Stats()

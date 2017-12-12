'use strict'

function Stats () {
  global.panel.addMenu({category: 'settings', name: 'overlays', id: 'overlays'})
  global.panel.socketListening(this, 'overlay.stats.get', this._get)
}

Stats.prototype._get = async function (self, socket) {
  const when = await global.twitch.when()
  const stats = {
    uptime: global.twitch.getTime(global.twitch.isOnline ? when.online : 0, false),
    viewers: global.twitch.current.viewers,
    followers: global.twitch.current.followers,
    subscribers: global.twitch.current.subscribers,
    bits: global.twitch.current.bits
  }
  socket.emit('overlay.stats', stats)
}

module.exports = new Stats()

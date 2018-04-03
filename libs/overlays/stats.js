'use strict'

function Stats () {
  if (require('cluster').isMaster) {
    global.panel.addMenu({category: 'settings', name: 'overlays', id: 'overlays'})
    global.panel.socketListening(this, 'overlay.stats.get', this._get)
  }
}

Stats.prototype._get = async function (self, socket) {
  const when = await global.cache.when()
  const stats = {
    uptime: global.commons.getTime(await global.cache.isOnline() ? when.online : 0, false),
    viewers: global.api.current.viewers,
    followers: global.api.current.followers,
    subscribers: global.api.current.subscribers,
    bits: global.api.current.bits
  }
  socket.emit('overlay.stats', stats)
}

module.exports = new Stats()

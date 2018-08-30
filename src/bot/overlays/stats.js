'use strict'

const _ = require('lodash')

function Stats () {
  if (require('cluster').isMaster) {
    global.panel.addMenu({ category: 'settings', name: 'overlays', id: 'overlays' })
    global.panel.socketListening(this, 'overlay.stats.get', this._get)
  }
}

Stats.prototype._get = async function (self, socket) {
  const when = await global.cache.when()
  const stats = {
    uptime: global.commons.getTime(await global.cache.isOnline() ? when.online : 0, false),
    viewers: _.get(await global.db.engine.findOne('api.current', { key: 'viewers' }), 'value', 0),
    followers: _.get(await global.db.engine.findOne('api.current', { key: 'followers' }), 'value', 0),
    subscribers: _.get(await global.db.engine.findOne('api.current', { key: 'subscribers' }), 'value', 0),
    bits: _.get(await global.db.engine.findOne('api.current', { key: 'tips' }), 'value', 0)
  }
  socket.emit('overlay.stats', stats)
}

module.exports = new Stats()

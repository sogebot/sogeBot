'use strict'
var _ = require('lodash')

function Stats () {
  this.latestTimestamp = 0
  global.panel.socketListening(this, 'getLatestStats', this.getLatestStats)
}

Stats.prototype.save = async function (data) {
  if (data.timestamp - this.latestTimestamp >= 30000) {
    let stats = await global.db.engine.findOne('stats', {'whenOnline': data.whenOnline})

    // pseudo avg value through stream
    data.currentViewers = Math.round((data.currentViewers + stats.currentViewers) / 2)
    data.currentSubscribers = Math.round((data.currentSubscribers + stats.currentSubscribers) / 2)
    data.currentFollowers = Math.round((data.currentFollowers + stats.currentFollowers) / 2)
    data.currentBits = Math.round((data.currentBits + stats.currentBits) / 2)

    global.db.engine.update('stats', {'whenOnline': data.whenOnline}, data)
    this.latestTimestamp = data.timestamp
  }
}
Stats.prototype.getLatestStats = async function (self, socket) {
  let stats = await global.db.engine.find('stats')
  if (stats.length > 1) { // first is current stream
    stats = _.orderBy(stats, 'timestamp', 'desc')[1]
  } else stats = {}
  // get second stream (first is current stream)
  socket.emit('latestStats', stats)
}

module.exports = Stats

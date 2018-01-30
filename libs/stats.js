'use strict'
var _ = require('lodash')
const debug = require('debug')

function Stats () {
  this.latestTimestamp = 0
  global.panel.socketListening(this, 'getLatestStats', this.getLatestStats)
  global.panel.socketListening(this, 'getApiStats', this.getApiStats)

  this.clearAPIStats(this)
}

Stats.prototype.clearAPIStats = async function (self) {
  const d = debug('stats:clearAPIStats')
  let stats = await global.db.engine.find('APIStats')

  // remove data older than 2h
  stats = _.filter(stats, (o) => _.now() - o.timestamp >= 1000 * 60 * 60)
  d('Stats to delete: %j', stats)
  let items = []
  for (let s of stats) {
    items.push(global.db.engine.remove('APIStats', { _id: s._id.toString() }))
  }
  await Promise.all(items)

  setTimeout(() => self.clearAPIStats(self), 1000 * 60 * 60)
}

Stats.prototype.save = async function (data) {
  if (data.timestamp - this.latestTimestamp >= 30000) {
    let stats = await global.db.engine.findOne('stats', {'whenOnline': data.whenOnline})

    // pseudo avg value through stream
    data.currentViewers = Math.round((data.currentViewers + _.get(stats, 'currentViewers', data.currentViewers)) / 2)
    data.currentHosts = Math.round((data.currentHosts + _.get(stats, 'currentHosts', data.currentHosts)) / 2)

    global.db.engine.update('stats', {'whenOnline': data.whenOnline}, data)
    this.latestTimestamp = data.timestamp
  }
}
Stats.prototype.getLatestStats = async function (self, socket) {
  let stats = await global.db.engine.find('stats')
  if (stats.length > 1) {
    // get second stream (first is current stream)
    stats = _.orderBy(stats, 'timestamp', 'desc')[1]
  } else stats = {}
  socket.emit('latestStats', stats)
}

Stats.prototype.getApiStats = async function (self, socket, options) {
  const [from, to] = [_.get(options, 'from', _.now() - 1000 * 60 * 60), _.get(options, 'to', _.now())]

  let stats = await global.db.engine.find('APIStats')
  // return hour of data
  socket.emit('APIStats', _.filter(stats, (o) => from < o.timestamp && to >= o.timestamp))
}

module.exports = Stats

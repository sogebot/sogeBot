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

  // remove data older than 24h
  stats = _.filter(stats, (o) => _.now() - o.timestamp >= 1000 * 60 * 60 * 24)
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
  let statsFromDb = await global.db.engine.find('stats')
  let stats = {
    currentViewers: 0,
    currentSubscribers: 0,
    currentBits: 0,
    currentTips: 0,
    chatMessages: 0,
    currentFollowers: 0,
    currentViews: 0,
    maxViewers: 0,
    currentHosts: 0,
    newChatters: 0
  }
  if (statsFromDb.length > 1) {
    // get second stream (first is current stream)
    statsFromDb = _.orderBy(statsFromDb, 'timestamp', 'desc')
    statsFromDb.shift() // remove first element

    let i = 0
    for (let stat of statsFromDb) {
      stats.currentViewers += stat.currentViewers
      stats.currentBits += stat.currentBits
      stats.currentTips += stat.currentTips
      stats.chatMessages += stat.chatMessages
      stats.maxViewers += stat.maxViewers
      stats.newChatters += stat.newChatters
      stats.currentHosts += stat.currentHosts
      if (i === 0) {
        // get only latest
        stats.currentFollowers = stat.currentFollowers
        stats.currentViews = stat.currentViews
        stats.currentSubscribers = stat.currentSubscribers
      }
      i++
    }
    stats.currentViewers = parseFloat(stats.currentViewers / statsFromDb.length).toFixed(0)
    stats.currentBits = parseFloat(stats.currentBits / statsFromDb.length).toFixed(0)
    stats.currentTips = parseFloat(stats.currentTips / statsFromDb.length).toFixed(0)
    stats.chatMessages = parseFloat(stats.chatMessages / statsFromDb.length).toFixed(0)
    stats.maxViewers = parseFloat(stats.maxViewers / statsFromDb.length).toFixed(0)
    stats.newChatters = parseFloat(stats.newChatters / statsFromDb.length).toFixed(0)
    stats.currentHosts = parseFloat(stats.currentHosts / statsFromDb.length).toFixed(0)
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

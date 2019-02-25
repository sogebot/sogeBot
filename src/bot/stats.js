'use strict'
var _ = require('lodash')

function Stats () {
  this.latestTimestamp = 0
  this.sockets()
}

Stats.prototype.sockets = function () {
  if (_.isNil(global.panel)) return setTimeout(() => this.sockets(), 10)
  global.panel.socketListening(this, 'getLatestStats', this.getLatestStats)
}

Stats.prototype.save = async function (data) {
  if (data.timestamp - this.latestTimestamp >= 30000) {
    let stats = await global.db.engine.findOne('stats', { 'whenOnline': data.whenOnline })

    // pseudo avg value through stream
    data.currentViewers = Math.round((data.currentViewers + _.get(stats, 'currentViewers', data.currentViewers)) / 2)
    data.currentHosts = Math.round((data.currentHosts + _.get(stats, 'currentHosts', data.currentHosts)) / 2)

    global.db.engine.update('stats', { 'whenOnline': data.whenOnline }, data)
    this.latestTimestamp = data.timestamp
  }
}

Stats.prototype.parseStat = function (value) {
  return parseFloat(_.isNil(value) || isNaN(parseFloat(value)) ? 0 : value)
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
    newChatters: 0,
    currentWatched: 0
  }
  if (statsFromDb.length > 1) {
    // get second stream (first is current stream)
    statsFromDb = _.orderBy(statsFromDb, 'timestamp', 'desc')
    statsFromDb.shift() // remove first element

    let i = 0
    for (let stat of statsFromDb) {
      stats.currentViewers += self.parseStat(stat.currentViewers)
      stats.currentBits += self.parseStat(stat.currentBits)
      stats.currentTips += self.parseStat(stat.currentTips)
      stats.chatMessages += self.parseStat(stat.chatMessages)
      stats.maxViewers += self.parseStat(stat.maxViewers)
      stats.newChatters += self.parseStat(stat.newChatters)
      stats.currentHosts += self.parseStat(stat.currentHosts)
      stats.currentWatched += self.parseStat(stat.currentWatched)
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
    stats.currentWatched = parseFloat(stats.currentWatched / statsFromDb.length).toFixed(0)
  } else stats = {}
  socket.emit('latestStats', stats)
}

module.exports = Stats

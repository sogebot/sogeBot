'use strict'
var Database = require('nedb')
var _ = require('lodash')

var statsDB = new Database({
  filename: 'stats.db',
  autoload: true
})
statsDB.persistence.setAutocompactionInterval(60000)

function Stats () {
  this.latestTimestamp = 0

  this.webPanel()
}

Stats.prototype.webPanel = function () {
  global.panel.addMenu({category: 'manage', name: 'Stats', id: 'stats'})
  global.panel.addMenu({category: 'manage', name: 'Viewers', id: 'viewers'})
  global.panel.socketListening(this, 'getLatestStats', this.getLatestStats)
  global.panel.socketListening(this, 'getStatsData', this.getStatsData)
  global.panel.socketListening(this, 'removeStatsData', this.removeStatsData)
  global.panel.socketListening(this, 'getCalendarData', this.getCalendarData)
  global.panel.socketListening(this, 'getStreamEvents', this.getStreamEvents)
  global.panel.socketListening(this, 'getViewers', this.getViewers)
  global.panel.socketListening(this, 'deleteViewer', this.deleteViewer)
}

Stats.prototype.save = function (data) {
  if (data.timestamp - this.latestTimestamp >= 300000) {
    statsDB.update({ _id: data.whenOnline }, { $push: { stats: data } }, { upsert: true }, function () {})
    this.latestTimestamp = data.timestamp
  }
}

Stats.prototype.getViewers = function (self, socket) {
  global.botDB.find({$where: function () { return this._id.startsWith('user') && this.username !== global.configuration.get().twitch.username && this.username !== global.configuration.get().twitch.channel }}, function (err, items) {
    if (err) { global.log.error(err) }
    socket.emit('Viewers', items)
  })
}

Stats.prototype.deleteViewer = function (self, socket, data) {
  global.botDB.remove({ _id: 'user_' + data })
  self.getViewers(self, socket)
}

Stats.prototype.getStreamEvents = function (self, socket, data) {
  statsDB.find({$where: function () { return this._id.startsWith(data) }}, function (err, items) {
    if (err) { global.log.error(err) }
    socket.emit('streamData', items)
  })
}

Stats.prototype.getStatsData = function (self, socket, data) {
  statsDB.findOne({ _id: data }).sort({ timestamp: -1 }).exec(function (err, item) {
    if (err) global.log.error(err)
    socket.emit('statsData', item)
  })
}

Stats.prototype.removeStatsData = function (self, socket, data) {
  statsDB.remove({ _id: data })
}

Stats.prototype.getCalendarData = function (self, socket, data) {
  statsDB.find({}).exec(function (err, items) {
    if (err) global.log.error(err)
    var ids = []
    _.each(items, function (item) {
      ids.push(item._id)
    })
    socket.emit('calendarData', ids)
  })
}

Stats.prototype.getLatestStats = function (self, socket) {
  statsDB.findOne({}).sort({ _id: -1 }).skip(1).exec(function (err, item) { // get second stream (first is current stream)
    if (err) global.log.error(err)
    var timestamp = 0
    var data = {}
    if (!_.isNull(item)) {
      _.each(item.stats, function (array, index) {
        if (array.timestamp >= timestamp) {
          data = array
          timestamp = array.timestamp
        }
      })
    }
    socket.emit('latestStats', data)
  })
}

module.exports = Stats

'use strict'
var Database = require('nedb')

var statsDB = new Database({
  filename: 'stats.db',
  autoload: true
})
global.botDB.persistence.setAutocompactionInterval(60000)


function Stats () {
  this.latestTimestamp = 0
}

Stats.prototype.save = function (data) {
  if (data.timestamp - this.latestTimestamp >= 300000) {
    statsDB.update({ _id: data.whenOnline }, { $push: { stats: data } }, { upsert: true }, function () {})
    this.latestTimestamp = data.timestamp
  }
}

Stats.prototype.get = function (id) {
  statsDB.findOne({ _id: id }).sort({ timestamp: -1 }).exec(function (err, item) {
    if (err) global.log.error(err)
  })
}

module.exports = Stats

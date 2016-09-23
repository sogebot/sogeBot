'use strict'
var Database = require('nedb')

var statsDB = new Database({
  filename: 'stats.db',
  autoload: true
})
global.botDB.persistence.setAutocompactionInterval(60000)


function Stats () {

}

Stats.prototype.save = function (data) {
  statsDB.update({ _id: data.whenOnline }, { $push: { stats: data } }, { upsert: true }, function () {})
}

Stats.prototype.get = function (id) {
  statsDB.findOne({ _id: id }).sort({ timestamp: -1 }).exec(function (err, item) {
    if (err) global.log.error(err)
  })
}

module.exports = Stats

const _ = require('lodash')

const config = require('../../config.json')

const INeDB = require('./nedb')
const IMongoDB = require('./mongodb')
const IMasterController = require('./master')

class Database {
  constructor (cluster) {
    cluster = _.isNil(cluster) ? true : cluster
    this.engine = null

    if (require('cluster').isMaster && cluster) this.engine = new IMasterController()
    else if (config.database.type === 'nedb') this.engine = new INeDB()
    else if (config.database.type === 'mongodb') this.engine = new IMongoDB()

    if (_.isNil(this.engine)) {
      global.log.warning('No database was selected - fallback to NeDB')
      this.engine = new INeDB()
    }
  }
}

module.exports = Database

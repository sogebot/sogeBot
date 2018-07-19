const _ = require('lodash')

const config = require('../../config.json')

const INeDB = require('./nedb')
const IMongoDB = require('./mongodb')
const IMasterController = require('./master')

class Database {
  constructor (cluster) {
    this.cluster = _.isNil(cluster) ? true : cluster
    this.engine = null

    if (require('cluster').isMaster && this.cluster && config.database.type === 'nedb') this.engine = new IMasterController()
    else if (config.database.type === 'nedb') this.engine = new INeDB(this.cluster)
    else if (config.database.type === 'mongodb') this.engine = new IMongoDB(this.cluster)

    if (_.isNil(this.engine)) {
      global.log.warning('No database was selected - fallback to NeDB')
      this.engine = new INeDB()
    }
  }
}

module.exports = Database

const _ = require('lodash')

const config = require('@config')

const INeDB = require('./nedb')
const IMongoDB = require('./mongodb')
const IMasterController = require('./master')

class Database {
  constructor (forceIndexes) {
    this.engine = null

    if (!global.mocha && require('cluster').isMaster && !forceIndexes && config.database.type === 'nedb') this.engine = new IMasterController()
    else if (config.database.type === 'nedb') this.engine = new INeDB(forceIndexes)
    else if (config.database.type === 'mongodb') this.engine = new IMongoDB(forceIndexes)

    if (_.isNil(this.engine)) {
      global.log.warning('No database was selected - fallback to NeDB')
      this.engine = new INeDB()
    }
  }
}

module.exports = Database

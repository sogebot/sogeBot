const config = global.migration ? {
  database: {}
} : require('@config')

const INeDB = require('./nedb')
const IMongoDB = require('./mongodb')
const IMasterController = require('./master')

class Database {
  constructor (forceIndexes, forceRemoveIndexes, forceType, forceDb) {
    this.engine = null

    if (forceType) config.database.type = forceType

    if (!forceType && !global.mocha && require('cluster').isMaster && (!forceIndexes && !forceRemoveIndexes) && config.database.type === 'nedb') this.engine = new IMasterController()
    else if (config.database.type === 'nedb') this.engine = new INeDB(forceIndexes, forceDb)
    else if (config.database.type === 'mongodb') this.engine = new IMongoDB(forceIndexes, forceRemoveIndexes, forceDb)
    else {
      global.log.warning('No database was selected - fallback to NeDB')
      this.engine = new INeDB(forceIndexes)
    }
  }
}

module.exports = Database

const config = require('@config')

const INeDB = require('./nedb')
const IMongoDB = require('./mongodb')
const IWorkerController = require('./worker')

class Database {
  constructor (forceIndexes, forceRemoveIndexes) {
    this.engine = null

    if (!global.mocha && require('cluster').isWorker && (!forceIndexes && !forceRemoveIndexes) && config.database.type === 'nedb') this.engine = new IWorkerController()
    else if (config.database.type === 'nedb') this.engine = new INeDB(forceIndexes)
    else if (config.database.type === 'mongodb') this.engine = new IMongoDB(forceIndexes, forceRemoveIndexes)
    else {
      global.log.warning('No database was selected - fallback to NeDB')
      this.engine = new INeDB(forceIndexes)
    }
  }
}

module.exports = Database

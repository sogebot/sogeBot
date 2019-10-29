const config = global.migration ? {
  database: {}
} : require('../../config.json')

const INeDB = require('./nedb')
const IMongoDB = require('./mongodb')

import { warning } from '../helpers/log';

class Database {
  constructor (forceIndexes, forceRemoveIndexes, forceType, forceDb) {
    this.engine = null

    if (config.database.type === 'nedb') this.engine = new INeDB(forceIndexes, forceDb)
    else if (config.database.type === 'mongodb') this.engine = new IMongoDB(forceIndexes, forceRemoveIndexes, forceDb)
    else {
      warning('No database was selected - fallback to NeDB')
      this.engine = new INeDB(forceIndexes)
    }
  }
}

module.exports = Database

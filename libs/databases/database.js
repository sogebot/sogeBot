const _ = require('lodash')

const config = require('../../config.json')

const INeDB = require('./nedb')
const IMongoDB = require('./mongodb')

class Database {
  constructor () {
    this.engine = null
    if (config.database.type === 'nedb') this.engine = new INeDB()
    if (config.database.type === 'mongodb') this.engine = new IMongoDB()

    if (_.isNil(this.engine)) {
      global.log.warning('No database was selected - fallback to NeDB')
      this.engine = new INeDB()
    }
  }
}

module.exports = Database

const client = require('mongodb').MongoClient

const Interface = require('./interface')
const config = require('../../config.json')
const flatten = require('flat')

const _ = require('lodash')
const debug = require('debug')('db:mongodb')

class IMongoDB extends Interface {
  constructor () {
    super('mongodb')

    this._connection = null

    if (debug.enabled) debug('MongoDB initialized')
  }

  async connection () {
    if (_.isNil(this._connection)) {
      this._connection = await client.connect(config.database.mongodb.url)
      debug(this._connection)
    }
    return this._connection
  }

  async find (table, where) {
    where = where || {}

    let db = await this.connection()
    let collection = await db.collection(table)
    if (table === 'users') collection.createIndex({'_id': 1, 'username': 1})
    let items = await collection.find(where)
    return items.toArray()
  }

  async findOne (table, where) {
    where = where || {}

    let db = await this.connection()
    let collection = await db.collection(table)
    if (table === 'users') collection.createIndex({'_id': 1, 'username': 1})
    let item = await collection.findOne(where)
    return item || {}
  }

  async insert (table, object) {
    if (_.isEmpty(object)) throw Error('Object cannot be empty')

    let db = await this.connection()
    let collection = await db.collection(table)
    if (table === 'users') collection.createIndex({'_id': 1, 'username': 1})
    let item = await collection.insert(object)
    return _.size(item)
  }

  async increment (table, where, object) {
    if (_.isEmpty(object)) throw Error('Object to update cannot be empty')

    let db = await this.connection()
    let collection = await db.collection(table)
    if (table === 'users') collection.createIndex({'_id': 1, 'username': 1})

    let result = await collection.update(
      where,
      { $inc: flatten(object) }, {
        upsert: true,
        multi: _.isEmpty(where)
      }
    )
    return result.nMatched
  }

  async remove (table, where) {
    if (_.isEmpty(where)) throw Error('Object to delete cannot be empty')

    let db = await this.connection()
    let collection = await db.collection(table)
    if (table === 'users') collection.createIndex({'_id': 1, 'username': 1})
    let result = await collection.remove(where)
    return result.nRemoved
  }

  async update (table, where, object) {
    if (_.isEmpty(object)) throw Error('Object to update cannot be empty')

    if (debug.enabled) debug('update() \n\ttable: %s \n\twhere: %j', table, where)

    let db = await this.connection()
    let collection = await db.collection(table)
    if (table === 'users') collection.createIndex({'_id': 1, 'username': 1})

    let result
    if (_.size(where) === 0) {
      result = await collection.updateMany({}, { $set: flatten(object) })
    } else {
      result = await collection.update(
        where,
        { $set: flatten(object) }, {
          upsert: _.isNil(where._id)
        }
      )
    }
    return result.nMatched
  }
}

module.exports = IMongoDB

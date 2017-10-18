const client = require('mongodb').MongoClient
const ObjectID = require('mongodb').ObjectID

const Interface = require('./interface')
const config = require('../../config.json')
const flatten = require('flat')
const cache = require('memory-cache')

const _ = require('lodash')
const debug = require('debug')('db:mongodb')

class IMongoDB extends Interface {
  constructor () {
    super('mongodb')

    this._connection = {}
    this.cache = {}

    if (debug.enabled) debug('MongoDB initialized')
  }

  async connection (table) {
    if (_.isNil(this._connection[table])) {
      this._connection[table] = await client.connect(config.database.mongodb.url, { poolSize: 100 })
      debug(this._connection[table])
    }
    return this._connection[table]
  }

  on (table) {
    if (_.isNil(this.cache[table])) {
      this.cache[table] = new cache.Cache()
    }
  }

  async find (table, where) {
    this.on(table) // init table

    where = where || {}
    if (!_.isNil(where._id)) where._id = new ObjectID(where._id)
    else where = flatten(where)

    let db = await this.connection(table)
    let collection = await db.collection(table)
    if (table === 'users') collection.createIndex({'_id': 1, 'username': 1})
    let items = await collection.find(where).toArray()
    for (let item of items) {
      this.cache[table].put(item._id, item)
    }
    return items
  }

  async findOne (table, where) {
    this.on(table) // init table

    where = where || {}
    if (!_.isNil(where._id)) where._id = new ObjectID(where._id)
    else where = flatten(where)

    // get from cache
    var keys = this.cache[table].keys()
    for (let key of keys) {
      if (!_.isEmpty((_.filter(this.cache[table].get(key), where)))) {
        return this.cache[table].get(key)
      }
    }

    let db = await this.connection(table)
    let collection = await db.collection(table)
    if (table === 'users') collection.createIndex({'_id': 1, 'username': 1})
    let item = await collection.findOne(where)
    if (!_.isNil(item)) this.cache[table].put(item._id, item)
    return item || {}
  }

  async insert (table, object) {
    this.on(table) // init table

    if (_.isEmpty(object)) throw Error('Object cannot be empty')
    delete object._id

    let db = await this.connection(table)
    let collection = await db.collection(table)
    if (table === 'users') collection.createIndex({'_id': 1, 'username': 1})
    let item = await collection.insert(object)

    this.cache[table].put(item._id, item)
    return item.ops[0]
  }

  async increment (table, where, object) {
    this.on(table) // init table

    where = where || {}
    if (!_.isNil(where._id)) where._id = new ObjectID(where._id)
    else where = flatten(where)

    if (_.isEmpty(object)) throw Error('Object to update cannot be empty')
    delete object._id

    // invalidate cache on update
    var keys = this.cache[table].keys()
    for (let key of keys) {
      if (!_.isEmpty((_.filter(this.cache[table].get(key), where)))) {
        this.cache[table].del(key)
      }
    }

    let db = await this.connection(table)
    let collection = await db.collection(table)
    if (table === 'users') collection.createIndex({'_id': 1, 'username': 1})

    let result = await collection.update(
      where,
      { $inc: flatten(object) }, {
        upsert: true,
        multi: _.isEmpty(where)
      }
    )
    return result.result.n
  }

  async remove (table, where) {
    this.on(table) // init table

    if (!_.isNil(where._id)) where._id = new ObjectID(where._id)
    else where = flatten(where)

    // remove cache
    var keys = this.cache[table].keys()
    for (let key of keys) {
      if (!_.isEmpty((_.filter(this.cache[table].get(key), where)))) {
        this.cache[table].del(key)
      }
    }

    let db = await this.connection(table)
    let collection = await db.collection(table)
    let result = await collection.remove(where)
    return result.result.n
  }

  async update (table, where, object) {
    this.on(table) // init table

    if (_.isEmpty(object)) throw Error('Object to update cannot be empty')

    if (!_.isNil(where._id)) where._id = new ObjectID(where._id)
    else where = flatten(where)

    // invalidate cache on update
    var keys = this.cache[table].keys()
    for (let key of keys) {
      if (!_.isEmpty((_.filter(this.cache[table].get(key), where)))) {
        this.cache[table].del(key)
      }
    }

    if (debug.enabled) debug('update() \n\ttable: %s \n\twhere: %j', table, where)

    let db = await this.connection(table)
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
    return _.isNil(result.result.upserted) ? result.result.nModified : _.size(result.result.upserted)
  }
}

module.exports = IMongoDB

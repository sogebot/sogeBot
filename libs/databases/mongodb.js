const client = require('mongodb').MongoClient
const ObjectID = require('mongodb').ObjectID

const Interface = require('./interface')
const config = require('../../config.json')
const flatten = require('flat')

const _ = require('lodash')
const debug = require('debug')('db:mongodb')

class IMongoDB extends Interface {
  constructor () {
    super('mongodb')

    this._connection = {}

    if (debug.enabled) debug('MongoDB initialized')
  }

  async connection (table) {
    if (_.isNil(this._connection[table])) {
      this._connection[table] = await client.connect(config.database.mongodb.url, { poolSize: 100 })
      debug(this._connection[table])
    }
    return this._connection[table]
  }

  async find (table, where) {
    where = where || {}
    if (!_.isNil(where._id)) {
      let regexp = new RegExp('^[0-9a-fA-F]{24}$')
      if (regexp.test(where._id)) where._id = new ObjectID(where._id)
      else return {}
    } else where = flatten(where)

    let db = await this.connection(table)
    let collection = await db.collection(table)
    if (table === 'users') collection.createIndex({'_id': 1, 'username': 1})
    let items = await collection.find(where).toArray()
    return items
  }

  async findOne (table, where) {
    where = where || {}
    if (!_.isNil(where._id)) {
      let regexp = new RegExp('^[0-9a-fA-F]{24}$')
      if (regexp.test(where._id)) where._id = new ObjectID(where._id)
      else return {}
    } else where = flatten(where)

    let db = await this.connection(table)
    let collection = await db.collection(table)
    if (table === 'users') collection.createIndex({'_id': 1, 'username': 1})
    let item = await collection.findOne(where)
    return item || {}
  }

  async insert (table, object) {
    if (_.isEmpty(object)) throw Error('Object cannot be empty')
    delete object._id

    let db = await this.connection(table)
    let collection = await db.collection(table)
    if (table === 'users') collection.createIndex({'_id': 1, 'username': 1})
    let item = await collection.insert(object)

    return item.ops[0]
  }

  async incrementOne (table, where, object) {
    where = where || {}
    if (!_.isNil(where._id)) where._id = new ObjectID(where._id)
    else where = flatten(where)

    if (_.isEmpty(object)) throw Error('Object to update cannot be empty')
    delete object._id

    let db = await this.connection(table)
    let collection = await db.collection(table)
    if (table === 'users') collection.createIndex({'_id': 1, 'username': 1})

    let item = await collection.findAndModify(
      where,
      { _id: 1 },
      { $inc: flatten(object) }
    )

    return item.value
  }

  async increment (table, where, object) {
    where = where || {}
    if (!_.isNil(where._id)) where._id = new ObjectID(where._id)
    else where = flatten(where)

    if (_.isEmpty(object)) throw Error('Object to update cannot be empty')
    delete object._id

    let db = await this.connection(table)
    let collection = await db.collection(table)
    if (table === 'users') collection.createIndex({'_id': 1, 'username': 1})

    await collection.update(
      where,
      { $inc: flatten(object) }, {
        upsert: true,
        multi: _.isEmpty(where)
      }
    )

    // workaround for return of updated objects
    let items = await collection.find(where).toArray()
    return items
  }

  async remove (table, where) {
    if (!_.isNil(where._id)) where._id = new ObjectID(where._id)
    else where = flatten(where)

    let db = await this.connection(table)
    let collection = await db.collection(table)
    let result = await collection.remove(where)
    return result.result.n
  }

  async update (table, where, object) {
    if (_.isEmpty(object)) throw Error('Object to update cannot be empty')

    if (!_.isNil(where._id)) where._id = new ObjectID(where._id)
    else where = flatten(where)

    if (debug.enabled) debug('update() \n\ttable: %s \n\twhere: %j', table, where)

    let db = await this.connection(table)
    let collection = await db.collection(table)
    if (table === 'users') collection.createIndex({'_id': 1, 'username': 1})

    if (_.size(where) === 0) {
      await collection.updateMany({}, { $set: flatten(object) })
    } else {
      await collection.update(
        where,
        { $set: flatten(object) }, {
          upsert: _.isNil(where._id)
        }
      )
    }

    // workaround for return of updated objects
    let items = await collection.find(where).toArray()
    return items
  }
}

module.exports = IMongoDB

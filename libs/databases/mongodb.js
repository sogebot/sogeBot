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
      try {
        this._connection[table] = await client.connect(config.database.mongodb.url, { poolSize: 100 })
        debug(this._connection[table])
      } catch (e) {
        global.log.error(e.message)
        if (e.message.match(/ENOTFOUND/g) || e.message.match(/ECONNREFUSED/g)) {
          global.log.error(`Cannot connect to ${config.database.mongodb.url}`)
          process.exit()
        }
      }
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
    try {
      let db = await this.connection(table)
      let items = await db.collection(table).find(where)
      return items.toArray()
    } catch (e) {
      global.log.error(e.message)
      if (e.message.match(/EPIPE/g)) {
        global.log.error(`Something went wrong with mongodb instance (EPIPE error)`)
        process.exit()
      }
    }
  }

  async findOne (table, where) {
    where = where || {}
    if (!_.isNil(where._id)) {
      let regexp = new RegExp('^[0-9a-fA-F]{24}$')
      if (regexp.test(where._id)) where._id = new ObjectID(where._id)
      else return {}
    } else where = flatten(where)

    try {
      let db = await this.connection(table)
      let item = await db.collection(table).findOne(where)
      return item || {}
    } catch (e) {
      global.log.error(e.message)
      if (e.message.match(/EPIPE/g)) {
        global.log.error(`Something went wrong with mongodb instance (EPIPE error)`)
        process.exit()
      }
    }
  }

  async insert (table, object) {
    if (_.isEmpty(object)) throw Error('Object cannot be empty')
    delete object._id

    try {
      let db = await this.connection(table)
      let item = await db.collection(table).insert(object)
      return item.ops[0]
    } catch (e) {
      if (e.message.match(/EPIPE/g)) {
        global.log.error(`Something went wrong with mongodb instance (EPIPE error)`)
        process.exit()
      }
    }
  }

  async incrementOne (table, where, object) {
    where = where || {}
    if (!_.isNil(where._id)) where._id = new ObjectID(where._id)
    else where = flatten(where)

    if (_.isEmpty(object)) throw Error('Object to update cannot be empty')
    delete object._id

    try {
      let db = await this.connection(table)
      let item = await db.collection(table).findAndModify(
        where,
        { _id: 1 },
        // DON'T EVER DELETE flatten ON OBJECT - with flatten object get updated and not replaced
        { $inc: flatten(object) },
        { new: true } // will return updated item
      )

      return item.value
    } catch (e) {
      global.log.error(e.message)
      if (e.message.match(/EPIPE/g)) {
        global.log.error(`Something went wrong with mongodb instance (EPIPE error)`)
        process.exit()
      }
    }
  }

  async increment (table, where, object) {
    where = where || {}
    if (!_.isNil(where._id)) where._id = new ObjectID(where._id)
    else where = flatten(where)

    if (_.isEmpty(object)) throw Error('Object to update cannot be empty')
    delete object._id

    try {
      let db = await this.connection(table)

      await db.collection(table).update(
        where,
        // DON'T EVER DELETE flatten ON OBJECT - with flatten object get updated and not replaced
        { $inc: flatten(object) }, {
          upsert: true,
          multi: _.isEmpty(where)
        }
      )

      // workaround for return of updated objects
      let items = await db.collection(table).find(where).toArray()
      return items
    } catch (e) {
      global.log.error(e.message)
      if (e.message.match(/EPIPE/g)) {
        global.log.error(`Something went wrong with mongodb instance (EPIPE error)`)
        process.exit()
      }
    }
  }

  async remove (table, where) {
    if (!_.isNil(where._id)) where._id = new ObjectID(where._id)
    else where = flatten(where)

    try {
      let db = await this.connection(table)
      let result = await db.collection(table).remove(where)
      return result.result.n
    } catch (e) {
      global.log.error(e.message)
      if (e.message.match(/EPIPE/g)) {
        global.log.error(`Something went wrong with mongodb instance (EPIPE error)`)
        process.exit()
      }
    }
  }

  async update (table, where, object) {
    if (_.isEmpty(object)) throw Error('Object to update cannot be empty')

    if (!_.isNil(where._id)) where._id = new ObjectID(where._id)
    else where = flatten(where)

    // remove _id from object
    delete object._id

    if (debug.enabled) debug('update() \n\ttable: %s \n\twhere: %j', table, where)

    try {
      let db = await this.connection(table)

      if (_.size(where) === 0) {
        // DON'T EVER DELETE flatten ON OBJECT - with flatten object get updated and not replaced
        await db.collection(table).updateMany({}, { $set: flatten(object, { safe: true }) })
      } else {
        await db.collection(table).update(
          where,
          // DON'T EVER DELETE flatten ON OBJECT - with flatten object get updated and not replaced
          { $set: flatten(object, { safe: true }) }, {
            upsert: _.isNil(where._id)
          }
        )
      }

      // workaround for return of updated objects
      let items = await db.collection(table).find(where).toArray()
      return items.length === 1 ? items[0] : items
    } catch (e) {
      global.log.error(e.message)
      if (e.message.match(/EPIPE/g)) {
        global.log.error(`Something went wrong with mongodb instance (EPIPE error)`)
        process.exit()
      }
    }
  }
}

module.exports = IMongoDB

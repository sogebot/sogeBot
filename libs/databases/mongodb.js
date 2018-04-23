const client = require('mongodb').MongoClient
const ObjectID = require('mongodb').ObjectID
const mongodbUri = require('mongodb-uri')

const Interface = require('./interface')
const config = require('../../config.json')
const flatten = require('flat')

const _ = require('lodash')
const debug = require('debug')('db:mongodb')

class IMongoDB extends Interface {
  constructor () {
    super('mongodb')

    this.connected = false
    this.client = null
    this.dbName = mongodbUri.parse(config.database.mongodb.url).database

    this.connect()

    if (debug.enabled) debug('MongoDB initialized')
  }

  async connect () {
    this.client = await client.connect(config.database.mongodb.url, { poolSize: _.get(config, 'database.mongodb.poolSize', 5) })

    // create indexes
    let db = await this.client.db(this.dbName)
    const collections = await db.listCollections().toArray()
    if (_.find(collections, (o) => o.name === 'users.bits')) await db.collection('users.bits').dropIndexes()
    if (_.find(collections, (o) => o.name === 'users.tips')) await db.collection('users.tips').dropIndexes()
    if (_.find(collections, (o) => o.name === 'users.points')) await db.collection('users.points').dropIndexes()
    if (_.find(collections, (o) => o.name === 'users.online')) await db.collection('users.online').dropIndexes()
    if (_.find(collections, (o) => o.name === 'cache')) await db.collection('cache').dropIndexes()
    if (_.find(collections, (o) => o.name === 'customTranslations')) await db.collection('customTranslations').dropIndexes()
    if (_.find(collections, (o) => o.name === 'users')) await db.collection('users').dropIndexes()
    if (_.find(collections, (o) => o.name === 'stats')) await db.collection('stats').dropIndexes()

    await db.collection('users.bits').createIndex('timestamp')
    await db.collection('users.tips').createIndex('timestamp')
    await db.collection('users').createIndex('username', { unique: true })
    await db.collection('users.online').createIndex('username', { unique: true })
    await db.collection('users.points').createIndex('username')
    await db.collection('cache').createIndex('key')
    await db.collection('customTranslations').createIndex('key')
    await db.collection('stats').createIndex('whenOnline')

    this.connected = true
  }

  async find (table, where) {
    where = where || {}
    if (!_.isNil(where._id)) {
      let regexp = new RegExp('^[0-9a-fA-F]{24}$')
      if (regexp.test(where._id)) where._id = new ObjectID(where._id)
      else return {}
    } else where = flatten(where)
    try {
      let db = this.client.db(this.dbName)
      let items = await db.collection(table).find(where)
      return items.toArray()
    } catch (e) {
      global.log.error(e.stack)
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
      let db = this.client.db(this.dbName)
      let item = await db.collection(table).findOne(where)
      return item || {}
    } catch (e) {
      global.log.error(e.stack)
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
      let db = this.client.db(this.dbName)
      if (_.isArray(object)) await db.collection(table).insertMany(object)
      let item = await db.collection(table).insert(flatten.unflatten(object))
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
      let db = this.client.db(this.dbName)
      let item = await db.collection(table).findAndModify(
        where,
        { _id: 1 },
        // DON'T EVER DELETE flatten ON OBJECT - with flatten object get updated and not replaced
        { $inc: flatten(object) },
        { new: true } // will return updated item
      )
      return item.value
    } catch (e) {
      global.log.error(e.stack)
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
      let db = this.client.db(this.dbName)

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
      global.log.error(e.stack)
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
      let db = this.client.db(this.dbName)
      let result = await db.collection(table).deleteMany(where)
      return result.result.n
    } catch (e) {
      global.log.error(e.stack)
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
    try {
      let db = this.client.db(this.dbName)

      if (_.size(where) === 0) {
        // DON'T EVER DELETE flatten ON OBJECT - with flatten object get updated and not replaced
        await db.collection(table).updateMany({}, { $set: flatten(object, { safe: true }) })
      } else {
        await db.collection(table).updateOne(
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
      global.log.error(e.stack)
      if (e.message.match(/EPIPE/g)) {
        global.log.error(`Something went wrong with mongodb instance (EPIPE error)`)
        process.exit()
      }
    }
  }
}

module.exports = IMongoDB

const client = require('mongodb').MongoClient
const ObjectID = require('mongodb').ObjectID
const mongodbUri = require('mongodb-uri')

const Interface = require('./interface')
const config = require('@config')
const flatten = require('flat')

const _ = require('lodash')
const debug = require('debug')('db:mongodb')

class IMongoDB extends Interface {
  constructor (isCluster) {
    super('mongodb')

    this.createIndexes = !(isCluster || false)
    this.connected = false
    this.client = null
    this.dbName = mongodbUri.parse(config.database.mongodb.url).database

    this.connect()

    if (debug.enabled) debug('MongoDB initialized')
  }

  async connect () {
    this.client = await client.connect(config.database.mongodb.url, { poolSize: _.get(config, 'database.mongodb.poolSize', 5), useNewUrlParser: true })

    // create indexes
    let db = await this.client.db(this.dbName)
    const collections = await db.listCollections().toArray()
    const dropIndexes = [
      'users.bits', 'users.tips', 'users.points', 'users.online', 'users.messages', 'users.watched',
      'cache', 'customTranslations', 'users', 'stats'
    ]
    for (let table of dropIndexes) {
      if (_.find(collections, (o) => o.name === table)) await db.collection(table).dropIndexes()
    }

    if (this.createIndexes) {
      await db.collection('users.bits').createIndex('timestamp')
      await db.collection('users.tips').createIndex('timestamp')
      await db.collection('users').createIndex('username', { unique: true })
      await db.collection('users.online').createIndex('username')
      await db.collection('users.points').createIndex('username')
      await db.collection('users.messages').createIndex('username')
      await db.collection('users.watched').createIndex('username')
      await db.collection('cache').createIndex('key', { unique: true })
      await db.collection('customTranslations').createIndex('key')
      await db.collection('stats').createIndex('whenOnline')
    }
    this.connected = true
  }

  async find (table, where) {
    where = where || {}
    if (!_.isNil(where._id)) {
      let regexp = new RegExp('^[0-9a-fA-F]{24}$')
      if (regexp.test(where._id)) where._id = new ObjectID(where._id)
      else return {}
    }

    const sortBy = where._sort || '_id'
    const sumBy = where._sum || undefined
    const groupBy = where._group || undefined
    const total = where._total || undefined

    delete where._sort; delete where._sum; delete where._total; delete where._group
    where = flatten(where)
    try {
      let db = this.client.db(this.dbName)
      let items

      if (!sumBy || !groupBy) {
        items = await db.collection(table).find(where).sort({ [sortBy]: 1 }).limit(Number(total))
      } else {
        const group = {_id: `$${groupBy}`, [sumBy]: { $sum: `$${sumBy}` }}
        items = await db.collection(table).aggregate([{$group: group}]).sort({ [sortBy]: -1 }).limit(Number(total))
      }
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
    object = _.clone(object)
    delete object._id
    if (_.isEmpty(object)) throw Error('Object cannot be empty')

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
      if (e.message.startsWith('E11000 duplicate key error collection')) {
        // this often means that update was too fast...re-do after io
        setImmediate(() => this.update(table, where, object))
      } else if (e.message.match(/EPIPE/g)) {
        global.log.error(e.stack)
        global.log.error(`Something went wrong with mongodb instance (EPIPE error)`)
        process.exit()
      } else {
        global.log.error(e.stack)
      }
    }
  }
}

module.exports = IMongoDB

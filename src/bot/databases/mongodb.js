const client = require('mongodb').MongoClient
const ObjectID = require('mongodb').ObjectID
const mongodbUri = require('mongodb-uri')

const Interface = require('./interface')
const config = global.migration ? {
  database: {}
} : require('../../config.json')
const {
  isMainThread
} = require('worker_threads');
const {
  flatten, unflatten
} = require('../helpers/flatten');
import { debug, error } from '../helpers/log';

const _ = require('lodash')

class IMongoDB extends Interface {
  constructor (forceIndexes, forceRemoveIndexes, forceDb) {
    super('mongodb')

    this.createIndexes = (forceIndexes && isMainThread)
    this.forceRemoveIndexes = forceRemoveIndexes || false

    this.connected = false
    this.client = null

    this.mongoUri = forceDb || config.database.mongodb.url
    this.dbName = mongodbUri.parse(this.mongoUri).database

    this.connect()
    debug('db', 'Starting MongoDB - ' + isMainThread);
  }

  async index (table, opts) {
    if (!table) throw new Error('Missing table option')

    try {
      if (!this.connected) throw new Error('Not connected yet')
      let db = await this.client.db(this.dbName)
      await db.createCollection(table)
      await db.collection(table).dropIndexes()

      if (!Array.isArray(opts)) opts = [opts]
      for (const o of opts) {
        o.unique = o.unique || false
        if (!o.index) throw new Error('Missing index option')
        await db.collection(table).createIndex(o.index, { unique: o.unique })
      }

      return
    } catch (e) {
      // indexes will be created when collection is available
      setTimeout(() => this.index(table, opts), 5000)
    }
  }

  async connect () {
    this.client = await client.connect(this.mongoUri,
      {
        poolSize: _.get(config, 'database.mongodb.poolSize', 5),
        useNewUrlParser: true,
        reconnectTries: Number.MAX_VALUE,
        connectTimeoutMS: 60000,
        useUnifiedTopology: true,
        maxPoolSize: 50,
      })

    // create indexes
    let db = await this.client.db(this.dbName)

    if (this.createIndexes || this.forceRemoveIndexes) {
      const collections = await db.listCollections().toArray()
      for (let k of Object.keys(collections)) {
        await db.collection(collections[k].name).dropIndexes()
        await db.createCollection(collections[k].name)
      }

      if (this.createIndexes) {
        await db.collection('users').createIndex('username')
        await db.collection('users').createIndex(
          { id: 1 },
          { partialFilterExpression: { id: { $exists: true } }, unique: true }
        )
        await db.collection('customTranslations').createIndex('key')
        await db.collection('stats').createIndex('whenOnline')
      }
    }
    this.connected = true
  }

  async find (table, where, lookup) {
    return new Promise((resolve) => {
      setImmediate(async () => {
        where = where || {}
        if (!_.isNil(where._id)) {
          let regexp = new RegExp('^[0-9a-fA-F]{24}$')
          if (regexp.test(where._id)) where._id = new ObjectID(where._id)
          else resolve({})
        }

        const sortBy = where._sort || '_id'
        const sumBy = where._sum || undefined
        const groupBy = where._group || undefined
        const total = where._total || undefined

        delete where._sort; delete where._sum; delete where._total; delete where._group
        try {
          let db = this.client.db(this.dbName)
          let items
          const order = sortBy.startsWith('-') ? 1 : -1

          if (_.some(Object.keys(flatten(where)).map(o => o.includes('$regex') | o.includes('$nin')))) {
            if (Object.keys(flatten(where)).length > 1) {
              throw Error('Don\'t use $regex, $nin with other search attributes');
            }
          } else {
            where = flatten(where)
          }
          if (!sumBy || !groupBy) {
            if (sortBy !== '_id') {
              where[sortBy.replace('-', '')] = { $exists: true, $ne: order === 1 ? 0 : null }
            }

            if (lookup) {
              const lookupArr = []
              if (lookup.constructor !== Array) lookup = [lookup]
              for (const l of lookup) {
                lookupArr.push({ $lookup: l })
              }
              items = await db.collection(table).aggregate([{ $match: where }, ...lookupArr])
            } else {
              items = await db.collection(table).find(where).sort({ [sortBy.replace('-', '')]: order }).limit(Number(total))
            }
          } else {
            const lookupArr = []
            if (lookup) {
              if (lookup.constructor !== Array) lookup = [lookup]
              for (const l of lookup) {
                lookupArr.push({ $lookup: l })
              }
            }
            const group = { _id: `$${groupBy}`, [sumBy]: { $sum: `$${sumBy}` } }
            items = await db.collection(table).aggregate([{ $group: group }, ...lookupArr]).sort({ [sortBy.replace('-', '')]: order }).limit(Number(total))
          }
          resolve(items.toArray());
        } catch (e) {
          error(e.stack)
          if (e.message.match(/EPIPE/g)) {
            error('Something went wrong with mongodb instance (EPIPE error)')
            process.exit()
          }
        }
      });
    });
  }

  async findOne (table, where, lookup) {
    return new Promise((resolve) => {
      setImmediate(async () => {
        where = where || {}
        if (!_.isNil(where._id)) {
          let regexp = new RegExp('^[0-9a-fA-F]{24}$')
          if (regexp.test(where._id)) where._id = new ObjectID(where._id)
          else resolve({})
        } else where = flatten(where)

        try {
          if (lookup) {
            const lookupArr = []
            if (lookup.constructor !== Array) lookup = [lookup]
            for (const l of lookup) {
              lookupArr.push({ $lookup: l })
            }
            let item = await this.client.db(this.dbName).collection(table).aggregate([{ $match: where }, ...lookupArr])
            item = await item.toArray();
            resolve(item[0] || {})
          } else {
            let item = await this.client.db(this.dbName).collection(table).findOne(where)
            resolve(item || {})
          }
        } catch (e) {
          error(e.stack)
          if (e.message.match(/EPIPE/g)) {
            error('Something went wrong with mongodb instance (EPIPE error)')
            process.exit()
          }
        }
      })
    })
  }

  async insert (table, object) {
    return new Promise((resolve) => {
      setImmediate(async () => {
        object = _.clone(object)
        delete object._id
        if (_.isEmpty(object)) throw Error('Object cannot be empty')

        try {
          let db = this.client.db(this.dbName)
          let item;
          if (Array.isArray(object)) {
            item = await db.collection(table).insertMany(object);
            resolve(item.ops);
          } else {
            item = await db.collection(table).insertOne(unflatten(object));
            resolve(item.ops[0]);
          }
        } catch (e) {
          if (e.message.match(/EPIPE/g)) {
            error('Something went wrong with mongodb instance (EPIPE error)')
            process.exit()
          }
        }
      });
    });
  }

  async incrementOne (table, where, object) {
    return new Promise((resolve) => {
      setImmediate(async () => {
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
          resolve(item.value)
        } catch (e) {
          error(e.stack)
          if (e.message.match(/EPIPE/g)) {
            error('Something went wrong with mongodb instance (EPIPE error)')
            process.exit()
          }
        }
      });
    });
  }

  async increment (table, where, object) {
    return new Promise((resolve) => {
      setImmediate(async () => {
        where = where || {}
        if (!_.isNil(where._id)) where._id = new ObjectID(where._id)
        else where = flatten(where)

        if (_.isEmpty(object)) throw Error('Object to update cannot be empty')
        delete object._id

        try {
          let db = this.client.db(this.dbName)

          await db.collection(table).updateOne(
            where,
            // DON'T EVER DELETE flatten ON OBJECT - with flatten object get updated and not replaced
            { $inc: flatten(object) }, {
              upsert: true,
              multi: _.isEmpty(where)
            }
          )

          // workaround for return of updated objects
          let items = await db.collection(table).find(where).toArray()
          resolve(items)
        } catch (e) {
          error(e.stack)
          if (e.message.match(/EPIPE/g)) {
            error('Something went wrong with mongodb instance (EPIPE error)')
            process.exit()
          }
        }
      });
    });
  }

  async remove (table, where) {
    return new Promise((resolve) => {
      setImmediate(async () => {
        if (!_.isNil(where._id)) {
          where._id = new ObjectID(where._id)
        } else {
          if (_.some(Object.keys(flatten(where)).map(o => o.includes('$regex') | o.includes('$nin')))) {
            if (Object.keys(flatten(where)).length > 1) {
              throw Error('Don\'t use $regex, $nin with other search attributes');
            }
          } else {
            where = flatten(where)
          }
        }

        try {
          let db = this.client.db(this.dbName)
          let result = await db.collection(table).deleteMany(where)
          resolve(result.result.n)
        } catch (e) {
          error(e.stack)
          if (e.message.match(/EPIPE/g)) {
            error('Something went wrong with mongodb instance (EPIPE error)')
            process.exit()
          }
        }
      });
    });
  }

  async update (table, where, object) {
    return new Promise((resolve) => {
      setImmediate(async () => {
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
          resolve(items.length === 1 ? items[0] : items)
        } catch (e) {
          if (e.message.startsWith('E11000 duplicate key error collection')) {
            // this often means that update was too fast...re-do after io
            setImmediate(() => this.update(table, where, object))
          } else if (e.message.match(/EPIPE/g)) {
            error(e.stack)
            error('Something went wrong with mongodb instance (EPIPE error)')
            process.exit()
          } else {
            error(e.stack)
          }
        }
      });
    });
  }

  async count (table) {
    try {
      let db = this.client.db(this.dbName)
      return db.collection(table).countDocuments()
    } catch (e) {
      error(e.stack)
      if (e.message.match(/EPIPE/g)) {
        error('Something went wrong with mongodb instance (EPIPE error)')
        process.exit()
      }
    }
  }

  async collections () {
    try {
      let db = this.client.db(this.dbName)
      return (await db.listCollections().toArray()).map(o => o.name)
    } catch (e) {
      error(e.stack)
      if (e.message.match(/EPIPE/g)) {
        error('Something went wrong with mongodb instance (EPIPE error)')
        process.exit()
      }
    }
  }

  async drop (table) {
    try {
      let db = this.client.db(this.dbName)
      return db.collection(table).drop()
    } catch (e) {
      error(e.stack)
      if (e.message.match(/EPIPE/g)) {
        error('Something went wrong with mongodb instance (EPIPE error)')
        process.exit()
      }
    }
  }
}

module.exports = IMongoDB

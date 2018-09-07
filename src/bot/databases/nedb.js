const _ = require('lodash')
const flatten = require('flat')
const fs = require('fs')
const cluster = require('cluster')

const Interface = require('./interface')
const Datastore = require('nedb')

// debug
const debug = require('debug')('db:nedb')

class INeDB extends Interface {
  constructor (forceIndexes) {
    super('nedb')
    this.createIndexes = forceIndexes || cluster.isWorker // create indexes on worker (cpu is always 1)
    this.connected = true

    if (!fs.existsSync('./db')) fs.mkdirSync('./db')
    if (!fs.existsSync('./db/nedb')) fs.mkdirSync('./db/nedb')

    this.table = {}

    if (debug.enabled) debug('NeDB initialized')
  }

  async index (opts) {
    opts.unique = opts.unique || false
    if (!opts.index) throw new Error('Missing index option')
    if (!opts.table) throw new Error('Missing table option')

    await this.table[opts.table].removeIndex(opts.index)
    await this.table[opts.table].ensureIndex({ fieldName: opts.index, unique: opts.unique })
  }

  on (table) {
    if (_.isNil(this.table[table])) {
      this.table[table] = new Datastore({ filename: './db/nedb/' + table + '.db', autoload: true })
      this.table[table].persistence.setAutocompactionInterval(60000)

      switch (table) {
        case 'users.bits':
        case 'users.tips':
          this.table[table].removeIndex('timestamp')
          break
        case 'users':
        case 'users.online':
        case 'users.points':
        case 'users.messages':
        case 'users.watched':
        case 'cache.hosts':
          this.table[table].removeIndex('username')
          this.table[table].removeIndex('id')
          break
        case 'cache':
        case 'customTranslations':
          this.table[table].removeIndex('key')
          break
        case 'stats':
          this.table[table].removeIndex('whenOnline')
          break
      }

      // create indexes
      if (this.createIndexes) {
        switch (table) {
          case 'users.bits':
          case 'users.tips':
            this.table[table].ensureIndex({ fieldName: 'timestamp' })
            break
          case 'users':
            this.table[table].ensureIndex({ fieldName: 'username', unique: true })
            this.table[table].ensureIndex({ fieldName: 'id', unique: true })
            break
          case 'cache.hosts':
            this.table[table].ensureIndex({ fieldName: 'username', unique: true })
            break
          case 'users.online':
          case 'users.points':
          case 'users.messages':
          case 'users.watched':
            this.table[table].ensureIndex({ fieldName: 'username' })
            break
          case 'cache':
          case 'customTranslations':
            this.table[table].ensureIndex({ fieldName: 'key', unique: true })
            break
          case 'stats':
            this.table[table].ensureIndex({ fieldName: 'whenOnline' })
            break
        }
      }
    }
    return this.table[table]
  }

  async find (table, where) {
    this.on(table) // init table

    where = where || {}
    where._sort = where._sort || '_id'

    const sortBy = where._sort.startsWith('-') ? where._sort.replace('-', '') : where._sort
    const order = where._sort.startsWith('-') ? 'asc' : 'desc'
    const sumBy = where._sum || undefined
    const groupBy = where._group || undefined
    const total = where._total || undefined

    delete where._sort; delete where._sum; delete where._total; delete where._group
    where = flatten(where)

    return new Promise((resolve, reject) => {
      try {
        this.on(table).find(flatten(where), (err, items) => {
          if (err) reject(err)
          if (debug.enabled) debug('find() \n\ttable: %s \n\twhere: %j \n\titems: %j', table, where, items)

          // nedb needs to fake sum and group by
          if (sumBy || groupBy) {
            let _items = {}
            for (let item of items) {
              if (isNaN(_items[item[groupBy]])) _items[item[groupBy]] = 0
              _items[item[groupBy]] += Number(item[sumBy])
            }
            items = []
            for (let [_id, sum] of Object.entries(_items)) {
              items.push({ _id, [sumBy]: sum })
            }
          }

          // nedb needs to fake sort
          if (sortBy !== '_id') {
            // remove undefined values in sortBy
            items = items.filter(o => _.get(o, sortBy, false))
          }
          items = _.orderBy(items, sortBy, order)

          // nedb needs to fake total
          if (total) items = _.chunk(items, total)[0]

          resolve(items || [])
        })
      } catch (e) {
        global.log.error(e.message)
        throw e
      }
    })
  }

  async findOne (table, where) {
    this.on(table) // init table

    where = where || {}

    var self = this
    return new Promise(function (resolve, reject) {
      try {
        self.on(table).findOne(flatten(where), function (err, item) {
          if (err) reject(err)
          if (debug.enabled) debug('findOne() \n\ttable: %s \n\twhere: %j \n\titem: %j', table, where, _.isNil(item) ? {} : item)
          resolve(_.isNil(item) ? {} : item)
        })
      } catch (e) {
        global.log.error(e.message)
        throw e
      }
    })
  }

  async insert (table, object) {
    object = _.clone(object)
    this.on(table) // init table

    delete object._id
    if (_.isEmpty(object)) throw Error('Object cannot be empty')

    var self = this
    return new Promise(function (resolve, reject) {
      try {
        self.on(table).insert(flatten.unflatten(object), function (err, item) {
          if (err) reject(err)
          if (debug.enabled) debug('insert() \n\ttable: %s \n\tobject: %j', table, object)

          resolve(item)
        })
      } catch (e) {
        global.log.error(e.message)
        throw e
      }
    })
  }

  async remove (table, where) {
    this.on(table) // init table

    var self = this
    return new Promise(function (resolve, reject) {
      try {
        self.on(table).remove(flatten(where), { multi: true }, function (err, numRemoved) {
          if (err) reject(err)
          if (debug.enabled) debug('remove() \n\ttable: %s \n\twhere: %j \n\tremoved: %j', table, where, numRemoved)
          resolve(numRemoved)
        })
      } catch (e) {
        global.log.error(e.message)
        throw e
      }
    })
  }

  async update (table, where, object) {
    this.on(table) // init table

    if (_.isEmpty(object)) throw Error('Object to update cannot be empty')

    var self = this
    return new Promise(function (resolve, reject) {
      // DON'T EVER DELETE flatten ON OBJECT - with flatten object get updated and not replaced
      try {
        self.on(table).update(flatten(where), { $set: flatten(object, { safe: true }) }, { upsert: (_.isNil(where._id) && !_.isEmpty(where)), multi: (_.isEmpty(where)), returnUpdatedDocs: true }, function (err, numReplaced, affectedDocs) {
          if (err) reject(err)
          if (debug.enabled) debug('update() \n\ttable: %s \n\twhere: %j \n\tupdated: %j', table, where, numReplaced)
          resolve(affectedDocs)
        })
      } catch (e) {
        global.log.error(e.message)
        throw e
      }
    })
  }

  async incrementOne (table, where, object) {
    this.on(table) // init table

    if (_.isEmpty(object)) throw Error('Object to update cannot be empty')

    var self = this
    return new Promise(function (resolve, reject) {
      // DON'T EVER DELETE flatten ON OBJECT - with flatten object get updated and not replaced
      try {
        self.on(table).update(flatten(where), { $inc: flatten(object) }, { upsert: true, multi: false, returnUpdatedDocs: true }, function (err, numReplaced, affectedDocs) {
          if (err) reject(err)
          if (debug.enabled) debug('increment() \n\ttable: %s \n\twhere: %j \n\tupdated: %j', table, where, numReplaced)
          resolve(affectedDocs)
        })
      } catch (e) {
        global.log.error(e.message)
        throw e
      }
    })
  }

  async increment (table, where, object) {
    this.on(table) // init table

    if (_.isEmpty(object)) throw Error('Object to update cannot be empty')

    var self = this
    return new Promise(function (resolve, reject) {
      // DON'T EVER DELETE flatten ON OBJECT - with flatten object get updated and not replaced
      try {
        self.on(table).update(flatten(where), { $inc: flatten(object) }, { upsert: true, multi: true, returnUpdatedDocs: true }, function (err, numReplaced, affectedDocs) {
          if (err) reject(err)
          if (debug.enabled) debug('increment() \n\ttable: %s \n\twhere: %j \n\tupdated: %j', table, where, numReplaced)
          resolve(affectedDocs)
        })
      } catch (e) {
        global.log.error(e.message)
        throw e
      }
    })
  }

  async count (table) {
    this.on(table) // init table

    var self = this
    return new Promise(function (resolve, reject) {
      // DON'T EVER DELETE flatten ON OBJECT - with flatten object get updated and not replaced
      try {
        self.on(table).count({}, function (err, count) {
          if (err) reject(err)
          resolve(count)
        })
      } catch (e) {
        global.log.error(e.message)
        throw e
      }
    })
  }
}

module.exports = INeDB

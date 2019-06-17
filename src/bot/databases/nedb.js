const _ = require('lodash')
const fs = require('fs')
const util = require('util')
const {
  isMainThread
} = require('worker_threads');
const {
  flatten, unflatten
} = require('../commons');
import { debug } from '../debug';

const Interface = require('./interface')
const Datastore = require('nedb')

class INeDB extends Interface {
  constructor (forceIndexes) {
    super('nedb')
    this.createIndexes = forceIndexes || !isMainThread // create indexes on worker (cpu is always 1)

    setTimeout(() => {
      this.connected = true; // slow down for proper load
    }, isMainThread ? 0 : 5000)

    if (!fs.existsSync('./db')) fs.mkdirSync('./db')
    if (!fs.existsSync('./db/nedb')) fs.mkdirSync('./db/nedb')
    this.table = {}

    debug('db', 'Starting NeDB - ' + isMainThread);
  }

  async index (table, opts) {
    if (!table) throw new Error('Missing table option')

    await this.on(table).removeIndex()
    if (!Array.isArray(opts)) opts = [opts]
    for (const o of opts) {
      o.unique = o.unique || false
      if (!o.index) throw new Error('Missing index option')
      await this.on(table).ensureIndex({ fieldName: o.index, unique: o.unique })
    }
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
            this.table[table].ensureIndex({ fieldName: 'username' })
            this.table[table].ensureIndex({ fieldName: 'id', unique: true })
            break
          case 'cache.hosts':
            this.table[table].ensureIndex({ fieldName: 'username', unique: true })
            break
          case 'users.online':
            this.table[table].ensureIndex({ fieldName: 'username' })
            break
          case 'users.points':
          case 'users.messages':
          case 'users.watched':
            this.table[table].ensureIndex({ fieldName: 'id', unique: true })
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

  async find (table, where, lookup) {
    this.on(table) // init table

    where = where || {}
    where._sort = where._sort || '_id'

    const sortBy = where._sort.startsWith('-') ? where._sort.replace('-', '') : where._sort
    const order = where._sort.startsWith('-') ? 'asc' : 'desc'
    const sumBy = where._sum || undefined
    const groupBy = where._group || undefined
    const total = where._total || undefined

    delete where._sort; delete where._sum; delete where._total; delete where._group
    if (_.some(Object.keys(flatten(where)).map(o => o.includes('$regex')))) {
      if (Object.keys(flatten(where)).length > 1) {
        throw Error('Don\'t use $regex with other search attributes');
      }
    } else {
      where = flatten(where)
    }

    return new Promise((resolve, reject) => {
      this.on(table).find(where, async (err, items) => {
        if (err) {
          global.log.error(err.message)
          global.log.error(util.inspect({ type: 'find', table, where }))
        }

        if (lookup) {
          // cast to array
          if (lookup.constructor !== Array) lookup = [lookup]
          for (const item of items) {
            for (const l of lookup) {
              item[l.as] = await global.db.engine.find(l.from, { [l.foreignField]: item[l.localField]})
            }
          }
        }

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
          items = items.filter(o => _.has(o, sortBy))
        }
        items = _.orderBy(items, sortBy, order)

        // nedb needs to fake total
        if (total) items = _.chunk(items, total)[0]

        resolve(items || [])
      })
    })
  }

  async findOne (table, where, lookup) {
    this.on(table) // init table

    where = where || {}

    var self = this
    return new Promise(function (resolve, reject) {
      self.on(table).findOne(flatten(where), async (err, item) => {
        if (err) {
          global.log.error(err.message)
          global.log.error(util.inspect({ type: 'findOne', table, where }))
        }

        if (lookup && item !== null) {
          // cast to array
          if (lookup.constructor !== Array) lookup = [lookup]
          for (const l of lookup) {
            item[l.as] = await global.db.engine.find(l.from, { [l.foreignField]: item[l.localField]})
          }
        }

        resolve(_.isNil(item) ? {} : item)
      })
    })
  }

  async insert (table, object) {
    object = _.clone(object)
    this.on(table) // init table

    delete object._id
    if (_.isEmpty(object)) throw Error('Object cannot be empty')

    var self = this
    return new Promise(function (resolve, reject) {
      self.on(table).insert(unflatten(object), function (err, item) {
        if (err) {
          global.log.error(err.message)
          global.log.error(util.inspect({ type: 'insert', table, object }))
        }
        resolve(item)
      })
    })
  }

  async remove (table, where) {
    this.on(table) // init table

    var self = this
    return new Promise(function (resolve, reject) {
      self.on(table).remove(flatten(where), { multi: true }, function (err, numRemoved) {
        if (err) {
          global.log.error(err.message)
          global.log.error(util.inspect({ type: 'remove', table, where }))
        }
        resolve(numRemoved)
      })
    })
  }

  async update (table, where, object) {
    this.on(table) // init table

    if (_.isEmpty(object)) {
      global.log.error('Object to update cannot be empty')
      global.log.error(util.inspect({ type: 'update', table, object, where }))
      return null
    }

    var self = this
    return new Promise(function (resolve, reject) {
      // DON'T EVER DELETE flatten ON OBJECT - with flatten object get updated and not replaced
      self.on(table).update(flatten(where), { $set: flatten(object, { safe: true }) }, { upsert: (_.isNil(where._id) && !_.isEmpty(where)), multi: (_.isEmpty(where)), returnUpdatedDocs: true }, function (err, numReplaced, affectedDocs) {
        if (err) {
          global.log.error(err.message)
          global.log.error(util.inspect({ type: 'update', table, object, where }))
        }
        resolve(affectedDocs)
      })
    })
  }

  async incrementOne (table, where, object) {
    this.on(table) // init table

    if (_.isEmpty(object)) {
      global.log.error('Object to update cannot be empty')
      global.log.error(util.inspect({ type: 'incrementOne', table, object, where }))
      return null
    }

    var self = this
    return new Promise(function (resolve, reject) {
      // DON'T EVER DELETE flatten ON OBJECT - with flatten object get updated and not replaced
      self.on(table).update(flatten(where), { $inc: flatten(object) }, { upsert: true, multi: false, returnUpdatedDocs: true }, function (err, numReplaced, affectedDocs) {
        if (err) {
          global.log.error(err.message)
          global.log.error(util.inspect({ type: 'incrementOne', table, object, where }))
        }
        resolve(affectedDocs)
      })
    })
  }

  async increment (table, where, object) {
    this.on(table) // init table

    if (_.isEmpty(object)) {
      global.log.error('Object to update cannot be empty')
      global.log.error(util.inspect({ type: 'increment', table, object, where }))
      return null
    }

    var self = this
    return new Promise(function (resolve, reject) {
      // DON'T EVER DELETE flatten ON OBJECT - with flatten object get updated and not replaced
      self.on(table).update(flatten(where), { $inc: flatten(object) }, { upsert: true, multi: true, returnUpdatedDocs: true }, function (err, numReplaced, affectedDocs) {
        if (err) {
          global.log.error(err.message)
          global.log.error(util.inspect({ type: 'increment', table, object, where }))
        }
        resolve(affectedDocs)
      })
    })
  }

  async count (table) {
    this.on(table) // init table

    var self = this
    return new Promise(function (resolve, reject) {
      // DON'T EVER DELETE flatten ON OBJECT - with flatten object get updated and not replaced
      self.on(table).count({}, function (err, count) {
        if (err) {
          global.log.error(err.message)
          global.log.error(util.inspect({ type: 'count', table }))
        }
        resolve(count)
      })
    })
  }

  async collections () {
    try {
      return fs.readdirSync('./db/nedb').map(o => o.replace('.db', ''))
    } catch (e) {
      global.log.error(e.message)
      throw e
    }
  }
}

module.exports = INeDB

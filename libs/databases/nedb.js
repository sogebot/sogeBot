const _ = require('lodash')
const flatten = require('flat')
const fs = require('fs')
const cache = require('memory-cache')

const Interface = require('./interface')
const Datastore = require('nedb')

// debug
const debug = require('debug')('db:nedb')

class INeDB extends Interface {
  constructor () {
    super('nedb')

    if (!fs.existsSync('./db')) fs.mkdirSync('./db')
    if (!fs.existsSync('./db/nedb')) fs.mkdirSync('./db/nedb')

    this.table = {}
    this.cache = {}

    if (debug.enabled) debug('NeDB initialized')
  }

  on (table) {
    if (_.isNil(this.table[table])) {
      this.table[table] = new Datastore({ filename: './db/nedb/' + table + '.db', autoload: true })
      this.table[table].persistence.setAutocompactionInterval(60000)
    }
    if (_.isNil(this.cache[table])) {
      this.cache[table] = new cache.Cache()
    }
    return this.table[table]
  }

  async find (table, where) {
    this.on(table) // init table

    where = where || {}

    var self = this
    return new Promise(function (resolve, reject) {
      self.on(table).find(flatten(where), function (err, items) {
        if (err) reject(err)
        if (debug.enabled) debug('find() \n\ttable: %s \n\twhere: %j \n\titems: %j', table, where, items)

        for (let item of items) {
          self.cache[table].put(item._id, item)
        }
        resolve(items)
      })
    })
  }

  async findOne (table, where) {
    this.on(table) // init table

    where = where || {}

    // get from cache
    var keys = this.cache[table].keys()
    for (let key of keys) {
      if (!_.isEmpty((_.filter(this.cache[table].get(key), where)))) {
        return this.cache[table].get(key)
      }
    }

    var self = this
    return new Promise(function (resolve, reject) {
      self.on(table).findOne(flatten(where), function (err, item) {
        if (err) reject(err)
        if (debug.enabled) debug('findOne() \n\ttable: %s \n\twhere: %j \n\titem: %j', table, where, _.isNil(item) ? {} : item)
        if (!_.isNil(item)) self.cache[table].put(item._id, item)
        resolve(_.isNil(item) ? {} : item)
      })
    })
  }

  async insert (table, object) {
    this.on(table) // init table

    if (_.isEmpty(object)) throw Error('Object cannot be empty')

    var self = this
    return new Promise(function (resolve, reject) {
      self.on(table).insert(object, function (err, item) {
        if (err) reject(err)
        if (debug.enabled) debug('insert() \n\ttable: %s \n\tobject: %j', table, object)

        self.cache[table].put(item._id, item)
        resolve(item)
      })
    })
  }

  async remove (table, where) {
    this.on(table) // init table

    if (_.isEmpty(where)) throw Error('Object to delete cannot be empty')

    // remove from cache
    var keys = this.cache[table].keys()
    for (let key of keys) {
      if (!_.isEmpty((_.filter(this.cache[table].get(key), where)))) {
        this.cache[table].del(key)
      }
    }

    var self = this
    return new Promise(function (resolve, reject) {
      self.on(table).remove(flatten(where), { multi: true }, function (err, numRemoved) {
        if (err) reject(err)
        if (debug.enabled) debug('remove() \n\ttable: %s \n\twhere: %j \n\tremoved: %j', table, where, numRemoved)
        resolve(numRemoved)
      })
    })
  }

  async update (table, where, object) {
    this.on(table) // init table

    if (_.isEmpty(object)) throw Error('Object to update cannot be empty')

    // invalidate cache on update
    var keys = this.cache[table].keys()
    for (let key of keys) {
      if (!_.isEmpty((_.filter(this.cache[table].get(key), where)))) {
        this.cache[table].del(key)
      }
    }

    var self = this
    return new Promise(function (resolve, reject) {
      self.on(table).update(flatten(where), { $set: flatten(object) }, { upsert: (_.isNil(where._id) && !_.isEmpty(where)), multi: (_.isEmpty(where)) }, function (err, numReplaced) {
        if (err) reject(err)
        if (debug.enabled) debug('update() \n\ttable: %s \n\twhere: %j \n\tupdated: %j', table, where, numReplaced)
        resolve(numReplaced)
      })
    })
  }

  async increment (table, where, object) {
    this.on(table) // init table

    if (_.isEmpty(object)) throw Error('Object to update cannot be empty')

    // invalidate cache on update
    var keys = this.cache[table].keys()
    for (let key of keys) {
      if (!_.isEmpty((_.filter(this.cache[table].get(key), where)))) {
        this.cache[table].del(key)
      }
    }

    var self = this
    return new Promise(function (resolve, reject) {
      self.on(table).update(flatten(where), { $inc: flatten(object) }, { upsert: true, multi: (_.isEmpty(where)) }, function (err, numReplaced) {
        if (err) reject(err)
        if (debug.enabled) debug('increment() \n\ttable: %s \n\twhere: %j \n\tupdated: %j', table, where, numReplaced)
        resolve(numReplaced)
      })
    })
  }
}

module.exports = INeDB

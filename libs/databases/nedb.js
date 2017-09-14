const _ = require('lodash')
const flatten = require('flat')

const Interface = require('./interface')
const Datastore = require('nedb')

// debug
const debug = require('debug')('db:nedb')

class INeDB extends Interface {
  constructor () {
    super('nedb')

    this.engine = new Datastore({ filename: 'sogeBot.db', autoload: true })
    this.engine.persistence.setAutocompactionInterval(60000)

    if (debug.enabled) debug('NeDB initialized')
  }

  async find (table, where) {
    where = where || {}
    let query = {
      _table: table
    }
    _.merge(query, flatten(where))

    var self = this
    return new Promise(function (resolve, reject) {
      self.engine.find(query, function (err, items) {
        if (err) reject(err)
        if (debug.enabled) debug('find() query:%s', JSON.stringify(query))
        resolve(items)
      })
    })
  }

  async findOne (table, where) {
    where = where || {}
    let query = {
      _table: table
    }
    _.merge(query, flatten(where))
    var self = this
    return new Promise(function (resolve, reject) {
      self.engine.findOne(query, function (err, item) {
        if (err) reject(err)
        if (debug.enabled) debug('findOne() query:%s', JSON.stringify(query))
        resolve(_.isNil(item) ? {} : item)
      })
    })
  }

  async insert (table, object) {
    if (_.isEmpty(object)) throw Error('Object cannot be empty')

    let query = {
      _table: table
    }
    _.merge(query, object)

    var self = this
    return new Promise(function (resolve, reject) {
      self.engine.insert(query, function (err, item) {
        if (err) reject(err)
        if (debug.enabled) debug('insert() query:%s', JSON.stringify(query))
        resolve(item)
      })
    })
  }

  async remove (table, where) {
    if (_.isEmpty(where)) throw Error('Object to delete cannot be empty')

    let query = {
      _table: table
    }
    _.merge(query, where)

    var self = this
    return new Promise(function (resolve, reject) {
      self.engine.remove(query, { multi: true }, function (err, numRemoved) {
        if (err) reject(err)
        if (debug.enabled) debug('remove() query:%s', JSON.stringify(query))
        resolve(numRemoved)
      })
    })
  }

  async update (table, where, object) {
    if (_.isEmpty(object)) throw Error('Object to update cannot be empty')

    let query = {
      _table: table
    }
    _.merge(query, flatten(where))

    var self = this
    return new Promise(function (resolve, reject) {
      self.engine.update(query, { $set: flatten(object) }, { upsert: (_.isNil(query._id)), multi: (_.isEmpty(where)) }, function (err, numReplaced) {
        if (err) reject(err)
        if (debug.enabled) debug('update() query:%s, update:%s', JSON.stringify(query), JSON.stringify(object))
        resolve(numReplaced)
      })
    })
  }

  async increment (table, where, object) {
    if (_.isEmpty(object)) throw Error('Object to update cannot be empty')

    let query = {
      _table: table
    }
    _.merge(query, where)

    var self = this
    return new Promise(function (resolve, reject) {
      self.engine.update(query, { $inc: flatten(object) }, { upsert: true, multi: (_.isEmpty(where)) }, function (err, numReplaced) {
        if (err) reject(err)
        if (debug.enabled) debug('increment() query:%s, update:%s', JSON.stringify(query), JSON.stringify(object))
        resolve(numReplaced)
      })
    })
  }
}

module.exports = INeDB

const crypto = require('crypto')
const _ = require('lodash')

class Interface {
  constructor () {
    this.threads = {}
  }

  async waitForThread (table, query) {
    const queryHash = crypto.createHash('md5').update(table + query).digest('hex')
    const threadHash = crypto.createHash('md5').update(_.random(true).toString()).digest('hex')

    // check if queryHash exists
    if (_.isNil(this.threads[queryHash])) this.threads[queryHash] = []

    // check if threadHash exists in queryHash
    if (!_.find(this.threads[queryHash], (o) => o === threadHash)) this.threads[queryHash].push(threadHash)

    return new Promise((resolve, reject) => {
      var interval = setInterval(() => {
        if (_.get(this.threads[queryHash], '[0]', null) === threadHash) {
          clearInterval(interval)
          resolve(threadHash)
        }
      }, 10)
    })
  }

  async freeThread (table, query, threadHash) {
    _.remove(this.threads[crypto.createHash('md5').update(table + query).digest('hex')], (o) => o === threadHash)
  }

  /**
   * Asynchronous find several results on db
   * @param {string} table table to search
   * @param {object} where object to find in format {'toFind': 'value'} - example {'id': 'soge__'}
   * @returns {object} results
   */
  async find (table, where) {
    throw Error('function find() is not implemented in ' + this.constructor.name)
  }

  /**
   * Asynchronous find one result on db
   * @param {string} table table to search
   * @param {object} where object to find in format {'toFind': 'value'} - example {'id': 'soge__'}
   * @returns {object} exactly one result
   */
  async findOne (table, where) {
    throw Error('function findOne() is not implemented in ' + this.constructor.name)
  }

  /**
   * Asynchronous insert object into db
   * @param {string} table table to search
   * @param {object} object object to insert
   * @returns {object} created object
   */
  async insert (table, object) {
    throw Error('function insert() is not implemented in ' + this.constructor.name)
  }

  /**
   * Asynchronous remove objects on db
   * @param {string} table table to search
   * @param {object} where object to find in format {'toFind': 'value'} - example {'id': 'soge__'}
   * @returns {object} no. of results deleted
   */
  async remove (table, where) {
    throw Error('function remove() is not implemented in ' + this.constructor.name)
  }

  /**
   * Asynchronous update of object in db
   * @param {string} table table of object to update
   * @param {string} where object to search update
   * @param {object} object object data to update
   * @returns {object} no. of results updated
   */
  async update (table, where, object) {
    throw Error('function update() is not implemented in ' + this.constructor.name)
  }

  /**
   * Asynchronous increment update of object in db
   * @param {string} table table of object to update
   * @param {string} where object to search update
   * @param {object} object object data to update
   * @returns {object} no. of results updated
   */
  async increment (table, where, object) {
    throw Error('function increment() is not implemented in ' + this.constructor.name)
  }

  /**
   * Asynchronous increment update of one object in db
   * @param {string} table table of object to update
   * @param {string} where object to search update
   * @param {object} object object data to update
   * @returns {object} no. of results updated
   */
  async incrementOne (table, where, object) {
    throw Error('function incrementOne() is not implemented in ' + this.constructor.name)
  }
}

module.exports = Interface

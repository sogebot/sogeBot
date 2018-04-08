const _ = require('lodash')
const cluster = require('cluster')
const crypto = require('crypto')
const debug = require('debug')
const util = require('util')

const Interface = require('./interface')

class IMasterController extends Interface {
  constructor () {
    super('master')

    cluster.on('message', (worker, message) => {
      debug('db:master:incoming')(`Got data from Worker#${worker.id}\n${util.inspect(message)}`)
      worker.send({ type: 'dbAck', id: message.id })
      this.data[message.id] = {
        items: message.items,
        timestamp: _.now(),
        finished: false
      }
    })

    this.connected = false
    this.data = {}

    this.connect()

    setInterval(() => this.cleanup(), 100)
  }

  cleanup () {
    const size = _.size(this.data)
    for (let [id, values] of Object.entries(this.data)) {
      if (_.now() - values.timestamp > 10000 || values.finished) delete this.data[id]
    }
    debug('db:master:cleanup')('Cleaned up ' + (size - _.size(this.data)))
  }

  async connect () {
    let allOnline = true
    for (let worker in cluster.workers) {
      if (cluster.workers[worker].state !== 'online') allOnline = false
    }
    if (allOnline) setTimeout(() => { this.connected = true; debug('db:master')('Connected') }, 5000) // TODO: send workers db find and if returned then its ok
    else setTimeout(() => this.connect(), 10)
  }

  async find (table, where) {
    const id = crypto.randomBytes(64).toString('hex')
    _.sample(cluster.workers).send({ type: 'db', fnc: 'find', table: table, where: where, id: id })

    return new Promise((resolve, reject) => {
      const start = _.now()
      let returnData = (resolve, reject, id) => {
        if (_.now() - start > 5000) {
          global.log.error('DB operation failed - ' + util.inspect({ type: 'db', fnc: 'find', table: table, where: where, id: id }))
          reject('Return data was not found')
        }
        if (!_.isNil(this.data[id])) {
          this.data[id].finished = true
          resolve(this.data[id].items)
        } else setTimeout(() => returnData(resolve, reject, id), 1)
      }
      returnData(resolve, reject, id)
    })
  }

  async findOne (table, where) {
    const id = crypto.randomBytes(64).toString('hex')
    const worker = _.sample(cluster.workers)
    const data = { type: 'db', fnc: 'findOne', table: table, where: where, id: id }
    debug('db:master:findOne')(`Sending to worker#${worker.id} - is connected: ${worker.isConnected()}\n%j`, data)
    worker.send(data)

    return new Promise((resolve, reject) => {
      const start = _.now()
      let returnData = (resolve, reject, id) => {
        if (_.now() - start > 5000) {
          global.log.error('DB operation failed - ' + util.inspect({ type: 'db', fnc: 'findOne', table: table, where: where, id: id }))
          reject('Return data was not found')
        }
        if (!_.isNil(this.data[id])) {
          this.data[id].finished = true
          resolve(this.data[id].items)
        } else setTimeout(() => returnData(resolve, reject, id), 1)
      }
      returnData(resolve, reject, id)
    })
  }

  async insert (table, object) {
    const id = crypto.randomBytes(64).toString('hex')
    _.sample(cluster.workers).send({ type: 'db', fnc: 'insert', table: table, object: object, id: id })

    return new Promise((resolve, reject) => {
      const start = _.now()
      let returnData = (resolve, reject, id) => {
        if (_.now() - start > 5000) {
          global.log.error('DB operation failed - ' + util.inspect({ type: 'db', fnc: 'insert', table: table, object: object, id: id }))
          reject('Return data was not found')
        }
        if (!_.isNil(this.data[id])) {
          this.data[id].finished = true
          resolve(this.data[id].items)
        } else setTimeout(() => returnData(resolve, reject, id), 1)
      }
      returnData(resolve, reject, id)
    })
  }

  async remove (table, where) {
    const id = crypto.randomBytes(64).toString('hex')
    const worker = _.sample(cluster.workers)
    const data = { type: 'db', fnc: 'remove', table: table, where: where, id: id }
    debug('db:master:remove')(`Sending to worker#${worker.id} - is connected: ${worker.isConnected()}\n%j`, data)
    worker.send(data)

    return new Promise((resolve, reject) => {
      const start = _.now()
      let returnData = (resolve, reject, id) => {
        if (_.now() - start > 5000) {
          global.log.error('DB operation failed - ' + util.inspect({ type: 'db', fnc: 'remove', table: table, where: where, id: id }))
          reject('Return data was not found')
        }
        if (!_.isNil(this.data[id])) {
          this.data[id].finished = true
          resolve(this.data[id].items)
        } else setTimeout(() => returnData(resolve, reject, id), 1)
      }
      returnData(resolve, reject, id)
    })
  }

  async update (table, where, object) {
    const id = crypto.randomBytes(64).toString('hex')
    _.sample(cluster.workers).send({ type: 'db', fnc: 'update', table: table, where: where, object: object, id: id })

    return new Promise((resolve, reject) => {
      const start = _.now()
      let returnData = (resolve, reject, id) => {
        if (_.now() - start > 5000) {
          global.log.error('DB operation failed - ' + util.inspect({ type: 'db', fnc: 'update', table: table, where: where, object: object, id: id }))
          reject('Return data was not found')
        }
        if (!_.isNil(this.data[id])) {
          this.data[id].finished = true
          resolve(this.data[id].items)
        } else setTimeout(() => returnData(resolve, reject, id), 1)
      }
      returnData(resolve, reject, id)
    })
  }

  async incrementOne (table, where, object) {
    const id = crypto.randomBytes(64).toString('hex')
    _.sample(cluster.workers).send({ type: 'db', fnc: 'incrementOne', table: table, where: where, object: object, id: id })

    return new Promise((resolve, reject) => {
      const start = _.now()
      let returnData = (resolve, reject, id) => {
        if (_.now() - start > 60000) reject('Return data was not found')
        if (!_.isNil(this.data[id])) {
          this.data[id].finished = true
          resolve(this.data[id].items)
        } else setTimeout(() => returnData(resolve, reject, id), 1)
      }
      returnData(resolve, reject, id)
    })
  }

  async increment (table, where, object) {
    const id = crypto.randomBytes(64).toString('hex')
    _.sample(cluster.workers).send({ type: 'db', fnc: 'increment', table: table, where: where, object: object, id: id })

    return new Promise((resolve, reject) => {
      const start = _.now()
      let returnData = (resolve, reject, id) => {
        if (_.now() - start > 5000) {
          global.log.error('DB operation failed - ' + util.inspect({ type: 'db', fnc: 'increment', table: table, where: where, object: object, id: id }))
          reject('Return data was not found')
        }
        if (!_.isNil(this.data[id])) {
          this.data[id].finished = true
          resolve(this.data[id].items)
        } else setTimeout(() => returnData(resolve, reject, id), 1)
      }
      returnData(resolve, reject, id)
    })
  }
}

module.exports = IMasterController

const _ = require('lodash')
const crypto = require('crypto')
const cluster = require('cluster')

const Interface = require('./interface')

class IWorkerController extends Interface {
  constructor () {
    super('worker')

    this.timeouts = {}

    process.on('message', (message) => {
      if (message.type !== 'db') return
      this.data.push({
        id: message.id,
        items: message.items,
        timestamp: _.now()
      })
    })

    this.connected = false
    this.data = []

    this.connect()
  }

  async connect () {
    this.connected = !_.isEmpty(await this.checkConnection())
    if (!this.connected) return setTimeout(() => this.connect(), 1000) // re-do on first error
  }

  async checkConnection () {
    let timeout = new Promise((resolve, reject) => {
      let id = setTimeout(() => {
        clearTimeout(id)
        resolve(false)
      }, 5000)
    })
    return Promise.race([
      this.find('info'),
      timeout
    ])
  }

  sendRequest (resolve, reject, id, data) {
    clearTimeout(this.timeouts[`sendRequest-${id}`])
    delete this.timeouts[`sendRequest-${id}`]

    try {
      data.clusterId = cluster.worker.id
      process.send(data)
      this.returnData(resolve, reject, id)
    } catch (e) {
      setTimeout(() => this.sendRequest(resolve, reject, id, data), 100)
    }
  }

  returnData (resolve, reject, id) {
    clearTimeout(this.timeouts[`returnData-${id}`])
    delete this.timeouts[`returnData-${id}`]

    let dataFromWorker = _.find(this.data, (o) => o.id === id)
    if (!_.isNil(dataFromWorker)) {
      const items = dataFromWorker.items
      _.remove(this.data, (o) => o.id === id)
      resolve(items)
    } else setTimeout(() => this.returnData(resolve, reject, id), 100)
  }

  async find (table, where) {
    const id = crypto.randomBytes(64).toString('hex')
    const data = { type: 'db', fnc: 'find', table: table, where: where, id: id }

    return new Promise((resolve, reject) => {
      this.sendRequest(resolve, reject, id, data)
    })
  }

  async findOne (table, where) {
    const id = crypto.randomBytes(64).toString('hex')
    const data = { type: 'db', fnc: 'findOne', table: table, where: where, id: id }

    return new Promise((resolve, reject) => {
      this.sendRequest(resolve, reject, id, data)
    })
  }

  async insert (table, object) {
    const id = crypto.randomBytes(64).toString('hex')
    const data = { type: 'db', fnc: 'insert', table: table, object: object, id: id }

    return new Promise((resolve, reject) => {
      this.sendRequest(resolve, reject, id, data)
    })
  }

  async remove (table, where) {
    const id = crypto.randomBytes(64).toString('hex')
    const data = { type: 'db', fnc: 'remove', table: table, where: where, id: id }

    return new Promise((resolve, reject) => {
      this.sendRequest(resolve, reject, id, data)
    })
  }

  async update (table, where, object) {
    const id = crypto.randomBytes(64).toString('hex')
    const data = { type: 'db', fnc: 'update', table: table, where: where, object: object, id: id }

    return new Promise((resolve, reject) => {
      this.sendRequest(resolve, reject, id, data)
    })
  }

  async incrementOne (table, where, object) {
    const id = crypto.randomBytes(64).toString('hex')
    const data = { type: 'db', fnc: 'incrementOne', table: table, where: where, object: object, id: id }

    return new Promise((resolve, reject) => {
      this.sendRequest(resolve, reject, id, data)
    })
  }

  async increment (table, where, object) {
    const id = crypto.randomBytes(64).toString('hex')
    const data = { type: 'db', fnc: 'increment', table: table, where: where, object: object, id: id }

    return new Promise((resolve, reject) => {
      this.sendRequest(resolve, reject, id, data)
    })
  }

  async index (opts) {
    const id = crypto.randomBytes(64).toString('hex')
    const data = { type: 'db', fnc: 'index', opts, id }

    return new Promise((resolve, reject) => {
      this.sendRequest(resolve, reject, id, data)
    })
  }

  async count (table) {
    const id = crypto.randomBytes(64).toString('hex')
    const data = { type: 'db', fnc: 'count', table, id }

    return new Promise((resolve, reject) => {
      this.sendRequest(resolve, reject, id, data)
    })
  }
}

module.exports = IWorkerController

const _ = require('lodash')
const cluster = require('cluster')
const crypto = require('crypto')
const debug = require('debug')
const util = require('util')

const Interface = require('./interface')

class IMasterController extends Interface {
  constructor () {
    super('master')

    this.timeouts = {}

    cluster.on('message', (worker, message) => {
      if (message.type !== 'db') return
      debug('db:master:incoming')(`Got data from Worker#${worker.id}\n${util.inspect(message)}`)
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
    let allOnline = true
    for (let worker in cluster.workers) {
      if (cluster.workers[worker].state !== 'online') allOnline = false
    }
    if (allOnline) setTimeout(() => { this.connected = true; debug('db:master')('Connected') }, 5000) // TODO: send workers db find and if returned then its ok
    else setTimeout(() => this.connect(), 10)
  }

  async sendRequest (resolve, reject, id, data) {
    try {
      _.sample(cluster.workers).send(data)
      debug('db:master:request:id')(id)
      this.returnData(resolve, reject, id)
    } catch (e) {
      if (!_.isNil(this.timeouts.sendRequest)) clearTimeout(this.timeouts.sendRequest)
      this.timeouts.sendRequest = setTimeout(() => this.sendRequest(resolve, reject, id), 10, data)
    }
  }

  async returnData (resolve, reject, id) {
    let dataFromWorker = _.find(this.data, (o) => o.id === id)
    if (!_.isNil(dataFromWorker)) {
      const items = dataFromWorker.items
      _.remove(this.data, (o) => o.id === id)
      resolve(items)
    } else {
      if (!_.isNil(this.timeouts.returnData)) clearTimeout(this.timeouts.returnData)
      this.timeouts.returnData = setTimeout(() => this.returnData(resolve, reject, id), 10)
    }
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
}

module.exports = IMasterController

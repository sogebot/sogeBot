const _ = require('lodash')
const cluster = require('cluster')
const crypto = require('crypto')
const debug = require('debug')
const util = require('util')

const Interface = require('./interface')

class IMasterController extends Interface {
  constructor () {
    super('master')

    this.connected = false
    this.data = {}

    this.connect()

    cluster.on('message', (worker, message) => {
      debug('db:master')(`Got data from Worker#${worker.id}\n${util.inspect(message)}`)
      this.data[message.id] = message.items // make data available
    })
  }

  async connect () {
    let atLeastOneOnline = false
    for (let worker in cluster.workers) {
      if (cluster.workers[worker].state === 'online') atLeastOneOnline = true
    }
    if (atLeastOneOnline) setTimeout(() => { this.connected = true }, 5000) // TODO: send workers db find and if returned then its ok
    else setTimeout(() => this.connect(), 10)
  }

  async find (table, where) {
    const id = crypto.randomBytes(64).toString('hex')
    _.sample(cluster.workers).send({ type: 'db', fnc: 'find', table: table, where: where, id: id })

    return new Promise((resolve, reject) => {
      let returnData = (resolve, reject, id) => {
        if (!_.isNil(this.data[id])) {
          const data = this.data[id]
          delete this.data[id] // remove data
          resolve(data)
        } else setTimeout(() => returnData(resolve, reject, id), 1)
      }
      returnData(resolve, reject, id)
    })
  }

  async findOne (table, where) {
    const id = crypto.randomBytes(64).toString('hex')
    _.sample(cluster.workers).send({ type: 'db', fnc: 'findOne', table: table, where: where, id: id })

    return new Promise((resolve, reject) => {
      let returnData = (resolve, reject, id) => {
        if (!_.isNil(this.data[id])) {
          const data = this.data[id]
          delete this.data[id] // remove data
          resolve(data)
        } else setTimeout(() => returnData(resolve, reject, id), 1)
      }
      returnData(resolve, reject, id)
    })
  }

  async insert (table, object) {
    const id = crypto.randomBytes(64).toString('hex')
    _.sample(cluster.workers).send({ type: 'db', fnc: 'insert', table: table, object: object, id: id })

    return new Promise((resolve, reject) => {
      let returnData = (resolve, reject, id) => {
        if (!_.isNil(this.data[id])) {
          const data = this.data[id]
          delete this.data[id] // remove data
          resolve(data)
        } else setTimeout(() => returnData(resolve, reject, id), 1)
      }
      returnData(resolve, reject, id)
    })
  }

  async remove (table, where) {
    const id = crypto.randomBytes(64).toString('hex')
    _.sample(cluster.workers).send({ type: 'db', fnc: 'remove', table: table, where: where, id: id })

    return new Promise((resolve, reject) => {
      let returnData = (resolve, reject, id) => {
        if (!_.isNil(this.data[id])) {
          const data = this.data[id]
          delete this.data[id] // remove data
          resolve(data)
        } else setTimeout(() => returnData(resolve, reject, id), 1)
      }
      returnData(resolve, reject, id)
    })
  }

  async update (table, where, object) {
    const id = crypto.randomBytes(64).toString('hex')
    _.sample(cluster.workers).send({ type: 'db', fnc: 'update', table: table, where: where, object: object, id: id })

    return new Promise((resolve, reject) => {
      let returnData = (resolve, reject, id) => {
        if (!_.isNil(this.data[id])) {
          const data = this.data[id]
          delete this.data[id] // remove data
          resolve(data)
        } else setTimeout(() => returnData(resolve, reject, id), 1)
      }
      returnData(resolve, reject, id)
    })
  }

  async incrementOne (table, where, object) {
    const id = crypto.randomBytes(64).toString('hex')
    _.sample(cluster.workers).send({ type: 'db', fnc: 'incrementOne', table: table, where: where, object: object, id: id })

    return new Promise((resolve, reject) => {
      let returnData = (resolve, reject, id) => {
        if (!_.isNil(this.data[id])) {
          const data = this.data[id]
          delete this.data[id] // remove data
          resolve(data)
        } else setTimeout(() => returnData(resolve, reject, id), 1)
      }
      returnData(resolve, reject, id)
    })
  }

  async increment (table, where, object) {
    const id = crypto.randomBytes(64).toString('hex')
    _.sample(cluster.workers).send({ type: 'db', fnc: 'increment', table: table, where: where, object: object, id: id })

    return new Promise((resolve, reject) => {
      let returnData = (resolve, reject, id) => {
        if (!_.isNil(this.data[id])) {
          const data = this.data[id]
          delete this.data[id] // remove data
          resolve(data)
        } else setTimeout(() => returnData(resolve, reject, id), 1)
      }
      returnData(resolve, reject, id)
    })
  }
}

module.exports = IMasterController

const _ = require('lodash')
const crypto = require('crypto')
import { debug } from '../debug';
const {
  isMainThread
} = require('worker_threads');

const Interface = require('./interface')

class IMasterController extends Interface {
  constructor () {
    super('master')

    this.timeouts = {}

    this.connected = false
    this.data = []

    this.connect()

    debug('db', 'Starting master - ' + isMainThread);
  }

  async connect() {
    const connection = await this.checkConnection()
    if (!connection) {
      return setTimeout(() => this.connect(), 1000)
    } else {
      this.connected = true
    }
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
      global.workers.sendToWorker(data)
      this.returnData(resolve, reject, id)
    } catch (e) {
      setTimeout(() => this.sendRequest(resolve, reject, id, data), 10)
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
    } else setTimeout(() => this.returnData(resolve, reject, id), 10)
  }

  async find (table, where, lookup) {
    const id = crypto.randomBytes(64).toString('hex')
    const data = { type: 'db', fnc: 'find', table, where, id, lookup }

    return new Promise((resolve, reject) => {
      this.sendRequest(resolve, reject, id, data)
    })
  }

  async findOne (table, where, lookup) {
    const id = crypto.randomBytes(64).toString('hex')
    const data = { type: 'db', fnc: 'findOne', table, where, id, lookup }

    return new Promise((resolve, reject) => {
      this.sendRequest(resolve, reject, id, data)
    })
  }

  async insert (table, object) {
    if (_.isEmpty(object)) throw Error('Object to update cannot be empty')

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
    if (_.isEmpty(object)) throw Error('Object to update cannot be empty')

    const id = crypto.randomBytes(64).toString('hex')
    const data = { type: 'db', fnc: 'update', table: table, where: where, object: object, id: id }

    return new Promise((resolve, reject) => {
      this.sendRequest(resolve, reject, id, data)
    })
  }

  async incrementOne (table, where, object) {
    if (_.isEmpty(object)) throw Error('Object to update cannot be empty')

    const id = crypto.randomBytes(64).toString('hex')
    const data = { type: 'db', fnc: 'incrementOne', table: table, where: where, object: object, id: id }

    return new Promise((resolve, reject) => {
      this.sendRequest(resolve, reject, id, data)
    })
  }

  async increment (table, where, object) {
    if (_.isEmpty(object)) throw Error('Object to update cannot be empty')

    const id = crypto.randomBytes(64).toString('hex')
    const data = { type: 'db', fnc: 'increment', table: table, where: where, object: object, id: id }

    return new Promise((resolve, reject) => {
      this.sendRequest(resolve, reject, id, data)
    })
  }

  async index (table, opts) {
    const id = crypto.randomBytes(64).toString('hex')
    const data = { type: 'db', fnc: 'index', opts: [table, opts], id }

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

module.exports = IMasterController

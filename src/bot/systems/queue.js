'use strict'

// bot libraries
const constants = require('../constants')
const _ = require('lodash')

/*
 * !queue               - gets an info whether queue is opened or closed
 * !queue open          - open a queue
 * !queue close         - close a queue
 * !queue pick [amount] - pick [amount] (optional) of users from queue
 * !queue join          - join a queue
 * !queue clear         - clear a queue
 */
class Queue {
  constructor () {
    global.commons.isSystemEnabled(this)
  }

  commands () {
    return !global.commons.isSystemEnabled('queue')
      ? []
      : [
        {this: this, id: '!queue pick', command: '!queue pick', fnc: this.pick, permission: constants.OWNER_ONLY},
        {this: this, id: '!queue join', command: '!queue join', fnc: this.join, permission: constants.VIEWERS},
        {this: this, id: '!queue clear', command: '!queue clear', fnc: this.clear, permission: constants.OWNER_ONLY},
        {this: this, id: '!queue close', command: '!queue close', fnc: this.close, permission: constants.OWNER_ONLY},
        {this: this, id: '!queue open', command: '!queue open', fnc: this.open, permission: constants.OWNER_ONLY},
        {this: this, id: '!queue', command: '!queue', fnc: this.info, permission: constants.VIEWERS}
      ]
  }

  get timestamp () {
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne('cache', { key: 'system_queue_timestamp' }), 'value', null)))
  }
  set timestamp (v) {
    global.db.engine.update('cache', { key: 'system_queue_timestamp' }, { value: v })
  }

  get locked () {
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne('cache', { key: 'system_queue_locked' }), 'value', true)))
  }
  set locked (v) {
    this.timestamp = _.now()
    global.db.engine.update('cache', { key: 'system_queue_locked' }, { value: v })
  }

  get users () {
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne('cache', { key: 'system_queue_users' }), 'value', [])))
  }
  set users (v) {
    this.timestamp = _.now()
    global.db.engine.update('cache', { key: 'system_queue_users' }, { value: v })
  }

  get picked () {
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne('cache', { key: 'system_queue_picked' }), 'value', [])))
  }
  set picked (v) {
    global.db.engine.update('cache', { key: 'system_queue_picked' }, { value: v })
  }

  async addUser (username) {
    let users = await this.users
    if (users.indexOf(username) === -1) {
      users.push(username)
      this.users = users
    }
  }

  async getUsers (count) {
    let users = await this.users
    let toReturn = []
    for (let i = 0; i < count; i++) {
      if (users.length > 0) toReturn.push(users.shift())
    }
    this.users = users
    return toReturn
  }

  info (opts) {
    global.commons.sendMessage(global.translate(this.locked ? 'queue.info.closed' : 'queue.info.opened'), opts.sender)
  }

  open (opts) {
    this.locked = false
    global.commons.sendMessage(global.translate('queue.open'), opts.sender)
  }

  close (opts) {
    this.locked = true
    global.commons.sendMessage(global.translate('queue.close'), opts.sender)
  }

  async join (opts) {
    if (!(await this.locked)) {
      this.addUser(opts.sender.username)
      global.commons.sendMessage(global.translate('queue.join.opened'), opts.sender)
    } else {
      global.commons.sendMessage(global.translate('queue.join.closed'), opts.sender)
    }
  }

  clear (opts) {
    this.users = []
    this.picked = []
    global.commons.sendMessage(global.translate('queue.clear'), opts.sender)
  }

  async pick (opts) {
    var input = opts.parameters.match(/^(\d+)?/)[0]
    var amount = (input === '' ? 1 : parseInt(input, 10))

    let users = await this.getUsers(amount)
    this.picked = users

    for (let index in users) {
      users[index] = (await global.configuration.getValue('atUsername') ? '@' : '') + users[index]
    }

    var msg
    switch (users.length) {
      case 0:
        msg = global.translate('queue.picked.none')
        break
      case 1:
        msg = global.translate('queue.picked.single')
        break
      default:
        msg = global.translate('queue.picked.multi')
    }

    global.commons.sendMessage(msg
      .replace(/\$users/g, users.join(', ')), opts.sender)
  }
}

module.exports = new Queue()

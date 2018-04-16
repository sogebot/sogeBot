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
        {this: this, command: '!queue pick', fnc: this.pick, permission: constants.OWNER_ONLY},
        {this: this, command: '!queue join', fnc: this.join, permission: constants.VIEWERS},
        {this: this, command: '!queue clear', fnc: this.clear, permission: constants.OWNER_ONLY},
        {this: this, command: '!queue close', fnc: this.close, permission: constants.OWNER_ONLY},
        {this: this, command: '!queue open', fnc: this.open, permission: constants.OWNER_ONLY},
        {this: this, command: '!queue', fnc: this.info, permission: constants.VIEWERS}
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

  info (self, sender) {
    global.commons.sendMessage(global.translate(self.locked ? 'queue.info.closed' : 'queue.info.opened'), sender)
  }

  open (self, sender) {
    self.locked = false
    global.commons.sendMessage(global.translate('queue.open'), sender)
  }

  close (self, sender) {
    self.locked = true
    global.commons.sendMessage(global.translate('queue.close'), sender)
  }

  async join (self, sender) {
    if (!(await self.locked)) {
      self.addUser(sender.username)
      global.commons.sendMessage(global.translate('queue.join.opened'), sender)
    } else {
      global.commons.sendMessage(global.translate('queue.join.closed'), sender)
    }
  }

  clear (self, sender) {
    self.users = []
    self.picked = []
    global.commons.sendMessage(global.translate('queue.clear'), sender)
  }

  async pick (self, sender, text) {
    var input = text.match(/^(\d+)?/)[0]
    var amount = (input === '' ? 1 : parseInt(input, 10))

    let users = await self.getUsers(amount)
    self.picked = users

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
      .replace(/\$users/g, users.join(', ')), sender)
  }
}

module.exports = new Queue()

'use strict'

const _ = require('lodash')

// bot libraries
const System = require('./_interface')
const constants = require('../constants')

/*
 * !queue                            - gets an info whether queue is opened or closed
 * !queue open                       - open a queue
 * !queue close                      - close a queue
 * !queue pick [amount]              - pick [amount] (optional) of users from queue
 * !queue random [amount]            - random [amount] (optional) of users from queue
 * !queue join                       - join a queue
 * !queue clear                      - clear a queue
 * !queue list                       - current list of queue
 */
class Queue extends System {
  constructor () {
    const settings = {
      _: {
        locked: false
      },
      eligibility: {
        all: true,
        followers: true,
        subscribers: true
      },
      commands: [
        { name: '!queue random', permission: constants.OWNER_ONLY },
        { name: '!queue pick', permission: constants.OWNER_ONLY },
        { name: '!queue clear', permission: constants.OWNER_ONLY },
        { name: '!queue close', permission: constants.OWNER_ONLY },
        { name: '!queue open', permission: constants.OWNER_ONLY },
        { name: '!queue list', permission: constants.OWNER_ONLY },
        '!queue join',
        '!queue'
      ]
    }
    super({ settings })

    this.addWidget('queue', 'widget-title-queue', 'fas fa-users')
  }

  sockets () {
    this.socket.on('connection', (socket) => {
      socket.on('pick', async (data, cb) => {
        if (data.username) {
          let users = []
          if (_.isString(data.username)) data.username = [data.username]
          for (let user of data.username) {
            user = await global.db.engine.findOne(this.collection.data, { username: user })
            delete user._id
            users.push(user)
          }
          cb(null, await this.pickUsers({ sender: global.commons.getOwner(), users }))
        } else cb(null, await this.pickUsers({ sender: global.commons.getOwner(), parameters: String(data.count) }, data.random))
      })
    })
  }

  async getUsers (opts) {
    opts = opts || { amount: 1 }
    let users = await global.db.engine.find(this.collection.data)

    if (opts.random) {
      users = users.sort(() => Math.random())
    } else {
      users = users.sort(o => -(new Date(o.created_at).getTime()))
    }

    let toReturn = []
    let i = 0
    for (let user of users) {
      const isNotFollowerEligible = !user.is.follower && (await this.settings.eligibility.followers)
      const isNotSubscriberEligible = !user.is.subscriber && (await this.settings.eligibility.subscribers)
      if (isNotFollowerEligible && isNotSubscriberEligible) continue

      if (i < opts.amount) {
        await global.db.engine.remove(this.collection.data, { _id: String(user._id) })
        delete user._id
        toReturn.push(user)
      } else break
      i++
    }
    return toReturn
  }

  main (opts) {
    global.commons.sendMessage(global.translate(this.settings._.locked ? 'queue.info.closed' : 'queue.info.opened'), opts.sender)
  }

  open (opts) {
    this.settings._.locked = false
    global.commons.sendMessage(global.translate('queue.open'), opts.sender)
  }

  close (opts) {
    this.settings._.locked = true
    global.commons.sendMessage(global.translate('queue.close'), opts.sender)
  }

  async join (opts) {
    if (!(await this.settings._.locked)) {
      let user = await global.db.engine.findOne('users', { username: opts.sender.username })

      const [all, followers, subscribers] = await Promise.all([this.settings.eligibility.all, this.settings.eligibility.followers, this.settings.eligibility.subscribers])

      let eligible = false
      if (!all) {
        if ((followers && subscribers) && (user.is.follower || user.is.subscriber)) eligible = true
        else if (followers && user.is.follower) eligible = true
        else if (subscribers && user.is.subscriber) eligible = true
      } else {
        eligible = true
      }

      if (eligible) {
        await global.db.engine.update(this.collection.data, { username: opts.sender.username }, { username: opts.sender.username, is: user.is, created_at: String(new Date()) })
        global.commons.sendMessage(global.translate('queue.join.opened'), opts.sender)
      }
    } else {
      global.commons.sendMessage(global.translate('queue.join.closed'), opts.sender)
    }
  }

  clear (opts) {
    global.db.engine.remove(this.collection.data, {})
    global.db.engine.remove(this.collection.picked, {})
    global.commons.sendMessage(global.translate('queue.clear'), opts.sender)
  }

  async random (opts) {
    this.pickUsers(opts, true)
  }

  async pick (opts) {
    this.pickUsers(opts, false)
  }

  async pickUsers (opts, random) {
    let users
    if (!opts.users) {
      var input = opts.parameters.match(/^(\d+)?/)[0]
      var amount = (input === '' ? 1 : parseInt(input, 10))
      users = await this.getUsers({ amount, random })
    } else {
      users = opts.users
      for (let user of users) await global.db.engine.remove(this.collection.data, { username: user.username })
    }

    await global.db.engine.remove(this.collection.picked, {})
    for (let user of users) await global.db.engine.update(this.collection.picked, { username: user.username }, user)

    const atUsername = await global.configuration.getValue('atUsername')

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

    global.commons.sendMessage(msg.replace(/\$users/g, users.map(o => atUsername ? `@${o.username}` : o.username).join(', ')), opts.sender)
    return users
  }

  async list (opts) {
    let [atUsername, users] = await Promise.all([
      global.configuration.getValue('atUsername'),
      global.db.engine.find(this.collection.data)
    ])
    users = users.map(o => atUsername ? `@${o.username}` : o).join(', ')
    global.commons.sendMessage(
      await global.commons.prepare('queue.list', { users }), opts.sender
    )
  }
}

module.exports = new Queue()

'use strict'

// bot libraries
const System = require('./_interface')
const constants = require('../constants')

/*
 * !queue                            - gets an info whether queue is opened or closed
 * !queue open                       - open a queue
 * !queue close                      - close a queue
 * !queue pick follower [amount]     - pick [amount] (optional) of followers from queue
 * !queue pick subscriber [amount]   - pick [amount] (optional) of subscribers from queue
 * !queue pick [amount]              - pick [amount] (optional) of users from queue
 * !queue random follower [amount]   - random [amount] (optional) of followers from queue
 * !queue random subscriber [amount] - random [amount] (optional) of subscribers from queue
 * !queue random [amount]            - random [amount] (optional) of users from queue
 * !queue join                       - join a queue
 * !queue clear                      - clear a queue
 * !queue list                       - current list of queue
 */
class Queue extends System {
  constructor () {
    const settings = {
      _: {
        locked: false,
        picked: []
      },
      commands: [
        {name: '!queue random follower', permission: constants.OWNER_ONLY},
        {name: '!queue random subscriber', permission: constants.OWNER_ONLY},
        {name: '!queue random', permission: constants.OWNER_ONLY},
        {name: '!queue pick follower', permission: constants.OWNER_ONLY},
        {name: '!queue pick subscriber', permission: constants.OWNER_ONLY},
        {name: '!queue pick', permission: constants.OWNER_ONLY},
        {name: '!queue clear', permission: constants.OWNER_ONLY},
        {name: '!queue close', permission: constants.OWNER_ONLY},
        {name: '!queue open', permission: constants.OWNER_ONLY},
        {name: '!queue list', permission: constants.OWNER_ONLY},
        '!queue join',
        '!queue'
      ]
    }
    super({settings})
  }

  async getUsers (opts) {
    opts = opts || { amount: 1 }
    let users = await global.db.engine.find(this.collection.data)
    if (opts.filter) {
      users = users.filter(o => o.is[opts.filter])
    }
    if (opts.random) {
      users = users.sort(() => Math.random())
    } else {
      users = users.sort(o => new Date(o.created_at).getTime())
    }

    let toReturn = []
    let i = 0
    for (let user of users) {
      if (i < opts.amount) {
        toReturn.push(user.username)
        await global.db.engine.remove(this.collection.data, { _id: String(user._id) })
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
      await global.db.engine.update(this.collection.data, { username: opts.sender.username }, { username: opts.sender.username, is: user.is, created_at: String(new Date()) })
      global.commons.sendMessage(global.translate('queue.join.opened'), opts.sender)
    } else {
      global.commons.sendMessage(global.translate('queue.join.closed'), opts.sender)
    }
  }

  clear (opts) {
    global.db.engine.remove(this.collection.data, {})
    this.settings._.picked = []
    global.commons.sendMessage(global.translate('queue.clear'), opts.sender)
  }

  async random (opts) {
    this.pickUsers(opts, null, true)
  }

  async randomFollower (opts) {
    this.pickUsers(opts, 'follower', true)
  }

  async randomSubscriber (opts) {
    this.pickUsers(opts, 'subscriber', true)
  }

  async pick (opts) {
    this.pickUsers(opts, null, false)
  }

  async pickFollower (opts) {
    this.pickUsers(opts, 'follower', false)
  }

  async pickSubscriber (opts) {
    this.pickUsers(opts, 'subscriber', false)
  }

  async pickUsers (opts, filter, random) {
    var input = opts.parameters.match(/^(\d+)?/)[0]
    var amount = (input === '' ? 1 : parseInt(input, 10))

    let users = await this.getUsers({amount, filter, random})
    this.settings._.picked = users

    const atUsername = await global.configuration.getValue('atUsername')
    users = users.map(o => atUsername ? `@${o}` : o)

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

    global.commons.sendMessage(msg.replace(/\$users/g, users.join(', ')), opts.sender)
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

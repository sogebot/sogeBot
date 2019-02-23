/* global describe it beforeEach */
require('../../general.js')

const db = require('../../general.js').db
const msg = require('../../general.js').message
const Message = require('../../../dest/message')
const assert = require('assert')

const owner = { username: 'soge__' }

describe('Message - random filter', () => {
  describe('(random.online.viewer) should exclude ignored user', () => {
    before(async () => {
      await db.cleanup()
      await msg.prepare()
    })

    it('add user ignoreduser to ignore list', async () => {
      global.users.ignoreAdd({ sender: owner, parameters: 'ignoreduser' })
      await msg.isSent('ignore.user.is.added', owner, { username: 'ignoreduser' })
    })

    const users = ['ignoreduser', 'user1']
    for (let username of users) {
      it('add user ' + username + ' to online list', async () => {
        await global.db.engine.insert('users.online', { username })
      })
    }

    it('From 100 randoms ignoreduser shouldn\'t be picked', async () => {
      for (var i = 0; i < 100; i++) {
        let message = await new Message('(random.online.viewer)').parse({})
        assert.equal(message, 'user1')
      }
    })
  })

  describe('(random.online.follower) should exclude ignored user', () => {
    before(async () => {
      await db.cleanup()
      await msg.prepare()
    })
    it('add user ignoreduser to ignore list', async () => {
      global.users.ignoreAdd({ sender: owner, parameters: 'ignoreduser' })
      await msg.isSent('ignore.user.is.added', owner, { username: 'ignoreduser' })
    })

    const users = ['ignoreduser', 'user1']
    for (let username of users) {
      it('add user ' + username + ' to online list', async () => {
        await global.db.engine.insert('users.online', { username })
      })
      it('add user ' + username + ' to users list', async () => {
        await global.db.engine.insert('users', { id: Math.random(), username, is: { follower: true } })
      })
    }

    it('From 100 randoms ignoreduser shouldn\'t be picked', async () => {
      for (var i = 0; i < 100; i++) {
        let message = await new Message('(random.online.follower)').parse({})
        assert.equal(message, 'user1')
      }
    })
  })

  describe('(random.online.subscriber) should exclude ignored user', () => {
    before(async () => {
      await db.cleanup()
      await msg.prepare()
    })
    it('add user ignoreduser to ignore list', async () => {
      global.users.ignoreAdd({ sender: owner, parameters: 'ignoreduser' })
      await msg.isSent('ignore.user.is.added', owner, { username: 'ignoreduser' })
    })

    const users = ['ignoreduser', 'user1']
    for (let username of users) {
      it('add user ' + username + ' to online list', async () => {
        await global.db.engine.insert('users.online', { username })
      })
      it('add user ' + username + ' to users list', async () => {
        await global.db.engine.insert('users', { id: Math.random(), username, is: { subscriber: true } })
      })
    }

    it('From 100 randoms ignoreduser shouldn\'t be picked', async () => {
      for (var i = 0; i < 100; i++) {
        let message = await new Message('(random.online.subscriber)').parse({})
        assert.equal(message, 'user1')
      }
    })
  })

  describe('(random.viewer) should exclude ignored user', () => {
    before(async () => {
      await db.cleanup()
      await msg.prepare()
    })

    it('add user ignoreduser to ignore list', async () => {
      global.users.ignoreAdd({ sender: owner, parameters: 'ignoreduser' })
      await msg.isSent('ignore.user.is.added', owner, { username: 'ignoreduser' })
    })

    const users = ['ignoreduser', 'user1']
    for (let username of users) {
      it('add user ' + username + ' to users list', async () => {
        await global.db.engine.insert('users', { id: Math.random(), username })
      })
    }

    it('From 100 randoms ignoreduser shouldn\'t be picked', async () => {
      for (var i = 0; i < 100; i++) {
        let message = await new Message('(random.viewer)').parse({})
        assert.equal(message, 'user1')
      }
    })
  })

  describe('(random.follower) should exclude ignored user', () => {
    before(async () => {
      await db.cleanup()
      await msg.prepare()
    })
    it('add user ignoreduser to ignore list', async () => {
      global.users.ignoreAdd({ sender: owner, parameters: 'ignoreduser' })
      await msg.isSent('ignore.user.is.added', owner, { username: 'ignoreduser' })
    })

    const users = ['ignoreduser', 'user1']
    for (let username of users) {
      it('add user ' + username + ' to users list', async () => {
        await global.db.engine.insert('users', { id: Math.random(), username, is: { follower: true } })
      })
    }

    it('From 100 randoms ignoreduser shouldn\'t be picked', async () => {
      for (var i = 0; i < 100; i++) {
        let message = await new Message('(random.follower)').parse({})
        assert.equal(message, 'user1')
      }
    })
  })

  describe('(random.subscriber) should exclude ignored user', () => {
    before(async () => {
      await db.cleanup()
      await msg.prepare()
    })
    it('add user ignoreduser to ignore list', async () => {
      global.users.ignoreAdd({ sender: owner, parameters: 'ignoreduser' })
      await msg.isSent('ignore.user.is.added', owner, { username: 'ignoreduser' })
    })

    const users = ['ignoreduser', 'user1']
    for (let username of users) {
      it('add user ' + username + ' to users list', async () => {
        await global.db.engine.insert('users', { id: Math.random(), username, is: { subscriber: true } })
      })
    }

    it('From 100 randoms ignoreduser shouldn\'t be picked', async () => {
      for (var i = 0; i < 100; i++) {
        let message = await new Message('(random.subscriber)').parse({})
        assert.equal(message, 'user1')
      }
    })
  })
})

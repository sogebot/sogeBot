/* global describe it before */
const {
  isMainThread
} = require('worker_threads');
if (!isMainThread) process.exit()


require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const _ = require('lodash')
const assert = require('assert')

const user1 = { username: 'user1', points: 100, userId: String(_.random(999999, false)) }
const user2 = { username: 'user2', points: 100, userId: String(_.random(999999, false)) }

describe('Points - get()', () => {
  describe('user1 will give 50 points to user2', () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()
    })

    it('create user1', async () => {
      await global.db.engine.insert('users', { username: user1.username, id: user1.userId })
      await global.db.engine.insert('users.points', { id: user1.userId, points: user1.points })
    })

    it('create user2', async () => {
      await global.db.engine.insert('users', { username: user2.username, id: user2.userId })
      await global.db.engine.insert('users.points', { id: user2.userId, points: user2.points })
    })

    it('user1 should have 100 points', async () => {
      assert.strict.equal(await global.systems.points.getPointsOf(user1.userId), 100)
    })

    it('user2 should have 100 points', async () => {
      assert.strict.equal(await global.systems.points.getPointsOf(user2.userId), 100)
    })

    it('user1 send 50 points', async () => {
      await global.systems.points.give({ sender: user1, parameters: 'user2 50' })
      await message.isSent('points.success.give', { username: user1.username }, {
        amount: 50,
        username: user2.username,
        pointsName: await global.systems.points.getPointsName(50)
      })
    })

    it('we are not expecting NaN in users.points', async () => {
      let points = await global.db.engine.find('users.points')
      for (let i = 0, length = points.length; i < length; i++) {
        assert.strict.equal(isNaN(points[i].points), false)
      }
    })

    it('user1 should have 50 points', async () => {
      assert.strict.equal(await global.systems.points.getPointsOf(user1.userId), 50)
    })

    it('user2 should have 150 points', async () => {
      assert.strict.equal(await global.systems.points.getPointsOf(user2.userId), 150)
    })
  })

  describe('user1 will give 150 points to user2', () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()
    })

    it('create user1', async () => {
      await global.db.engine.insert('users', { username: user1.username, id: user1.userId })
      await global.db.engine.insert('users.points', { id: user1.userId, points: user1.points })
    })

    it('create user2', async () => {
      await global.db.engine.insert('users', { username: user2.username, id: user2.userId })
      await global.db.engine.insert('users.points', { id: user2.userId, points: user2.points })
    })

    it('user1 should have 100 points', async () => {
      assert.strict.equal(await global.systems.points.getPointsOf(user1.userId), 100)
    })

    it('user2 should have 100 points', async () => {
      assert.strict.equal(await global.systems.points.getPointsOf(user2.userId), 100)
    })

    it('user1 send 150 points', async () => {
      await global.systems.points.give({ sender: user1, parameters: 'user2 150' })
      await message.isSent('points.failed.giveNotEnough', { username: user1.username }, {
        amount: 150,
        username: user2.username,
        pointsName: await global.systems.points.getPointsName(150)
      })
    })

    it('we are not expecting NaN in users.points', async () => {
      let points = await global.db.engine.find('users.points')
      for (let i = 0, length = points.length; i < length; i++) {
        assert.strict.equal(isNaN(points[i].points), false)
      }
    })

    it('user1 should have 100 points', async () => {
      assert.strict.equal(await global.systems.points.getPointsOf(user1.userId), 100)
    })

    it('user2 should have 100 points', async () => {
      assert.strict.equal(await global.systems.points.getPointsOf(user2.userId), 100)
    })
  })

  describe('user1 will give all points to user2', () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()
    })

    it('create user1', async () => {
      await global.db.engine.insert('users', { username: user1.username, id: user1.userId })
      await global.db.engine.insert('users.points', { id: user1.userId, points: user1.points })
    })

    it('create user2', async () => {
      await global.db.engine.insert('users', { username: user2.username, id: user2.userId })
      await global.db.engine.insert('users.points', { id: user2.userId, points: user2.points })
    })

    it('user1 should have 100 points', async () => {
      assert.strict.equal(await global.systems.points.getPointsOf(user1.userId), 100)
    })

    it('user2 should have 100 points', async () => {
      assert.strict.equal(await global.systems.points.getPointsOf(user2.userId), 100)
    })

    it('user1 send all points', async () => {
      await global.systems.points.give({ sender: user1, parameters: 'user2 all' })
      await message.isSent('points.success.give', { username: user1.username }, {
        amount: 100,
        username: user2.username,
        pointsName: await global.systems.points.getPointsName(100)
      })
    })

    it('we are not expecting NaN in users.points', async () => {
      let points = await global.db.engine.find('users.points')
      for (let i = 0, length = points.length; i < length; i++) {
        assert.strict.equal(isNaN(points[i].points), false)
      }
    })

    it('user1 should have 0 points', async () => {
      assert.strict.equal(await global.systems.points.getPointsOf(user1.userId), 0)
    })

    it('user2 should have 200 points', async () => {
      assert.strict.equal(await global.systems.points.getPointsOf(user2.userId), 200)
    })
  })

  describe('user1 will give points without points value', () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()
    })

    it('create user1', async () => {
      await global.db.engine.insert('users', { username: user1.username, id: user1.userId })
      await global.db.engine.insert('users.points', { id: user1.userId, points: user1.points })
    })

    it('create user2', async () => {
      await global.db.engine.insert('users', { username: user2.username, id: user2.userId })
      await global.db.engine.insert('users.points', { id: user2.userId, points: user2.points })
    })

    it('user1 should have 100 points', async () => {
      assert.strict.equal(await global.systems.points.getPointsOf(user1.userId), 100)
    })

    it('user2 should have 100 points', async () => {
      assert.strict.equal(await global.systems.points.getPointsOf(user2.userId), 100)
    })

    it('user1 send wrong command', async () => {
      await global.systems.points.give({ sender: user1, parameters: 'user2', command: '!points give' })
      await message.isSent('points.failed.give', { username: user1.username }, {
        command: '!points give'
      })
    })

    it('we are not expecting NaN in users.points', async () => {
      let points = await global.db.engine.find('users.points')
      for (let i = 0, length = points.length; i < length; i++) {
        assert.strict.equal(isNaN(points[i].points), false)
      }
    })

    it('user1 should have 100 points', async () => {
      assert.strict.equal(await global.systems.points.getPointsOf(user1.userId), 100)
    })

    it('user2 should have 100 points', async () => {
      assert.strict.equal(await global.systems.points.getPointsOf(user2.userId), 100)
    })
  })

  describe('user1 will give string points to user2', () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()
    })

    it('create user1', async () => {
      await global.db.engine.insert('users', { username: user1.username, id: user1.userId })
      await global.db.engine.insert('users.points', { id: user1.userId, points: user1.points })
    })

    it('create user2', async () => {
      await global.db.engine.insert('users', { username: user2.username, id: user2.userId })
      await global.db.engine.insert('users.points', { id: user2.userId, points: user2.points })
    })

    it('user1 should have 100 points', async () => {
      assert.strict.equal(await global.systems.points.getPointsOf(user1.userId), 100)
    })

    it('user2 should have 100 points', async () => {
      assert.strict.equal(await global.systems.points.getPointsOf(user2.userId), 100)
    })

    it('user1 send wrong string points', async () => {
      await global.systems.points.give({ sender: user1, parameters: 'user2 something', command: '!points give' })
      await message.isSent('points.failed.give', { username: user1.username }, {
        command: '!points give'
      })
    })

    it('we are not expecting NaN in users.points', async () => {
      let points = await global.db.engine.find('users.points')
      for (let i = 0, length = points.length; i < length; i++) {
        assert.strict.equal(isNaN(points[i].points), false)
      }
    })

    it('user1 should have 100 points', async () => {
      assert.strict.equal(await global.systems.points.getPointsOf(user1.userId), 100)
    })

    it('user2 should have 100 points', async () => {
      assert.strict.equal(await global.systems.points.getPointsOf(user2.userId), 100)
    })
  })
})

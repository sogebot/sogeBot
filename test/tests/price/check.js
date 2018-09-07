/* global describe it beforeEach */
if (require('cluster').isWorker) process.exit()

const assert = require('chai').assert
require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }
const user = { username: 'testuser' }

const tests = [
  {
    user: owner.username,
    userId: '1',
    points: 10,
    command: '!me',
    price: 15,
    priceOn: '!me',
    expected: true
  },
  {
    user: user.username,
    userId: '2',
    points: 15,
    command: '!me',
    price: 15,
    priceOn: '!me',
    expected: true
  },
  {
    user: user.username,
    userId: '2',
    points: 10,
    command: '!me',
    price: 15,
    priceOn: '!me',
    expected: false
  },
  {
    user: user.username,
    userId: '2',
    points: 20,
    command: '!me',
    price: 15,
    priceOn: '!me',
    expected: true
  }
]

describe('Price - check()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()
  })

  for (let test of tests) {
    it(`${test.user} with ${test.points} points calls ${test.command}, price on ${test.priceOn} set to ${test.price} and should ${test.expected ? 'pass' : 'fail'}`, async () => {
      await global.db.engine.insert('users', { username: test.user, id: test.userId })
      await global.db.engine.insert('users.points', { id: test.userId, points: test.points })
      await global.db.engine.update(global.systems.price.collection.data, { command: test.priceOn }, { command: test.command, price: test.price, enabled: true })
      let haveEnoughPoints = await global.systems.price.check({ sender: { username: test.user, userId: test.userId }, message: test.command })
      assert.isTrue(haveEnoughPoints === test.expected)
    })
  }
})

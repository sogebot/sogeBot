/* global describe it before */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

const assert = require('chai').assert

const max = Math.floor(Number.MAX_SAFE_INTEGER / 1000000)

const owner = { username: 'soge__' }
const testuser = { username: 'testuser' }
const testuser2 = { username: 'testuser2' }

describe('Raffles - pick()', () => {
  before(async () => {
    await db.cleanup()
    await message.prepare()
  })

  describe('Raffle should return winner', () => {
    it('create ticket raffle', async () => {
      global.systems.raffles.open({ sender: owner, parameters: '!winme -min 0 -max ' + max })
      await message.isSent('raffles.announce-ticket-raffle', owner, {
        keyword: '!winme',
        eligibility: await global.commons.prepare('raffles.eligibility-everyone-item'),
        min: 0,
        max: max
      })
    })

    it('Create testuser/testuser2 with max points', async () => {
      await global.db.engine.insert('users.points', { username: testuser.username, points: max })
      await global.db.engine.insert('users.points', { username: testuser2.username, points: max })
    })

    it('testuser bets max', async () => {
      let a = await global.systems.raffles.participate({sender: testuser, message: `!winme ${max}`})
      assert.isTrue(a)
    })

    it('testuser2 bets half of max', async () => {
      let a = await global.systems.raffles.participate({sender: testuser2, message: `!winme ${max / 2}`})
      assert.isTrue(a)
    })

    it('pick a winner', async () => {
      await global.systems.raffles.pick({ sender: owner })

      await message.isSent('raffles.raffle-winner-is', owner, [{
        username: testuser.username,
        keyword: '!winme',
        probability: 66.67
      }, {
        username: testuser2.username,
        keyword: '!winme',
        probability: 33.33
      }])
    })
  })

  describe('Raffle with follower should return winner', () => {
    it('create ticket raffle', async () => {
      global.systems.raffles.open({ sender: owner, parameters: '!winme -min 0 -max ' + max })
      await message.isSent('raffles.announce-ticket-raffle', owner, {
        keyword: '!winme',
        eligibility: await global.commons.prepare('raffles.eligibility-everyone-item'),
        min: 0,
        max: max
      })
    })

    it('Create testuser/testuser2 with max points', async () => {
      await global.db.engine.insert('users.points', { username: testuser.username, points: max })
      await global.db.engine.insert('users.points', { username: testuser2.username, points: max })
    })

    it('Set testuser as follower', async () => {
      await global.db.engine.update('users', { username: testuser.username }, { is: { follower: true } })
    })

    it('testuser bets 100', async () => {
      let a = await global.systems.raffles.participate({sender: testuser, message: '!winme 100'})
      assert.isTrue(a)
    })

    it('testuser2 bets 100', async () => {
      let a = await global.systems.raffles.participate({sender: testuser2, message: '!winme 100'})
      assert.isTrue(a)
    })

    it('pick a winner', async () => {
      await global.systems.raffles.pick({ sender: owner })

      await message.isSent('raffles.raffle-winner-is', owner, [{
        username: testuser.username,
        keyword: '!winme',
        probability: 54.55
      }, {
        username: testuser2.username,
        keyword: '!winme',
        probability: 45.45
      }])
    })
  })

  describe('Raffle with subscriber should return winner', () => {
    it('create ticket raffle', async () => {
      global.systems.raffles.open({ sender: owner, parameters: '!winme -min 0 -max ' + max })
      await message.isSent('raffles.announce-ticket-raffle', owner, {
        keyword: '!winme',
        eligibility: await global.commons.prepare('raffles.eligibility-everyone-item'),
        min: 0,
        max: max
      })
    })

    it('Create testuser/testuser2 with max points', async () => {
      await global.db.engine.insert('users.points', { username: testuser.username, points: max })
      await global.db.engine.insert('users.points', { username: testuser2.username, points: max })
    })

    it('Set testuser as subscriber', async () => {
      await global.db.engine.update('users', { username: testuser.username }, { is: { subscriber: true } })
    })

    it('testuser bets 100', async () => {
      let a = await global.systems.raffles.participate({sender: testuser, message: '!winme 100'})
      assert.isTrue(a)
    })

    it('testuser2 bets 100', async () => {
      let a = await global.systems.raffles.participate({sender: testuser2, message: '!winme 100'})
      assert.isTrue(a)
    })

    it('pick a winner', async () => {
      await global.systems.raffles.pick({ sender: owner })

      await message.isSent('raffles.raffle-winner-is', owner, [{
        username: testuser.username,
        keyword: '!winme',
        probability: 60
      }, {
        username: testuser2.username,
        keyword: '!winme',
        probability: 40
      }])
    })
  })

  describe('Raffle with subscriber and follower should return winner', () => {
    it('create ticket raffle', async () => {
      global.systems.raffles.open({ sender: owner, parameters: '!winme -min 0 -max ' + max })
      await message.isSent('raffles.announce-ticket-raffle', owner, {
        keyword: '!winme',
        eligibility: await global.commons.prepare('raffles.eligibility-everyone-item'),
        min: 0,
        max: max
      })
    })

    it('Create testuser/testuser2 with max points', async () => {
      await global.db.engine.insert('users.points', { username: testuser.username, points: max })
      await global.db.engine.insert('users.points', { username: testuser2.username, points: max })
    })

    it('Set testuser as subscriber', async () => {
      await global.db.engine.update('users', { username: testuser.username }, { is: { subscriber: true } })
    })

    it('Set testuser2 as follower', async () => {
      await global.db.engine.update('users', { username: testuser2.username }, { is: { follower: true } })
    })

    it('testuser bets 100', async () => {
      let a = await global.systems.raffles.participate({sender: testuser, message: '!winme 100'})
      assert.isTrue(a)
    })

    it('testuser2 bets 100', async () => {
      let a = await global.systems.raffles.participate({sender: testuser2, message: '!winme 100'})
      assert.isTrue(a)
    })

    it('pick a winner', async () => {
      await global.systems.raffles.pick({ sender: owner })

      await message.isSent('raffles.raffle-winner-is', owner, [{
        username: testuser.username,
        keyword: '!winme',
        probability: 55.56
      }, {
        username: testuser2.username,
        keyword: '!winme',
        probability: 44.44
      }])
    })
  })
})

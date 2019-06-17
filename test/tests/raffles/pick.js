/* global describe it before */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const _ = require('lodash')
const commons = require('../../../dest/commons');

const assert = require('chai').assert

const max = Math.floor(Number.MAX_SAFE_INTEGER)

const owner = { username: 'soge__', userId: String(_.random(999999, false)) }
const testuser = { username: 'testuser', userId: String(_.random(999999, false)) }
const testuser2 = { username: 'testuser2', userId: String(_.random(999999, false)) }

describe('Raffles - pick()', () => {
  before(async () => {
    await db.cleanup()
    await message.prepare()
  })

  describe('#1318 - 4 subs should have 25% win', () => {
    it('Set subscribers luck to 150%', async () => {
      global.systems.raffles.subscribersPercent = 150
    })

    it('Create subscribers raffle', async () => {
      global.systems.raffles.open({ sender: owner, parameters: '!winme -for subscribers' })
      await message.isSent('raffles.announce-raffle', owner, {
        keyword: '!winme',
        eligibility: await commons.prepare('raffles.eligibility-subscribers-item')
      })
    })

    const subs = ['sub1', 'sub2', 'sub3', 'sub4']
    for (let [id, v] of Object.entries(subs)) {
      it('Add user ' + v + ' to db', async () => {
        await global.db.engine.insert('users', { id, is: { subscriber: true }, username: v })
      })

      it('Add user ' + v + ' to raffle', async () => {
        let a = await global.systems.raffles.participate({ sender: { username: v }, message: '!winme' })
        assert.isTrue(a)
      })
    }

    it('pick a winner', async () => {
      await global.systems.raffles.pick({ sender: owner })

      await message.isSent('raffles.raffle-winner-is', owner, [{
        username: 'sub1',
        keyword: '!winme',
        probability: 25
      }, {
        username: 'sub2',
        keyword: '!winme',
        probability: 25
      }, {
        username: 'sub3',
        keyword: '!winme',
        probability: 25
      }, {
        username: 'sub4',
        keyword: '!winme',
        probability: 25
      }])
    })
  })

  describe('Raffle should return winner', () => {
    it('create ticket raffle', async () => {
      global.systems.raffles.open({ sender: owner, parameters: '!winme -min 0 -max ' + max })
      await message.isSent('raffles.announce-ticket-raffle', owner, {
        keyword: '!winme',
        eligibility: await commons.prepare('raffles.eligibility-everyone-item'),
        min: 0,
        max: max
      })
    })

    it('Create testuser/testuser2 with max points', async () => {
      await global.db.engine.update('users.points', { id: testuser.userId }, { points: max })
      await global.db.engine.update('users.points', { id: testuser2.userId }, { points: max })
    })

    it('testuser bets max', async () => {
      let a = await global.systems.raffles.participate({ sender: testuser, message: `!winme ${max}` })
      assert.isTrue(a)
    })

    it('testuser2 bets half of max', async () => {
      let a = await global.systems.raffles.participate({ sender: testuser2, message: `!winme ${max / 2}` })
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
        eligibility: await commons.prepare('raffles.eligibility-everyone-item'),
        min: 0,
        max: max
      })
    })

    it('Create testuser/testuser2 with max points', async () => {
      await global.db.engine.update('users.points', { id: testuser.userId }, { points: max })
      await global.db.engine.update('users.points', { id: testuser2.userId }, { points: max })
    })

    it('Set testuser as follower', async () => {
      await global.db.engine.update('users', { id: testuser.userId }, { username: testuser.username, is: { follower: true } })
    })

    it('testuser bets 100', async () => {
      let a = await global.systems.raffles.participate({ sender: testuser, message: '!winme 100' })
      assert.isTrue(a)
    })

    it('testuser2 bets 100', async () => {
      let a = await global.systems.raffles.participate({ sender: testuser2, message: '!winme 100' })
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
        eligibility: await commons.prepare('raffles.eligibility-everyone-item'),
        min: 0,
        max: max
      })
    })

    it('Create testuser/testuser2 with max points', async () => {
      await global.db.engine.update('users.points', { id: testuser.userId }, { points: max })
      await global.db.engine.update('users.points', { id: testuser2.userId }, { points: max })
    })

    it('Set testuser as subscriber', async () => {
      await global.db.engine.update('users', { id: testuser.userId }, { username: testuser.username, is: { subscriber: true } })
    })

    it('testuser bets 100', async () => {
      let a = await global.systems.raffles.participate({ sender: testuser, message: '!winme 100' })
      assert.isTrue(a)
    })

    it('testuser2 bets 100', async () => {
      let a = await global.systems.raffles.participate({ sender: testuser2, message: '!winme 100' })
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
        eligibility: await commons.prepare('raffles.eligibility-everyone-item'),
        min: 0,
        max: max
      })
    })

    it('Create testuser/testuser2 with max points', async () => {
      await global.db.engine.update('users.points', { username: testuser.username }, { points: max })
      await global.db.engine.update('users.points', { username: testuser2.username }, { points: max })
    })

    it('Set testuser as subscriber', async () => {
      await global.db.engine.update('users', { username: testuser.username }, { is: { subscriber: true } })
    })

    it('Set testuser2 as follower', async () => {
      await global.db.engine.update('users', { username: testuser2.username }, { is: { follower: true } })
    })

    it('testuser bets 100', async () => {
      let a = await global.systems.raffles.participate({ sender: testuser, message: '!winme 100' })
      assert.isTrue(a)
    })

    it('testuser2 bets 100', async () => {
      let a = await global.systems.raffles.participate({ sender: testuser2, message: '!winme 100' })
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

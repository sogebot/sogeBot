/* global describe it before */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const tmi = require('../../general.js').tmi

const assert = require('chai').assert

const max = Math.floor(Number.MAX_SAFE_INTEGER / 1000000)

const owner = { username: 'soge__' }
const testuser = { username: 'testuser' }
const testuser2 = { username: 'testuser2' }

describe('Raffles - pick()', () => {
  before(async () => {
    await tmi.waitForConnection()
    global.commons.sendMessage.reset()
    await db.cleanup()
  })

  describe('Raffle should return winner', () => {
    it('create ticket raffle', async () => {
      global.parser.parse(owner, '!raffle open !winme -min 0 -max ' + max)
      await message.isSent('raffles.announce-ticket-raffle', owner.username, {
        keyword: '!winme',
        eligibility: global.commons.prepare('raffles.eligibility-everyone-item'),
        min: 0,
        max: max
      })
    })

    it('Create testuser/testuser2 with max points', async () => {
      await global.db.engine.insert('users', { username: testuser.username, points: max })
      await global.db.engine.insert('users', { username: testuser2.username, points: max })
    })

    it('testuser bets max', async () => {
      let a = await global.systems.raffles.participate(global.systems.raffles, testuser, max)
      assert.isTrue(a)
    })

    it('testuser2 bets max', async () => {
      await global.systems.raffles.participate(global.systems.raffles, testuser2, max / 2)
    })

    it('pick a winner', async () => {
      await global.systems.raffles.pick(global.systems.raffles, owner)

      await message.isSent('raffles.raffle-winner-is', owner.username, [{
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
})

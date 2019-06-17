/* global describe it before */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const variable = require('../../general.js').variable
const { getLocalizedName } = require('../../../dest/commons');
const time = require('../../general.js').time

const _ = require('lodash')
const assert = require('assert')

const owner = { username: 'soge__' }
const user1 = { username: 'user1', userId: String(_.random(999999, false)) }
const user2 = { username: 'user2', userId: String(_.random(999999, false)) }
const command = '!duel'

describe('Gambling - duel', () => {
  describe('!duel bank', () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()
    })

    it('Bank should be empty at start', async () => {
      global.games.duel.bank({ sender: user1 })
      await message.isSent('gambling.duel.bank', user1, {
        pointsName: await global.systems.points.getPointsName(0),
        points: 0,
        command: '!duel',
      })
    })

    it('Add 200 points to duel bank', async () => {
      for (let i = 0; i < 200; i++) {
        await global.db.engine.insert(global.games.duel.collection.users, { tickets: 1, user: 'user' + i, userId: i });
      }
      const items = await global.db.engine.find(global.games.duel.collection.users);
      assert.equal(items.length, 200);
    })

    it('Bank should have 200 tickets', async () => {
      global.games.duel.bank({ sender: user1 })
      await message.isSent('gambling.duel.bank', user1, {
        pointsName: await global.systems.points.getPointsName(200),
        points: 200,
        command: '!duel',
      })
    })
  })

  describe('#914 - user1 is not correctly added to duel, if he is challenger', () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()
    })

    it('set duel timestamp to 0 to force new duel', async () => {
      global.games.duel._timestamp = 0
      await variable.isEqual('global.games.duel._timestamp', 0)
    })

    it('add points for users', async () => {
      await global.db.engine.insert('users.points', { id: user1.userId, points: 100 })
      await global.db.engine.insert('users.points', { id: user2.userId, points: 100 })
    })

    it('user 1 is challenging', async () => {
      await global.games.duel.main({ sender: user1, parameters: 'all', command })
      await message.isSent('gambling.duel.new', user1, {
        minutesName: getLocalizedName(await global.games.duel.duration, 'core.minutes'),
        minutes: await global.games.duel.duration,
        command
      })
      await message.isSent('gambling.duel.joined', user1, {
        pointsName: await global.systems.points.getPointsName(100),
        points: 100
      })
    })

    it('user 2 is added to duel', async () => {
      await global.games.duel.main({ sender: user2, parameters: 'all', command })
      await message.isSent('gambling.duel.joined', user2, {
        pointsName: await global.systems.points.getPointsName(100),
        points: 100,
        command
      })
    })

    it('set duel timestamp to force duel to end', async () => {
      // cannot set as 0 - duel is then ignored
      global.games.duel._timestamp = 1
      await variable.isEqual('global.games.duel._timestamp', 1)
    })

    it('call pickDuelWinner()', () => {
      global.games.duel.pickDuelWinner()
    })

    it('winner should be announced', async () => {
      await message.isSent('gambling.duel.winner', owner, [{
        pointsName: await global.systems.points.getPointsName(200),
        points: 200,
        probability: _.round(50, 2),
        ticketsName: await global.systems.points.getPointsName(100),
        tickets: 100,
        winner: user1.username
      }, {
        pointsName: await global.systems.points.getPointsName(200),
        points: 200,
        probability: _.round(50, 2),
        ticketsName: await global.systems.points.getPointsName(100),
        tickets: 100,
        winner: user2.username
      }])
    })
  })

  describe('Pick winner from huge tickets', () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()
    })

    it('create duel', async () => {
      global.games.duel._timestamp = Number(new Date())

      for (let user of ['testuser', 'testuser2', 'testuser3', 'testuser4', 'testuser5']) {
        let tickets = Math.floor(Number.MAX_SAFE_INTEGER / 10)
        await global.db.engine.update(`${global.games.duel.collection.users}`, { key: '_users' }, { user: user, tickets: tickets })
      }
    })

    it('pick winner - bot should not crash', async () => {
      await global.games.duel.pickDuelWinner(global.systems.gambling)
    })
  })
})

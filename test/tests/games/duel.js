/* global describe it before */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

const _ = require('lodash')

const owner = { username: 'soge__' }
const user1 = { username: 'user1', userId: '1' }
const user2 = { username: 'user2', userId: '2' }
const command = '!duel'

describe('Gambling - duel', () => {
  before(async () => {
    await db.cleanup()
    await message.prepare()
  })

  describe('#914 - user1 is not correctly added to duel, if he is challenger', () => {
    it('add points for users', async () => {
      await global.db.engine.insert('users.points', { id: user1.userId, points: 100 })
      await global.db.engine.insert('users.points', { id: user2.userId, points: 100 })
    })

    it('user 1 is challenging', async () => {
      await global.games.duel.main({ sender: user1, parameters: 'all', command })
      await message.isSent('gambling.duel.new', user1, {
        minutesName: global.commons.getLocalizedName(await global.games.duel.settings.duration, 'core.minutes'),
        minutes: await global.games.duel.settings.duration,
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

    it('set duel timestamp to force duel to end', () => {
      // cannot set as 0 - duel is then ignored
      global.games.duel.settings._.timestamp = 1
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
    it('create duel', async () => {
      global.games.duel.settings.timestamp = new Date()

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

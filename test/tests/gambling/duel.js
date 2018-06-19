/* global describe it before */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

const _ = require('lodash')

const owner = { username: 'soge__' }
const user1 = { username: 'user1' }
const user2 = { username: 'user2' }

describe('Gambling - duel', () => {
  before(async () => {
    await db.cleanup()
    await message.prepare()
  })

  describe('#914 - user1 is not correctly added to duel, if he is challenger', () => {
    it('add points for users', async () => {
      await global.db.engine.insert('users.points', { username: user1.username, points: 100 })
      await global.db.engine.insert('users.points', { username: user2.username, points: 100 })
    })

    it('user 1 is challenging', async () => {
      global.systems.gambling.duel({ sender: user1, parameters: 'all' })
      await message.isSent('gambling.duel.new', user1, {
        minutesName: global.commons.getLocalizedName(5, 'core.minutes'),
        minutes: await global.configuration.getValue('duelDuration')
      })
      await message.isSent('gambling.duel.joined', user1, {
        pointsName: await global.systems.points.getPointsName(100),
        points: 100
      })
    })

    it('user 2 is added to duel', async () => {
      await global.systems.gambling.duel({ sender: user2, parameters: 'all' })
      await message.isSent('gambling.duel.joined', user2, {
        pointsName: await global.systems.points.getPointsName(100),
        points: 100
      })
    })

    it('set duel timestamp to force duel to end', async () => {
      // cannot set as 0 - duel is then ignored
      await global.db.engine.update(`gambling.duel`, { key: '_timestamp' }, { value: 1 })
    })

    it('call pickDuelWinner()', () => {
      global.systems.gambling.pickDuelWinner()
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
      global.systems.gambling.duelTimestamp = new Date().getTime()

      for (let user of ['testuser', 'testuser2', 'testuser3', 'testuser4', 'testuser5']) {
        let tickets = Math.floor(Number.MAX_SAFE_INTEGER / 10)
        await global.db.engine.update(`${this.collection}.duel`, { key: '_users' }, { user: user, tickets: tickets })
      }
    })

    it('pick winner - bot should not crash', async () => {
      await global.systems.gambling.pickDuelWinner(global.systems.gambling)
    })
  })
})

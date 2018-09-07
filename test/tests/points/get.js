/* global describe it before */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

const hugePointsUser = { username: 'hugeuser', points: 99999999999999999999999999999999, userId: '1' }
const tinyPointsUser = { username: 'tinyuser', points: 100, userId: '2' }

describe('Points - get()', () => {
  before(async () => {
    await db.cleanup()
    await message.prepare()
  })

  describe('User with more than safe points should return safe points', () => {
    it('create user with huge amount of points', async () => {
      await global.db.engine.insert('users', { username: hugePointsUser.username, id: hugePointsUser.userId })
      await global.db.engine.insert('users.points', { id: hugePointsUser.userId, points: hugePointsUser.points })
    })

    it('points should be returned in safe points bounds', async () => {
      await global.systems.points.get({ sender: hugePointsUser, parameters: '' })
      await message.isSent('points.defaults.pointsResponse', { username: hugePointsUser.username }, {
        amount: Math.floor(Number.MAX_SAFE_INTEGER / 1000000),
        username: hugePointsUser.username,
        pointsName: await global.systems.points.getPointsName(Math.floor(Number.MAX_SAFE_INTEGER / 1000000))
      })
    })
  })

  describe('User with less than safe points should return unchanged points', () => {
    it('create user with normal amount of points', async () => {
      await global.db.engine.insert('users', { username: tinyPointsUser.username, id: tinyPointsUser.userId })
      await global.db.engine.insert('users.points', { id: tinyPointsUser.userId, points: tinyPointsUser.points })
    })

    it('points should be returned in safe points bounds', async () => {
      await global.systems.points.get({ sender: tinyPointsUser, parameters: '' })
      await message.isSent('points.defaults.pointsResponse', { username: tinyPointsUser.username }, {
        amount: 100,
        username: tinyPointsUser.username,
        pointsName: await global.systems.points.getPointsName(100)
      })
    })
  })
})

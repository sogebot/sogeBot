/* global describe it before */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const tmi = require('../../general.js').tmi

const hugePointsUser = { username: 'hugeuser', points: 99999999999999999999999999999999 }
const tinyPointsUser = { username: 'tinyuser', points: 100 }

describe('Points - getPointsFromUser()', () => {
  before(async () => {
    await tmi.waitForConnection()
    global.commons.sendMessage.reset()
    await db.cleanup()
  })

  describe('User with more than safe points should return safe points', () => {
    it('create user with huge amount of points', async () => {
      await global.db.engine.insert('users', hugePointsUser)
    })

    it('points should be returned in safe points bounds', async () => {
      await global.systems.points.getPointsFromUser(global.systems.points, hugePointsUser, hugePointsUser.username)
      await message.isSent('points.defaults.pointsResponse', hugePointsUser, {
        amount: Math.floor(Number.MAX_SAFE_INTEGER / 1000000),
        username: hugePointsUser.username,
        pointsName: global.systems.points.getPointsName(Math.floor(Number.MAX_SAFE_INTEGER / 1000000))
      })
    })
  })

  describe('User with less than safe points should return unchanged points', () => {
    it('create user with normal amount of points', async () => {
      await global.db.engine.insert('users', tinyPointsUser)
    })

    it('points should be returned in safe points bounds', async () => {
      await global.systems.points.getPointsFromUser(global.systems.points, tinyPointsUser, tinyPointsUser.username)
      await message.isSent('points.defaults.pointsResponse', tinyPointsUser, {
        amount: 100,
        username: tinyPointsUser.username,
        pointsName: global.systems.points.getPointsName(100)
      })
    })
  })
})

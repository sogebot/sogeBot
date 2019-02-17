/* global describe it before */
const {
  isMainThread
} = require('worker_threads');
if (!isMainThread) process.exit()


require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const assert = require('assert')
const _ = require('lodash')

const tests = [
  {
    user: { username: 'user1', userId: String(_.random(999999, false)) }
  }
]

describe('game/roulette - !roulette', () => {
  for (let test of tests) {
    describe(`${test.user.username} uses !roulette`, async () => {
      before(async () => {
        await db.cleanup()
        await message.prepare()
      })

      it(`${test.user.username} starts roulette`, async () => {
        global.games.roulette.main({ sender: test.user })
      })

      it('Expecting win or lose', async () => {
        await message.isSent(['gambling.roulette.dead', 'gambling.roulette.alive'], test.user)
      })

      it('we are not expecting NaN in users.points', async () => {
        let points = await global.db.engine.find('users.points')
        for (let i = 0, length = points.length; i < length; i++) {
          assert.strict.equal(isNaN(points[i].points), false)
        }
      })
    })
  }
})

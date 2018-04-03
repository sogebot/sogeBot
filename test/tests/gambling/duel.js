/* global describe it before */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

describe('Gambling - duel', () => {
  before(async () => {
    await db.cleanup()
    await message.prepare()
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

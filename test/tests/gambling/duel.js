/* global describe it before */

const assert = require('chai').assert
require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message


describe('Gambling - duel', () => {
  before(async () => {
    global.commons.sendMessage.reset()
    await db.cleanup()
  })

  describe('Pick winner from huge tickets', () => {
    it('create duel', async () => {
      global.systems.gambling.current.duel = {}
      global.systems.gambling.current.duel._timestamp = new Date().getTime()
      global.systems.gambling.current.duel._total = 0

      for (let user of ['testuser', 'testuser2', 'testuser3', 'testuser4', 'testuser5']) {
        let tickets = 1000000000000000000000000000000000000000
        global.systems.gambling.current.duel._total = global.systems.gambling.current.duel._total + tickets
        global.systems.gambling.current.duel[user] = tickets
      }
    })

    it('pick winner - bot should not crash', async () => {
      await global.systems.gambling.pickDuelWinner(global.systems.gambling)
    })
  })
})

/* global describe it before */

require('../../general.js')

const db = require('../../general.js').db
const tmi = require('../../general.js').tmi

describe('Gambling - duel', () => {
  before(async () => {
    await tmi.waitForConnection()
    global.commons.sendMessage.reset()
    await db.cleanup()
  })

  describe('Pick winner from huge tickets', () => {
    it('create duel', async () => {
      global.systems.gambling.current.duel = {}
      global.systems.gambling.current.duel._timestamp = new Date().getTime()
      global.systems.gambling.current.duel._total = 0

      for (let user of ['testuser', 'testuser2', 'testuser3', 'testuser4', 'testuser5']) {
        let tickets = Math.floor(Number.MAX_SAFE_INTEGER / 1000000)
        global.systems.gambling.current.duel._total = global.systems.gambling.current.duel._total + tickets
        global.systems.gambling.current.duel[user] = tickets
      }
    })

    it('pick winner - bot should not crash', async () => {
      await global.systems.gambling.pickDuelWinner(global.systems.gambling)
    })
  })
})

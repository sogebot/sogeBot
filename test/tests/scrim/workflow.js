/* global describe it before */
const {
  isMainThread
} = require('worker_threads');
if (!isMainThread) process.exit()
const commons = require('../../../dest/commons');


require('../../general.js')

const db = require('../../general.js').db
const variable = require('../../general.js').variable
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Scrim - full workflow', () => {
  describe('cooldown only', () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()

      global.systems.scrim.waitForMatchIdsInSeconds = 10
      await variable.isEqual('global.systems.scrim.waitForMatchIdsInSeconds', 10)
    })

    it('Create cooldown only scrim for 1 minute', async () => {
      global.systems.scrim.main({ sender: owner, parameters: '-c duo 1' })
    })

    it('Expecting 1 minute message cooldown', async () => {
      await message.isSent('systems.scrim.countdown', owner, {
        time: 1,
        type: 'duo',
        unit: commons.getLocalizedName(1, 'core.minutes'),
      })
    })

    it('Expecting 45 seconds message cooldown', async () => {
      await message.isSent('systems.scrim.countdown', owner, {
        time: 45,
        type: 'duo',
        unit: commons.getLocalizedName(45, 'core.seconds'),
      }, 19000)
    })

    it('Expecting 30 seconds message cooldown', async () => {
      await message.isSent('systems.scrim.countdown', owner, {
        time: 30,
        type: 'duo',
        unit: commons.getLocalizedName(30, 'core.seconds'),
      }, 19000)
    })

    it('Expecting 15 seconds message cooldown', async () => {
      await message.isSent('systems.scrim.countdown', owner, {
        time: 15,
        type: 'duo',
        unit: commons.getLocalizedName(15, 'core.seconds'),
      }, 19000)
    })

    it('Expecting 3 seconds message cooldown', async () => {
      await message.isSent('systems.scrim.countdown', owner, {
        time: '3.',
        type: 'duo',
        unit: '',
      }, 19000) // still need high wait time, because its after 15s
    })

    it('Expecting 2 seconds message cooldown', async () => {
      await message.isSent('systems.scrim.countdown', owner, {
        time: '2.',
        type: 'duo',
        unit: '',
      }, 3000)
    })

    it('Expecting 1 seconds message cooldown', async () => {
      await message.isSent('systems.scrim.countdown', owner, {
        time: '1.',
        type: 'duo',
        unit: '',
      }, 3000)
    })

    it('Expecting go! message', async () => {
      await message.isSent('systems.scrim.go', owner, {}, 3000)
    })

    it('NOT expecting put match id in chat message', async () => {
      await message.isNotSent('systems.scrim.putMatchIdInChat', owner, {
        command: '!snipe match',
      }, 19000)
    })

    it('NOT expecting empty message list', async () => {
      await message.isNotSent('systems.scrim.currentMatches', owner, {
        matches: '<' + global.translate('core.empty') + '>',
      }, 19000)
    })

    it('Check match list by command', async () => {
      global.systems.scrim.match({ sender: { username: 'test' }, parameters: '' })
      await message.isSent('systems.scrim.currentMatches', owner, {
        matches: '<' + global.translate('core.empty') + '>',
      }, 19000)
    })
  })

  describe('without matches', () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()

      global.systems.scrim.waitForMatchIdsInSeconds = 10
      await variable.isEqual('global.systems.scrim.waitForMatchIdsInSeconds', 10)
    })

    it('Create scrim for 1 minute', async () => {
      global.systems.scrim.main({ sender: owner, parameters: 'duo 1' })
    })

    it('Expecting 1 minute message cooldown', async () => {
      await message.isSent('systems.scrim.countdown', owner, {
        time: 1,
        type: 'duo',
        unit: commons.getLocalizedName(1, 'core.minutes'),
      })
    })

    it('Expecting 45 seconds message cooldown', async () => {
      await message.isSent('systems.scrim.countdown', owner, {
        time: 45,
        type: 'duo',
        unit: commons.getLocalizedName(45, 'core.seconds'),
      }, 19000)
    })

    it('Expecting 30 seconds message cooldown', async () => {
      await message.isSent('systems.scrim.countdown', owner, {
        time: 30,
        type: 'duo',
        unit: commons.getLocalizedName(30, 'core.seconds'),
      }, 19000)
    })

    it('Expecting 15 seconds message cooldown', async () => {
      await message.isSent('systems.scrim.countdown', owner, {
        time: 15,
        type: 'duo',
        unit: commons.getLocalizedName(15, 'core.seconds'),
      }, 19000)
    })

    it('Expecting 3 seconds message cooldown', async () => {
      await message.isSent('systems.scrim.countdown', owner, {
        time: '3.',
        type: 'duo',
        unit: '',
      }, 19000) // still need high wait time, because its after 15s
    })

    it('Expecting 2 seconds message cooldown', async () => {
      await message.isSent('systems.scrim.countdown', owner, {
        time: '2.',
        type: 'duo',
        unit: '',
      }, 3000)
    })

    it('Expecting 1 seconds message cooldown', async () => {
      await message.isSent('systems.scrim.countdown', owner, {
        time: '1.',
        type: 'duo',
        unit: '',
      }, 3000)
    })

    it('Expecting go! message', async () => {
      await message.isSent('systems.scrim.go', owner, {}, 3000)
    })

    it('Expecting put match id in chat message', async () => {
      await message.isSent('systems.scrim.putMatchIdInChat', owner, {
        command: '!snipe match',
      }, 19000)
    })

    it('Expecting empty message list', async () => {
      await message.isSent('systems.scrim.currentMatches', owner, {
        matches: '<' + global.translate('core.empty') + '>',
      }, 19000)
    })

    it('Check match list by command', async () => {
      global.systems.scrim.match({ sender: { username: 'test' }, parameters: '' })
      await message.isSent('systems.scrim.currentMatches', owner, {
        matches: '<' + global.translate('core.empty') + '>',
      }, 19000)
    })
  })

  describe('with matches', () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()

      global.systems.scrim.waitForMatchIdsInSeconds = 10
      await variable.isEqual('global.systems.scrim.waitForMatchIdsInSeconds', 10)
    })

    it('Create scrim for 1 minute', async () => {
      global.systems.scrim.main({ sender: owner, parameters: 'duo 1' })
    })

    it('Expecting 1 minute message cooldown', async () => {
      await message.isSent('systems.scrim.countdown', owner, {
        time: 1,
        type: 'duo',
        unit: commons.getLocalizedName(1, 'core.minutes'),
      })
    })

    it('Expecting 45 seconds message cooldown', async () => {
      await message.isSent('systems.scrim.countdown', owner, {
        time: 45,
        type: 'duo',
        unit: commons.getLocalizedName(45, 'core.seconds'),
      }, 19000)
    })

    it('Expecting 30 seconds message cooldown', async () => {
      await message.isSent('systems.scrim.countdown', owner, {
        time: 30,
        type: 'duo',
        unit: commons.getLocalizedName(30, 'core.seconds'),
      }, 19000)
    })

    it('Expecting 15 seconds message cooldown', async () => {
      await message.isSent('systems.scrim.countdown', owner, {
        time: 15,
        type: 'duo',
        unit: commons.getLocalizedName(15, 'core.seconds'),
      }, 19000)
    })

    it('Expecting 3 seconds message cooldown', async () => {
      await message.isSent('systems.scrim.countdown', owner, {
        time: '3.',
        type: 'duo',
        unit: '',
      }, 19000) // still need high wait time, because its after 15s
    })

    it('Expecting 2 seconds message cooldown', async () => {
      await message.isSent('systems.scrim.countdown', owner, {
        time: '2.',
        type: 'duo',
        unit: '',
      }, 3000)
    })

    it('Expecting 1 seconds message cooldown', async () => {
      await message.isSent('systems.scrim.countdown', owner, {
        time: '1.',
        type: 'duo',
        unit: '',
      }, 3000)
    })

    it('Expecting go! message', async () => {
      await message.isSent('systems.scrim.go', owner, {}, 3000)
    })

    it('Expecting put match id in chat message', async () => {
      await message.isSent('systems.scrim.putMatchIdInChat', owner, {
        command: '!snipe match',
      }, 19000)
    })

    for (let user of ['user1', 'user2', 'user3']) {
      const matchId = 'ABC'
      it('Add ' + user + ' to match with id ' + matchId, async () => {
        global.systems.scrim.match({
          parameters: matchId,
          sender: { username: user },
        })
      })
    }

    it('Add user4 to match with id ABD', async () => {
      global.systems.scrim.match({
        parameters: 'ABD',
        sender: { username: 'user4' },
      })
    })

    it('Expecting populated message list', async () => {
      await message.isSent('systems.scrim.currentMatches', owner, [
        { matches: 'ABC - @user1, @user2, @user3 | ABD - @user4' },
        { matches: 'ABC - @user1, @user3, @user2 | ABD - @user4' },
        { matches: 'ABC - @user2, @user1, @user3 | ABD - @user4' },
        { matches: 'ABC - @user3, @user1, @user2 | ABD - @user4' },
        { matches: 'ABC - @user3, @user2, @user1 | ABD - @user4' },
        { matches: 'ABC - @user2, @user3, @user1 | ABD - @user4' },
        { matches: 'ABD - @user4 | ABC - @user1, @user2, @user3' },
        { matches: 'ABD - @user4 | ABC - @user1, @user3, @user2' },
        { matches: 'ABD - @user4 | ABC - @user2, @user1, @user3' },
        { matches: 'ABD - @user4 | ABC - @user3, @user1, @user2' },
        { matches: 'ABD - @user4 | ABC - @user3, @user2, @user1' },
        { matches: 'ABD - @user4 | ABC - @user2, @user3, @user1' },
      ], 19000)
    })

    it('Check match list by command', async () => {
      global.systems.scrim.match({ sender: { username: 'test' }, parameters: '' })
      await message.isSent('systems.scrim.currentMatches', owner, [
        { matches: 'ABC - @user1, @user2, @user3 | ABD - @user4' },
        { matches: 'ABC - @user1, @user3, @user2 | ABD - @user4' },
        { matches: 'ABC - @user2, @user1, @user3 | ABD - @user4' },
        { matches: 'ABC - @user3, @user1, @user2 | ABD - @user4' },
        { matches: 'ABC - @user3, @user2, @user1 | ABD - @user4' },
        { matches: 'ABC - @user2, @user3, @user1 | ABD - @user4' },
        { matches: 'ABD - @user4 | ABC - @user1, @user2, @user3' },
        { matches: 'ABD - @user4 | ABC - @user1, @user3, @user2' },
        { matches: 'ABD - @user4 | ABC - @user2, @user1, @user3' },
        { matches: 'ABD - @user4 | ABC - @user3, @user1, @user2' },
        { matches: 'ABD - @user4 | ABC - @user3, @user2, @user1' },
        { matches: 'ABD - @user4 | ABC - @user2, @user3, @user1' },
      ], 19000)
    })
  })
})

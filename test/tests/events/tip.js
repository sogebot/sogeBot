/* global describe it before */

const {
  isMainThread
} = require('worker_threads');
if (!isMainThread) process.exit()

const uuidv4 = require('uuid/v4')

require('../../general.js')

const assert = require('assert')
const db = require('../../general.js').db
const message = require('../../general.js').message
const time = require('../../general.js').time
const _ = require('lodash')

describe('Events - tip event', () => {
  before(async () => {
    await db.cleanup()
    await message.prepare()
  })

  describe('#2219 - Give points on tip not working', function () {
    before(async function () {
      const id = uuidv4()
      await Promise.all([
        global.db.engine.insert('events', {
          id,
          key: 'tip',
          name: 'Tip alert',
          enabled: true,
          triggered: {},
          definitions: {}
        }),
        global.db.engine.insert('events.filters', {
          filters: '',
          eventId: id
        }),
        global.db.engine.insert('events.operations', {
          key: 'run-command',
          eventId: id,
          definitions: {
            isCommandQuiet: true,
            commandToRun: '!points add $username (math.$amount*10)'
          }
        }),
      ]);

      for (const user of ['losslezos', 'rigneir', 'mikasa_hraje', 'foufhs']) {
        await global.db.engine.insert('users', { id: Math.floor(Math.random() * 100000), username: user })
      }
    })

    for (let username of ['losslezos', 'rigneir', 'mikasa_hraje', 'foufhs']) {
      describe(username + ' tip event', () => {
        it('trigger tip event for 10 EUR - ' + username, async () => {
          global.log.tip(`${username}, amount: 10EUR, message: Ahoj jak je`)
          global.events.fire('tip', { username: username, amount: 10.00, message: 'Ahoj jak je', currency: 'EUR' })
        })

        it('wait 1s', async () => {
          await time.waitMs(1000)
        })

        it('we are not expecting any messages to be sent - quiet mode', async () => {
          assert.strict.equal(global.log.chatOut.callCount, 0)
        })

        it('user should have 100 points', async () => {
          const userId = await global.users.getIdByName(username, true);
          assert.strict.equal(await global.systems.points.getPointsOf(userId), 100)
        })
      })
    }
  })
})

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

describe('Events - cheer event', () => {
  before(async () => {
    await db.cleanup()
    await message.prepare()
  })

  describe('#1699 - Cheer event is not waiting for user to save id', function () {
    before(async function () {
      const id = uuidv4()
      await Promise.all([
        global.db.engine.insert('events', {
          id,
          key: 'cheer',
          name: 'Cheer alert',
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
            commandToRun: '!points add $username (math.$bits*10)'
          }
        }),
      ]);
    })

    for (let username of ['losslezos', 'rigneir', 'mikasa_hraje', 'foufhs']) {
      const userId = Math.floor(Math.random() * 10000)
      describe(username + ' cheer event', () => {
        it('trigger cheer event for 1 bit - ' + username, async () => {
          await global.tmi.cheer({
            tags: {
              username,
              userId,
              bits: 1,
            },
            message: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5),
          })
        })

        it('wait 1s', async () => {
          await time.waitMs(1000)
        })

        it('we are not expecting any messages to be sent - quiet mode', async () => {
          assert.strict.equal(global.log.chatOut.callCount, 0)
        })

        it('user should have 10 points', async () => {
          assert.strict.equal(await global.systems.points.getPointsOf(userId), 10)
        })
      })
    }
  })
})

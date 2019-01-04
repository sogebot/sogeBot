/* global describe it before */

if (require('cluster').isWorker) process.exit()


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
      const event = await global.db.engine.insert('events', {
        key: 'cheer',
        name: 'Cheer alert',
        enabled: true,
        triggered: {},
        definitions: {}
      })

      await Promise.all([
        global.db.engine.insert('events.filters', {
          filters: '',
          eventId: String(event._id)
        }),
        global.db.engine.insert('events.operations', {
          key: 'run-command',
          eventId: String(event._id),
          definitions: {
            isCommandQuiet: true,
            commandToRun: '!points add $username (math.$bits*10)'
          }
        })
      ])
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

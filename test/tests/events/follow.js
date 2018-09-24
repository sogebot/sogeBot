/* global describe it before */
if (require('cluster').isWorker) process.exit()

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const time = require('../../general.js').time
const _ = require('lodash')

describe('Events - follow event', () => {
  before(async () => {
    await db.cleanup()
    await message.prepare()
  })

  describe('#1370 - Second follow event didn\'t trigger event ', function () {
    before(async function () {
      const event = await global.db.engine.insert('events', {
        key: 'follow',
        name: 'Follow alert',
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
          key: 'emote-explosion',
          eventId: String(event._id),
          definitions: {
            emotesToExplode: 'purpleHeart <3'
          }
        }),
        global.db.engine.insert('events.operations', {
          key: 'run-command',
          eventId: String(event._id),
          definitions: {
            commandToRun: '!duel',
            isCommandQuiet: true
          }
        }),
        global.db.engine.insert('events.operations', {
          key: 'send-chat-message',
          eventId: String(event._id),
          definitions: {
            messageToSend: 'Diky za follow, $username!'
          }
        })
      ])
    })

    for (let username of ['losslezos', 'rigneir', 'mikasa_hraje', 'foufhs']) {
      it('trigger follow event', async () => {
        await global.events.fire('follow', { username, webhooks: _.random(1) === 1 })
      })

      it('message should be send', async () => {
        await message.isSentRaw(`Diky za follow, @${username}!`, { username })
      })

      it('wait 5s', async () => {
        await time.waitMs(5000)
      })
    }
  })
})

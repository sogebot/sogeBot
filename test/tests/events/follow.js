/* global describe it before */
const {
  isMainThread
} = require('worker_threads');
if (!isMainThread) process.exit()

const uuidv4 = require('uuid/v4')

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
      const id = uuidv4()
      await Promise.all([
        global.db.engine.insert('events', {
          id,
          key: 'follow',
          name: 'Follow alert',
          enabled: true,
          triggered: {},
          definitions: {}
        }),
        global.db.engine.insert('events.filters', {
          filters: '',
          eventId: id
        }),
        global.db.engine.insert('events.operations', {
          key: 'emote-explosion',
          eventId: id,
          definitions: {
            emotesToExplode: 'purpleHeart <3'
          }
        }),
        global.db.engine.insert('events.operations', {
          key: 'run-command',
          eventId: id,
          definitions: {
            commandToRun: '!duel',
            isCommandQuiet: true
          }
        }),
        global.db.engine.insert('events.operations', {
          key: 'send-chat-message',
          eventId: id,
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

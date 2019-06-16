/* global describe it before */
const {
  isMainThread
} = require('worker_threads');
if (!isMainThread) process.exit()
const commons = require('../../../dest/commons');


require('../../general.js')

const until = require('test-until')
const db = require('../../general.js').db
const message = require('../../general.js').message
const variable = require('../../general.js').variable
const time = require('../../general.js').time
const _ = require('lodash')

const assert = require('chai').assert

const owner = { username: 'soge__' }

describe('Polls - tips', () => {
  before(async () => {
    await db.cleanup()
    await time.waitMs(1000)
    await message.prepare()

    global.currency.mainCurrency = 'EUR'
    await variable.isEqual('global.currency.mainCurrency', 'EUR')
  })

  describe('Close not opened voting', () => {
    it('Close voting should fail', async () => {
      assert.isNotTrue(await global.systems.polls.close({ sender: owner }))
    })
  })

  describe('Close opened voting', () => {
    it('Open new voting', async () => {
      assert.isTrue(await global.systems.polls.open({ sender: owner, parameters: '-tips -title "Lorem Ipsum test?" Lorem | Ipsum | Dolor Sit' }))
    })
    it('Close voting', async () => {
      assert.isTrue(await global.systems.polls.close({ sender: owner }))
    })
  })

  describe('Voting full workflow', () => {
    var vid = null
    it('Open new voting', async () => {
      assert.isTrue(await global.systems.polls.open({ sender: owner, parameters: '-tips -title "Lorem Ipsum?" Lorem | Ipsum | Dolor Sit' }))
    })
    it('Open another voting should fail', async () => {
      assert.isFalse(await global.systems.polls.open({ sender: owner, parameters: '-tips -title "Lorem Ipsum2?" Lorem2 | Ipsum2 | Dolor Sit2' }))
    })
    it('Voting should be correctly in db', async () => {
      const cVote = await global.db.engine.findOne(global.systems.polls.collection.data, { isOpened: true });
      assert.isNotEmpty(cVote)
      assert.deepEqual(cVote.options, ['Lorem', 'Ipsum', 'Dolor Sit'])
      assert.deepEqual(cVote.type, 'tips')
      assert.equal(cVote.title, 'Lorem Ipsum?')
      vid = String(cVote._id)
    })
    it(`!vote should return correct vote status`, async () => {
      await time.waitMs(1000)
      await message.prepare()

      await global.systems.polls.main({ sender: owner, parameters: ''  })
      await message.isSent('systems.polls.status', owner, { title: 'Lorem Ipsum?' })
      await message.isSentRaw(`#vote1 - Lorem - 0.00 ${commons.getLocalizedName(0, 'systems.polls.votes')}, 0.00%`, owner)
      await message.isSentRaw(`#vote2 - Ipsum - 0.00 ${commons.getLocalizedName(0, 'systems.polls.votes')}, 0.00%`, owner)
      await message.isSentRaw(`#vote3 - Dolor Sit - 0.00 ${commons.getLocalizedName(0, 'systems.polls.votes')}, 0.00%`, owner)
    })
    for (let o of [0,1,2,3,4]) {
      it(`User ${owner.username} will vote for option ${o} - should fail`, async () => {
        await global.systems.polls.main({ sender: owner, parameters: String(o) })
        const vote = await global.db.engine.findOne(global.systems.polls.collection.votes, { votedBy: owner.username, vid });
        assert.isEmpty(vote, 'Expected ' + JSON.stringify({ votedBy: owner.username, vid }) + ' to not be found in db')
      })
    }
    it(`10 users will vote through tips for option 1 and another 10 for option 2`, async () => {
      for (let o of [1,2]) {
        for (let i = 0; i < 10; i++) {
          const user = 'user' + [o, i].join('')
          await global.integrations.streamlabs.parse({
            type: 'donation',
            message: [{
              isTest: true,
              amount: 10,
              from: user,
              message: 'Cool I am voting for #vote' + o + ' enjoy!',
              currency: 'EUR'
            }]
          })

          await until(async (setError) => {
            try {
              const vote = await global.db.engine.findOne(global.systems.polls.collection.votes, { votedBy: user, vid })
              assert.isNotEmpty(vote, 'Expected ' + JSON.stringify({ votedBy: user, vid }) + ' to be found in db')
              assert.equal(vote.option, o - 1)
              return true
            } catch (err) {
              return setError(
                '\nExpected ' + JSON.stringify({ votedBy: user, vid }) + ' to be found in db')
            }
          }, 5000)
        }
      }
    })
    it(`!vote should return correct vote status`, async () => {
      await time.waitMs(1000)
      await message.prepare()

      await global.systems.polls.main({ sender: owner, parameters: ''  })
      await message.isSent('systems.polls.status', owner, { title: 'Lorem Ipsum?' })
      await message.isSentRaw(`#vote1 - Lorem - 100.00 ${commons.getLocalizedName(100, 'systems.polls.votes')}, 50.00%`, owner)
      await message.isSentRaw(`#vote2 - Ipsum - 100.00 ${commons.getLocalizedName(100, 'systems.polls.votes')}, 50.00%`, owner)
      await message.isSentRaw(`#vote3 - Dolor Sit - 0.00 ${commons.getLocalizedName(0, 'systems.polls.votes')}, 0.00%`, owner)
    })

    it('Close voting', async () => {
      await time.waitMs(1000)
      await message.prepare()

      assert.isTrue(await global.systems.polls.close({ sender: owner }))
      await message.isSent('systems.polls.status_closed', owner, { title: 'Lorem Ipsum?' })
      await message.isSentRaw(`#vote1 - Lorem - 100.00 ${commons.getLocalizedName(100, 'systems.polls.votes')}, 50.00%`, owner)
      await message.isSentRaw(`#vote2 - Ipsum - 100.00 ${commons.getLocalizedName(100, 'systems.polls.votes')}, 50.00%`, owner)
      await message.isSentRaw(`#vote3 - Dolor Sit - 0.00 ${commons.getLocalizedName(0, 'systems.polls.votes')}, 0.00%`, owner)
    })

    it(`!vote should return not in progress info`, async () => {
      await time.waitMs(1000)
      await message.prepare()

      await global.systems.polls.main({ sender: owner, parameters: ''  })
      await message.isSent('systems.polls.notInProgress', owner)
    })

    it(`!vote 1 should return not in progress info`, async () => {
      await time.waitMs(1000)
      await message.prepare()

      const user = Math.random()
      await global.systems.polls.main({ sender: { username: user }, parameters: '1' })
      await message.isSent('systems.polls.notInProgress', { username: user })
    })
  })
})

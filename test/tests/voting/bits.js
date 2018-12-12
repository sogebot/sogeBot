/* global describe it before */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const time = require('../../general.js').time
const _ = require('lodash')

const assert = require('chai').assert

const owner = { username: 'soge__' }

describe('Voting - bits', () => {
  before(async () => {
    await db.cleanup()
    await message.prepare()
  })

  describe('Close not opened voting', () => {
    it('Close voting should fail', async () => {
      assert.isNotTrue(await global.systems.voting.close(owner))
    })
  })

  describe('Close opened voting', () => {
    it('Open new voting', async () => {
      assert.isTrue(await global.systems.voting.open({ sender: owner, parameters: '-bits -title "Lorem Ipsum test?" Lorem | Ipsum | Dolor Sit' }))
    })
    it('Close voting', async () => {
      assert.isTrue(await global.systems.voting.close(owner))
    })
  })

  describe('Voting full workflow', () => {
    var vid = null
    it('Open new voting', async () => {
      assert.isTrue(await global.systems.voting.open({ sender: owner, parameters: '-bits -title "Lorem Ipsum?" Lorem | Ipsum | Dolor Sit' }))
    })
    it('Open another voting should fail', async () => {
      assert.isFalse(await global.systems.voting.open({ sender: owner, parameters: '-bits -title "Lorem Ipsum2?" Lorem2 | Ipsum2 | Dolor Sit2' }))
    })
    it('Voting should be correctly in db', async () => {
      const cVote = await global.db.engine.findOne(global.systems.voting.collection.data, { isOpened: true });
      assert.isNotEmpty(cVote)
      assert.deepEqual(cVote.options, ['Lorem', 'Ipsum', 'Dolor Sit'])
      assert.deepEqual(cVote.type, 'bits')
      assert.equal(cVote.title, 'Lorem Ipsum?')
      vid = String(cVote._id)
    })
    it(`!vote should return correct vote status`, async () => {
      await message.prepare()

      await global.systems.voting.main({ sender: owner, parameters: ''  })
      await message.isSent('systems.voting.status', owner, { title: 'Lorem Ipsum?' })
      await message.isSentRaw(`#vote1 - Lorem - 0 ${global.commons.getLocalizedName(0, 'systems.voting.votes')}, 0.00%`, owner)
      await message.isSentRaw(`#vote2 - Ipsum - 0 ${global.commons.getLocalizedName(0, 'systems.voting.votes')}, 0.00%`, owner)
      await message.isSentRaw(`#vote3 - Dolor Sit - 0 ${global.commons.getLocalizedName(0, 'systems.voting.votes')}, 0.00%`, owner)
    })
    for (let o of [0,1,2,3,4]) {
      it(`User ${owner.username} will vote for option ${o} - should fail`, async () => {
        await global.systems.voting.main({ sender: owner, parameters: String(o) })
        const vote = await global.db.engine.findOne(global.systems.voting.collection.votes, { votedBy: owner.username, vid });
        assert.isEmpty(vote, 'Expected ' + JSON.stringify({ votedBy: owner.username, vid }) + ' to not be found in db')
      })
    }
    it(`10 users will vote through bits for option 1 and another 10 for option 2`, async () => {
      for (let o of [1,2]) {
        for (let i = 0; i < 10; i++) {
          const user = Number(Math.random() * 1000).toFixed(0)
          await global.tmi.cheer({
            tags: {
              username: user,
              userId: Number(Math.random() * 1000).toFixed(0),
              bits: 10,
            },
            message: 'Cool I am voting for #vote' + o + ' enjoy!',
          })
          await time.waitMs(100) // wait until its propagated
          const vote = await global.db.engine.findOne(global.systems.voting.collection.votes, { votedBy: user, vid });
          assert.isNotEmpty(vote, 'Expected ' + JSON.stringify({ votedBy: user, vid }) + ' to be found in db')
          assert.equal(vote.option, o - 1)
        }
      }
    })
    it(`!vote should return correct vote status`, async () => {
      await message.prepare()

      await global.systems.voting.main({ sender: owner, parameters: ''  })
      await message.isSent('systems.voting.status', owner, { title: 'Lorem Ipsum?' })
      await message.isSentRaw(`#vote1 - Lorem - 100 ${global.commons.getLocalizedName(100, 'systems.voting.votes')}, 50.00%`, owner)
      await message.isSentRaw(`#vote2 - Ipsum - 100 ${global.commons.getLocalizedName(100, 'systems.voting.votes')}, 50.00%`, owner)
      await message.isSentRaw(`#vote3 - Dolor Sit - 0 ${global.commons.getLocalizedName(0, 'systems.voting.votes')}, 0.00%`, owner)
    })

    it('Close voting', async () => {
      assert.isTrue(await global.systems.voting.close(owner))
    })

    it(`!vote should return not in progress info`, async () => {
      await message.prepare()

      await global.systems.voting.main({ sender: owner, parameters: ''  })
      await message.isSent('systems.voting.notInProgress', owner)
    })

    it(`!vote 1 should return not in progress info`, async () => {
      await message.prepare()

      const user = Math.random()
      await global.systems.voting.main({ sender: { username: user }, parameters: '1' })
      await message.isSent('systems.voting.notInProgress', { username: user })
    })
  })
})

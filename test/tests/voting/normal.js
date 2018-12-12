/* global describe it before */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const _ = require('lodash')

const assert = require('chai').assert

const owner = { username: 'soge__' }

describe('Voting - normal', () => {
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
      assert.isTrue(await global.systems.voting.open({ sender: owner, parameters: '-title "Lorem Ipsum test?" Lorem | Ipsum | Dolor Sit' }))
    })
    it('Close voting', async () => {
      assert.isTrue(await global.systems.voting.close(owner))
    })
  })

  describe('Voting full workflow', () => {
    var vid = null
    it('Open new voting', async () => {
      assert.isTrue(await global.systems.voting.open({ sender: owner, parameters: '-title "Lorem Ipsum?" Lorem | Ipsum | Dolor Sit' }))
    })
    it('Open another voting should fail', async () => {
      assert.isFalse(await global.systems.voting.open({ sender: owner, parameters: '-title "Lorem Ipsum2?" Lorem2 | Ipsum2 | Dolor Sit2' }))
    })
    it('Voting should be correctly in db', async () => {
      const cVote = await global.db.engine.findOne(global.systems.voting.collection.data, { isOpened: true });
      assert.isNotEmpty(cVote)
      assert.deepEqual(cVote.options, ['Lorem', 'Ipsum', 'Dolor Sit'])
      assert.equal(cVote.title, 'Lorem Ipsum?')
      vid = String(cVote._id)
    })
    it(`!vote should return correct vote status`, async () => {
      await message.prepare()

      await global.systems.voting.main({ sender: owner, parameters: ''  })
      await message.isSent('systems.voting.status', owner, { title: 'Lorem Ipsum?' })
      await message.isSentRaw(global.systems.voting.settings.commands['!vote'] + ` 1 - Lorem - 0 ${global.commons.getLocalizedName(0, 'systems.voting.votes')}, 0.00%`, owner)
      await message.isSentRaw(global.systems.voting.settings.commands['!vote'] + ` 2 - Ipsum - 0 ${global.commons.getLocalizedName(0, 'systems.voting.votes')}, 0.00%`, owner)
      await message.isSentRaw(global.systems.voting.settings.commands['!vote'] + ` 3 - Dolor Sit - 0 ${global.commons.getLocalizedName(0, 'systems.voting.votes')}, 0.00%`, owner)
    })
    it(`User ${owner.username} will vote for option 0 - should fail`, async () => {
      await global.systems.voting.main({ sender: owner, parameters: '0' })
      const vote = await global.db.engine.findOne(global.systems.voting.collection.votes, { votedBy: owner.username, vid });
      assert.isEmpty(vote)
    })
    it(`User ${owner.username} will vote for option 4 - should fail`, async () => {
      await global.systems.voting.main({ sender: owner, parameters: '4' })
      const vote = await global.db.engine.findOne(global.systems.voting.collection.votes, { votedBy: owner.username, vid });
      assert.isEmpty(vote)
    })
    for (let o of [1,2,3]) {
      it(`User ${owner.username} will vote for option ${o} - should be saved in db`, async () => {
        await global.systems.voting.main({ sender: owner, parameters: String(o) })
        const vote = await global.db.engine.findOne(global.systems.voting.collection.votes, { votedBy: owner.username, vid });
        assert.isNotEmpty(vote, 'Expected ' + JSON.stringify({ votedBy: user, vid }) + ' to be found in db')
        assert.equal(vote.option, o - 1)
      })
    }
    it(`10 users will vote for option 1 and another 10 for option 2`, async () => {
      for (let o of [1,2]) {
        for (let i = 0; i < 10; i++) {
          const user = Number(Math.random() * 1000).toFixed(0)
          await global.systems.voting.main({ sender: { username: user }, parameters: String(o) })
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
      await message.isSentRaw(global.systems.voting.settings.commands['!vote'] + ` 1 - Lorem - 10 ${global.commons.getLocalizedName(10, 'systems.voting.votes')}, 47.62%`, owner)
      await message.isSentRaw(global.systems.voting.settings.commands['!vote'] + ` 2 - Ipsum - 10 ${global.commons.getLocalizedName(10, 'systems.voting.votes')}, 47.62%`, owner)
      await message.isSentRaw(global.systems.voting.settings.commands['!vote'] + ` 3 - Dolor Sit - 1 ${global.commons.getLocalizedName(1, 'systems.voting.votes')}, 4.76%`, owner)
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

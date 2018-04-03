/* global describe it beforeEach */
if (require('cluster').isWorker) process.exit()

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const assert = require('chai').assert

const owner = { username: 'soge__' }

describe('systems/moderation - permitLink()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()
  })
  describe('!permit', function () {
    describe('parsing \'!permit\'', function () {
      it('should send parse error', async function () {
        global.systems.moderation.permitLink(global.systems.moderation, owner, '')
        await message.isSent('moderation.permit-parse-failed', owner)
      })
    })
    describe('parsing \'!permit [username]\'', function () {
      it('should send success message', async function () {
        global.systems.moderation.permitLink(global.systems.moderation, owner, 'test')
        await message.isSent('moderation.user-have-link-permit', owner, { username: 'test', count: 1, link: 'link' })
      })
      it('should not timeout user on first link message', async () => {
        assert.isTrue(await global.systems.moderation.containsLink(global.systems.moderation, { username: 'test' }, 'http://www.google.com'))
      })
      it('should timeout user on second link message', async function () {
        assert.isFalse(await global.systems.moderation.containsLink(global.systems.moderation, { username: 'test' }, 'http://www.google.com'))
      })
    })
    describe('parsing \'!permit [username]\' - case sensitive test', function () {
      it('should send success message', async function () {
        global.systems.moderation.permitLink(global.systems.moderation, owner, 'TEST')
        await message.isSent('moderation.user-have-link-permit', owner, { username: 'test', count: 1, link: 'link' })
      })
      it('should not timeout user on first link message', async () => {
        assert.isTrue(await global.systems.moderation.containsLink(global.systems.moderation, { username: 'test' }, 'http://www.google.com'))
      })
      it('should timeout user on second link message', async function () {
        assert.isFalse(await global.systems.moderation.containsLink(global.systems.moderation, { username: 'test' }, 'http://www.google.com'))
      })
    })
  })
})

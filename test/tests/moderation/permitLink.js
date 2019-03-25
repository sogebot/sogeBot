/* global describe it before */
const {
  isMainThread
} = require('worker_threads');
if (!isMainThread) process.exit()
const commons = require('../../../dest/commons');


require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const assert = require('chai').assert

const owner = Object.freeze({ username: 'soge__', badges: {} })
const testUser = Object.freeze({ username: 'test', badges: {} })

describe('systems/moderation - permitLink()', () => {
  before(async () => {
    await db.cleanup()
    await message.prepare()
  })
  describe('!permit', function () {
    describe('parsing \'!permit\'', function () {
      it('should send parse error', async function () {
        global.systems.moderation.permitLink({ sender: owner, parameters: '' })
        await message.isSent('moderation.permit-parse-failed', owner)
      })
    })
    describe('parsing \'!permit [username] 1000\'', function () {
      it('should send success message', async function () {
        global.systems.moderation.permitLink({ sender: owner, parameters: 'test 1000' })
        await message.isSent('moderation.user-have-link-permit', owner, { username: 'test', count: 1000, link: commons.getLocalizedName(1000, 'core.links') })
      })
      it('should not timeout user 1000 messages', async () => {
        for (let i = 0; i < 1000; i++) {
          assert.isTrue(await global.systems.moderation.containsLink({ sender: testUser, message: 'http://www.google.com' }))
        }
      })
      it('should timeout user on 1001 message', async function () {
        assert.isFalse(await global.systems.moderation.containsLink({ sender: testUser, message: 'http://www.google.com' }))
      })
    })
    describe('parsing \'!permit [username]\'', function () {
      it('should send success message', async function () {
        global.systems.moderation.permitLink({ sender: owner, parameters: 'test' })
        await message.isSent('moderation.user-have-link-permit', owner, { username: 'test', count: 1, link: 'link' })
      })
      it('should not timeout user on first link message', async () => {
        assert.isTrue(await global.systems.moderation.containsLink({ sender: testUser, message: 'http://www.google.com' }))
      })
      it('should timeout user on second link message', async function () {
        assert.isFalse(await global.systems.moderation.containsLink({ sender: testUser, message: 'http://www.google.com' }))
      })
    })
    describe('parsing \'!permit [username]\' - case sensitive test', function () {
      it('should send success message', async function () {
        global.systems.moderation.permitLink({ sender: owner, parameters: 'TEST' })
        await message.isSent('moderation.user-have-link-permit', owner, { username: 'test', count: 1, link: 'link' })
      })
      it('should not timeout user on first link message', async () => {
        assert.isTrue(await global.systems.moderation.containsLink({ sender: testUser, message: 'http://www.google.com' }))
      })
      it('should timeout user on second link message', async function () {
        assert.isFalse(await global.systems.moderation.containsLink({ sender: testUser, message: 'http://www.google.com' }))
      })
    })
  })
})

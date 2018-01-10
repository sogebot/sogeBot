/* global describe it before */

const assert = require('chai').assert
require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }
const testuser = { username: 'testuser' }
const testuser2 = { username: 'testuser2' }
const testuser3 = { username: 'testuser3' }

describe('Users - ignore', () => {
  before(async () => {
    global.commons.sendMessage.reset()
    await db.cleanup()
  })

  describe('Ignore workflow', () => {
    it('testuser is not ignored by default', async () => {
      global.parser.parse(testuser, '!duel')
      await message.isSent('gambling.duel.notEnoughOptions', testuser, { })
    })

    it('add testuser to ignore list', async () => {
      global.users.ignoreAdd(global.users, owner, 'testuser')
      await message.isSent('ignore.user.is.added', owner, testuser)
    })

    it('add @testuser2 to ignore list', async () => {
      global.users.ignoreAdd(global.users, owner, '@testuser2')
      await message.isSent('ignore.user.is.added', owner, testuser2)
    })

    it('testuser should be in ignore list', async () => {
      global.users.ignoreCheck(global.users, owner, 'testuser')
      await message.isSent('ignore.user.is.ignored', owner, testuser)
    })

    it('@testuser2 should be in ignore list', async () => {
      global.users.ignoreCheck(global.users, owner, '@testuser2')
      await message.isSent('ignore.user.is.ignored', owner, testuser2)
    })

    it('testuser3 should not be in ignore list', async () => {
      global.users.ignoreCheck(global.users, owner, 'testuser3')
      await message.isSent('ignore.user.is.not.ignored', owner, testuser3)
    })

    it('testuser is ignored', (done) => {
      global.parser.parse(testuser, '!duel')
      setTimeout(() => { assert.isTrue(global.commons.sendMessage.notCalled); done() }, 2000)
    })

    it('remove testuser from ignore list', async () => {
      global.users.ignoreRm(global.users, owner, 'testuser')
      await message.isSent('ignore.user.is.removed', owner, testuser)
    })

    it('testuser should not be in ignore list', async () => {
      global.users.ignoreCheck(global.users, owner, 'testuser')
      await message.isSent('ignore.user.is.not.ignored', owner, testuser)
    })

    it('testuser is not ignored anymore', async () => {
      global.parser.parse(testuser, '!duel')
      await message.isSent('gambling.duel.notEnoughOptions', testuser, { })
    })
  })
})

/* global describe it before */

const assert = require('chai').assert
require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const tmi = require('../../general.js').tmi
const until = require('test-until')
const _ = require('lodash')

// users
const owner = { username: 'soge__' }
const testuser = { username: 'testuser' }
const testuser2 = { username: 'testuser2' }
const testuser3 = { username: 'testuser3' }

describe('Users - ignore', () => {
  before(async () => {
    await tmi.waitForConnection()
    global.commons.sendMessage.reset()
    global.commons.timeout.reset()
    await db.cleanup()
  })

  describe('Ignore workflow', () => {
    it('testuser is not ignored by default', async () => {
      let ignoredUser = await global.db.engine.findOne('users_ignorelist', { username: _.get(testuser, 'username', '') })
      global.parser.parse(testuser, '!duel', false, !_.isEmpty(ignoredUser))
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
      global.db.engine.findOne('users_ignorelist', { username: _.get(testuser, 'username', '') }).then((ignoredUser) => {
        global.parser.parse(testuser, '!duel', false, !_.isEmpty(ignoredUser))
        setTimeout(() => { assert.isTrue(global.commons.sendMessage.notCalled); done() }, 2000)
      })
    })

    it('even when ignored, user should have timeout for link', async () => {
      global.client.emits(['message'], [
        ['channel', { username: 'testuser' }, 'http://www.google.com', false]
      ])
      await until(() => global.commons.timeout.calledOnce, 20000)
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
      let ignoredUser = await global.db.engine.findOne('users_ignorelist', { username: _.get(testuser, 'username', '') })
      global.parser.parse(testuser, '!duel', false, !_.isEmpty(ignoredUser))
      await message.isSent('gambling.duel.notEnoughOptions', testuser, { })
    })
  })
})

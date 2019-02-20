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
    await db.cleanup()
    await message.prepare()
  })

  describe('Ignore workflow', () => {
    it('testuser is not ignored by default', async () => {
      assert.isFalse(await global.commons.isIgnored(testuser))
    })

    it('add testuser to ignore list', async () => {
      global.users.ignoreAdd({ sender: owner, parameters: 'testuser' })
      await message.isSent('ignore.user.is.added', owner, testuser)
    })

    it('add @testuser2 to ignore list', async () => {
      global.users.ignoreAdd({ sender: owner, parameters: '@testuser2' })
      await message.isSent('ignore.user.is.added', owner, testuser2)
    })

    it('testuser should be in ignore list', async () => {
      global.users.ignoreCheck({ sender: owner, parameters: 'testuser' })
      const item = await global.db.engine.findOne('core.settings', { key: 'users.ignorelist' })

      await message.isSent('ignore.user.is.ignored', owner, testuser)
      assert.isTrue(await global.commons.isIgnored(testuser))
      assert.isNotEmpty(item)
      assert.include(item.value, 'testuser')
    })

    it('@testuser2 should be in ignore list', async () => {
      global.users.ignoreCheck({ sender: owner, parameters: '@testuser2' })
      const item = await global.db.engine.findOne('core.settings', { key: 'users.ignorelist' })

      await message.isSent('ignore.user.is.ignored', owner, testuser2)
      assert.isTrue(await global.commons.isIgnored(testuser2))
      assert.isNotEmpty(item)
      assert.include(item.value, 'testuser2')
    })

    it('testuser3 should not be in ignore list', async () => {
      global.users.ignoreCheck({ sender: owner, parameters: 'testuser3' })
      const item = await global.db.engine.findOne('core.settings', { key: 'users.ignorelist' })

      await message.isSent('ignore.user.is.not.ignored', owner, testuser3)
      assert.isFalse(await global.commons.isIgnored(testuser3))
      assert.isNotEmpty(item)
      assert.notInclude(item.value, 'testuser3')

    })

    it('remove testuser from ignore list', async () => {
      global.users.ignoreRm({ sender: owner, parameters: 'testuser' })
      await message.isSent('ignore.user.is.removed', owner, testuser)
    })

    it('testuser should not be in ignore list', async () => {
      global.users.ignoreCheck({ sender: owner, parameters: 'testuser' })
      await message.isSent('ignore.user.is.not.ignored', owner, testuser)
      assert.isFalse(await global.commons.isIgnored(testuser))
    })
  })
})

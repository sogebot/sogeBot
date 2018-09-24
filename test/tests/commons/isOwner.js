/* global describe it before */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const variable = require('../../general.js').variable

const assert = require('chai').assert

const owner = { username: 'soge__' }
const notOwner = { username: 'testuser' }

describe('lib/commons - isOwner()', () => {
  before(async () => {
    await db.cleanup()
    await message.prepare()

    global.oauth.settings.general.owners = ['soge__']
    variable.isEqual('global.oauth.settings.general.owners', ['soge__'])
  })

  it('should be returned as owner', async () => {
    assert.isTrue(await global.commons.isOwner(owner))
  })

  it('should not be returned as owner', async () => {
    assert.isFalse(await global.commons.isOwner(notOwner))
  })
})

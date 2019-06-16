/* global describe it before */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const variable = require('../../general.js').variable

const { isOwner } = require('../../../dest/commons');

const assert = require('chai').assert

const owner = { username: 'soge__' }
const notOwner = { username: 'testuser' }

describe('lib/commons - isOwner()', () => {
  before(async () => {
    await db.cleanup()
    await message.prepare()

    global.oauth.generalOwners = ['soge__']
    variable.isEqual('global.oauth.generalOwners', ['soge__'])
  })

  it('should be returned as owner', async () => {
    assert.isTrue(isOwner(owner))
  })

  it('should not be returned as owner', async () => {
    assert.isFalse(isOwner(notOwner))
  })
})

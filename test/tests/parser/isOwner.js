/* global describe it before */

require('../../general.js')

const db = require('../../general.js').db
const tmi = require('../../general.js').tmi

const assert = require('chai').assert

const owner = { username: 'soge__' }
const notOwner = { username: 'testuser' }

describe('lib/parser - isOwner()', () => {
  before(async () => {
    await tmi.waitForConnection()
    global.commons.sendMessage.reset()
    await db.cleanup()
  })

  it('should be returned as owner', async () => {
    assert.isTrue(global.parser.isOwner(owner))
  })

  it('should not be returned as owner', async () => {
    assert.isFalse(global.parser.isOwner(notOwner))
  })
})

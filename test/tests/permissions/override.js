/* global describe it beforeEach */

const assert = require('chai').assert
require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Permissions - override()', () => {
  beforeEach(async () => {
    global.commons.sendMessage.reset()
    await db.cleanup()
  })

  it('change permission to viewer to !top messages', async () => {
    global.permissions.override(global.permissions, owner, 'viewer !top messages')
    await message.isSent('permissions.success.change', owner, { command: 'top messages' })
  })
})

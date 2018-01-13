/* global describe it beforeEach */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const tmi = require('../../general.js').tmi

// users
const owner = { username: 'soge__' }

describe('Permissions - override()', () => {
  beforeEach(async () => {
    await tmi.waitForConnection()
    global.commons.sendMessage.reset()
    await db.cleanup()
  })

  it('change permission to viewer to !top messages', async () => {
    global.permissions.override(global.permissions, owner, 'viewer !top messages')
    await message.isSent('permissions.success.change', owner, { command: 'top messages' })
  })
})

/* global describe it beforeEach */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Permissions - override()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()
  })

  it('change permission to viewer to !top messages', async () => {
    global.permissions.override({ sender: owner, parameters: 'viewer !top messages' })
    await message.isSent('permissions.success.change', owner, { command: '!top messages' })
  })
})

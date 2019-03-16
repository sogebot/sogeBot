/* global describe it beforeEach */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Permissions - list()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()
  })

  it('Permission list should be correct', async () => {
    global.permissions.list({ sender: owner, parameters: '' })
    await message.isSent('core.permissions.list', owner);
    await message.isSentRaw('≥ | Casters | 4300ed23-dca0-4ed9-8014-f5f2f7af55a9', owner);
    await message.isSentRaw('≥ | Moderators | b38c5adb-e912-47e3-937a-89fabd12393a', owner);
    await message.isSentRaw('≥ | Subscribers | e3b557e7-c26a-433c-a183-e56c11003ab7', owner);
    await message.isSentRaw('≥ | Followers | c168a63b-aded-4a90-978f-ed357e95b0d2', owner);
    await message.isSentRaw('≥ | Viewers | 0efd7b1c-e460-4167-8e06-8aaf2c170311', owner);
  })
})

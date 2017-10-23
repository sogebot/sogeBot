/* global describe it beforeEach */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Keywords - list()', () => {
  beforeEach(async () => {
    global.commons.sendMessage.reset()
    await db.cleanup()
  })

  it('empty list', async () => {
    global.systems.keywords.list(global.systems.keywords, owner, '')
    await message.isSent('keywords.list-is-empty', owner)
  })

  it('populated list', async () => {
    global.systems.keywords.add(global.systems.keywords, owner, 'a me')
    await message.isSent('keywords.keyword-was-added', owner, { keyword: 'a' })

    global.systems.keywords.add(global.systems.keywords, owner, 'b me')
    await message.isSent('keywords.keyword-was-added', owner, { keyword: 'b' })

    global.systems.keywords.list(global.systems.keywords, owner, '')
    await message.isSent('keywords.list-is-not-empty', owner, { list: 'a, b' })
  })
})

/* global describe it beforeEach */
require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Keywords - toggle()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()
  })

  it('', async () => {
    global.systems.keywords.toggle({ sender: owner, parameters: '' })
    await message.isSent('keywords.keyword-parse-failed', owner, { sender: owner.username })
  })

  it('unknown', async () => {
    global.systems.keywords.toggle({ sender: owner, parameters: 'unknown' })
    await message.isSent('keywords.keyword-was-not-found', owner, { keyword: 'unknown', sender: owner.username })
  })

  it('a', async () => {
    global.systems.keywords.add({ sender: owner, parameters: 'a Lorem Ipsum' })
    await message.isSent('keywords.keyword-was-added', owner, { keyword: 'a', sender: owner.username })

    global.systems.keywords.toggle({ sender: owner, parameters: 'a' })
    await message.isSent('keywords.keyword-was-disabled', owner, { keyword: 'a', sender: owner.username })

    global.systems.keywords.toggle({ sender: owner, parameters: 'a' })
    await message.isSent('keywords.keyword-was-enabled', owner, { keyword: 'a', sender: owner.username })
  })
})

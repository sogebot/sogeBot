/* global describe it beforeEach */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const tmi = require('../../general.js').tmi

// users
const owner = { username: 'soge__' }

describe('Keywords - toggle()', () => {
  beforeEach(async () => {
    await tmi.waitForConnection()
    global.commons.sendMessage.reset()
    await db.cleanup()
  })

  it('', async () => {
    global.systems.keywords.toggle(global.systems.keywords, owner, '')
    await message.isSent('keywords.keyword-parse-failed', owner)
  })

  it('unknown', async () => {
    global.systems.keywords.toggle(global.systems.keywords, owner, 'unknown')
    await message.isSent('keywords.keyword-was-not-found', owner, { keyword: 'unknown' })
  })

  it('a', async () => {
    global.systems.keywords.add(global.systems.keywords, owner, 'a Lorem Ipsum')
    await message.isSent('keywords.keyword-was-added', owner, { keyword: 'a' })

    global.systems.keywords.toggle(global.systems.keywords, owner, 'a')
    await message.isSent('keywords.keyword-was-disabled', owner, { keyword: 'a' })

    global.systems.keywords.toggle(global.systems.keywords, owner, 'a')
    await message.isSent('keywords.keyword-was-enabled', owner, { keyword: 'a' })
  })
})

/* global describe it beforeEach */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const tmi = require('../../general.js').tmi

// users
const owner = { username: 'soge__' }

describe('Keywords - remove()', () => {
  beforeEach(async () => {
    await tmi.waitForConnection()
    global.commons.sendMessage.reset()
    await db.cleanup()
  })

  it('', async () => {
    global.systems.keywords.remove(global.systems.keywords, owner, '')
    await message.isSent('keywords.keyword-parse-failed', owner)
  })

  it('!alias', async () => {
    global.systems.keywords.remove(global.systems.keywords, owner, '!alias')
    await message.isSent('keywords.keyword-was-not-found', owner, { keyword: '!alias' })
  })

  it('alias', async () => {
    global.systems.keywords.remove(global.systems.keywords, owner, 'alias')
    await message.isSent('keywords.keyword-was-not-found', owner, { keyword: 'alias' })
  })

  it('!a', async () => {
    global.systems.keywords.add(global.systems.keywords, owner, 'a me')
    await message.isSent('keywords.keyword-was-added', owner, { keyword: 'a', response: '!me' })

    global.systems.keywords.remove(global.systems.keywords, owner, 'a')
    await message.isSent('keywords.keyword-was-removed', owner, { keyword: 'a' })
  })

  it('2x - !a !me', async () => {
    global.systems.keywords.add(global.systems.keywords, owner, 'a me')
    await message.isSent('keywords.keyword-was-added', owner, { keyword: 'a', response: '!me' })

    global.systems.keywords.remove(global.systems.keywords, owner, 'a')
    await message.isSent('keywords.keyword-was-removed', owner, { keyword: 'a' })

    global.systems.keywords.remove(global.systems.keywords, owner, 'a')
    await message.isSent('keywords.keyword-was-not-found', owner, { keyword: 'a' })
  })
})

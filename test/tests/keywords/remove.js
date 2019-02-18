/* global describe it beforeEach */
require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Keywords - remove()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()
  })

  it('', async () => {
    global.systems.keywords.remove({ sender: owner, parameters: '' })
    await message.isSent('keywords.keyword-parse-failed', owner, { sender: owner.username })
  })

  it('!alias', async () => {
    global.systems.keywords.remove({ sender: owner, parameters: '!alias' })
    await message.isSent('keywords.keyword-was-not-found', owner, { keyword: '!alias', sender: owner.username })
  })

  it('alias', async () => {
    global.systems.keywords.remove({ sender: owner, parameters: 'alias' })
    await message.isSent('keywords.keyword-was-not-found', owner, { keyword: 'alias', sender: owner.username })
  })

  it('!a', async () => {
    global.systems.keywords.add({ sender: owner, parameters: 'a me' })
    await message.isSent('keywords.keyword-was-added', owner, { keyword: 'a', response: '!me', sender: owner.username })

    global.systems.keywords.remove({ sender: owner, parameters: 'a' })
    await message.isSent('keywords.keyword-was-removed', owner, { keyword: 'a', sender: owner.username })
  })

  it('2x - !a !me', async () => {
    global.systems.keywords.add({ sender: owner, parameters: 'a me' })
    await message.isSent('keywords.keyword-was-added', owner, { keyword: 'a', response: '!me', sender: owner.username })

    global.systems.keywords.remove({ sender: owner, parameters: 'a' })
    await message.isSent('keywords.keyword-was-removed', owner, { keyword: 'a', sender: owner.username })

    global.systems.keywords.remove({ sender: owner, parameters: 'a' })
    await message.isSent('keywords.keyword-was-not-found', owner, { keyword: 'a', sender: owner.username })
  })
})

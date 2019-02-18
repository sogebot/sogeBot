/* global describe it beforeEach */
require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Keywords - edit()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()
  })

  it('', async () => {
    global.systems.keywords.edit({ sender: owner, parameters: '' })
    await message.isSent('keywords.keyword-parse-failed', owner, { sender: owner.username })
  })

  it('!a', async () => {
    global.systems.keywords.edit({ sender: owner, parameters: '!a' })
    await message.isSent('keywords.keyword-parse-failed', owner, { sender: owner.username })
  })

  it('!unknown Lorem Ipsum', async () => {
    global.systems.keywords.edit({ sender: owner, parameters: '!unknown Lorem Ipsum' })
    await message.isSent('keywords.keyword-was-not-found', owner, { keyword: '!unknown', sender: owner.username })
  })

  it('unknown Lorem Ipsum', async () => {
    global.systems.keywords.edit({ sender: owner, parameters: 'unknown Lorem Ipsum' })
    await message.isSent('keywords.keyword-was-not-found', owner, { keyword: 'unknown', sender: owner.username })
  })

  it('!a Lorem Ipsum -> !a Ipsum Lorem', async () => {
    global.systems.keywords.add({ sender: owner, parameters: 'a Lorem Ipsum' })
    await message.isSent('keywords.keyword-was-added', owner, { keyword: 'a', response: 'Lorem Ipsum', sender: owner.username })

    global.systems.keywords.run({ sender: owner, message: 'a' })
    await message.isSentRaw('Lorem Ipsum', owner)

    global.systems.keywords.edit({ sender: owner, parameters: 'a Ipsum Lorem' })
    await message.isSent('keywords.keyword-was-edited', owner, { keyword: 'a', response: 'Ipsum Lorem', sender: owner.username })

    global.systems.keywords.run({ sender: owner, message: 'a' })
    await message.isSentRaw('Ipsum Lorem', owner)
  })
})

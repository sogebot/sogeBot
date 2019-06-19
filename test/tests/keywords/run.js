/* global describe it beforeEach */
require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Keywords - run()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()
  })

  it('a will show Lorem Ipsum', async () => {
    global.systems.keywords.add({ sender: owner, parameters: 'a Lorem Ipsum' })
    await message.isSent('keywords.keyword-was-added', owner, { keyword: 'a', response: 'Lorem Ipsum', sender: owner.username })

    global.systems.keywords.run({ sender: owner, message: 'a' })
    await message.isSentRaw('Lorem Ipsum', owner)

    global.systems.keywords.remove({ sender: owner, parameters: 'a' })
    await message.isSent('keywords.keyword-was-removed', owner, { keyword: 'a', sender: owner.username })
  })

  it('#2293 - trigger should be case insensitive', async () => {
    global.systems.keywords.add({ sender: owner, parameters: 'alpha Lorem Ipsum' })
    await message.isSent('keywords.keyword-was-added', owner, { keyword: 'alpha', response: 'Lorem Ipsum', sender: owner.username })

    global.systems.keywords.run({ sender: owner, message: 'AlphA' })
    await message.isSentRaw('Lorem Ipsum', owner)

    global.systems.keywords.remove({ sender: owner, parameters: 'alpha' })
    await message.isSent('keywords.keyword-was-removed', owner, { keyword: 'alpha', sender: owner.username })
  })
})

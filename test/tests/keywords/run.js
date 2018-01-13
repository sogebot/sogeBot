/* global describe it beforeEach */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const tmi = require('../../general.js').tmi

// users
const owner = { username: 'soge__' }

describe('Keywords - run()', () => {
  beforeEach(async () => {
    await tmi.waitForConnection()
    global.commons.sendMessage.reset()
    await db.cleanup()
  })

  it('a will show Lorem Ipsum', async () => {
    global.systems.keywords.add(global.systems.keywords, owner, 'a Lorem Ipsum')
    await message.isSent('keywords.keyword-was-added', owner, { keyword: 'a', response: 'Lorem Ipsum' })

    global.parser.parse(owner, 'a')
    await message.isSentRaw('Lorem Ipsum', owner)

    global.systems.keywords.remove(global.systems.keywords, owner, 'a')
    await message.isSent('keywords.keyword-was-removed', owner, { keyword: 'a' })
  })
})

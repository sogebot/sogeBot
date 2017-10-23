/* global describe it beforeEach */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Keywords - edit()', () => {
  beforeEach(async () => {
    global.commons.sendMessage.reset()
    await db.cleanup()
  })

  it('', async () => {
    global.systems.keywords.edit(global.systems.keywords, owner, '')
    await message.isSent('keywords.keyword-parse-failed', owner)
  })

  it('!a', async () => {
    global.systems.keywords.edit(global.systems.keywords, owner, '!a')
    await message.isSent('keywords.keyword-parse-failed', owner)
  })

  it('!unknown Lorem Ipsum', async () => {
    global.systems.keywords.edit(global.systems.keywords, owner, '!unknown Lorem Ipsum')
    await message.isSent('keywords.keyword-was-not-found', owner, { keyword: '!unknown' })
  })

  it('unknown Lorem Ipsum', async () => {
    global.systems.keywords.edit(global.systems.keywords, owner, 'unknown Lorem Ipsum')
    await message.isSent('keywords.keyword-was-not-found', owner, { keyword: 'unknown' })
  })

  it('!a Lorem Ipsum -> !a Ipsum Lorem', async () => {
    global.systems.keywords.add(global.systems.keywords, owner, 'a Lorem Ipsum')
    await message.isSent('keywords.keyword-was-added', owner, { keyword: 'a', response: 'Lorem Ipsum' })

    global.parser.parse(owner, 'a')
    await message.isSentRaw('Lorem Ipsum', owner)

    global.systems.keywords.edit(global.systems.keywords, owner, 'a Ipsum Lorem')
    await message.isSent('keywords.keyword-was-edited', owner, { keyword: 'a', response: 'Ipsum Lorem' })

    global.parser.parse(owner, 'a')
    await message.isSentRaw('Ipsum Lorem', owner)
  })
})

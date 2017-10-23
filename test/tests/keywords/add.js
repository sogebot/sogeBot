/* global describe it beforeEach */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Keywords - add()', () => {
  beforeEach(async () => {
    global.commons.sendMessage.reset()
    await db.cleanup()
  })

  it('', async () => {
    global.systems.keywords.add(global.systems.keywords, owner, '')
    await message.isSent('keywords.keyword-parse-failed', owner)
  })

  it('!alias', async () => {
    global.systems.keywords.add(global.systems.keywords, owner, '!alias')
    await message.isSent('keywords.keyword-parse-failed', owner)
  })

  it('alias', async () => {
    global.systems.keywords.add(global.systems.keywords, owner, 'alias')
    await message.isSent('keywords.keyword-parse-failed', owner)
  })

  it('!new asd', async () => {
    global.systems.keywords.add(global.systems.keywords, owner, '!new asd')
    await message.isSent('keywords.keyword-was-added', owner, { keyword: 'new' })

    global.parser.parse(owner, 'new')
    await message.isSentRaw('asd', owner)
  })

  it('alias asd', async () => {
    global.systems.keywords.add(global.systems.keywords, owner, 'alias asd')
    await message.isSent('keywords.keyword-was-added', owner, { keyword: 'alias' })

    global.parser.parse(owner, 'asda alias asd')
    await message.isSentRaw('asd', owner)
  })

  it('2x - aaa Lorem Ipsum', async () => {
    global.systems.keywords.add(global.systems.keywords, owner, 'aaa Lorem Ipsum')
    await message.isSent('keywords.keyword-was-added', owner, { response: 'Lorem Ipsum', keyword: 'aaa' })

    global.systems.keywords.add(global.systems.keywords, owner, 'aaa Lorem Ipsum')
    await message.isSent('keywords.keyword-already-exist', owner, { keyword: 'aaa' })
  })
})

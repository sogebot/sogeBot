/* global describe it beforeEach */
if (require('cluster').isWorker) process.exit()

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Keywords - list()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()
  })

  it('empty list', async () => {
    global.systems.keywords.list(global.systems.keywords, owner, '')
    await message.isSent('keywords.list-is-empty', owner, { sender: owner.username })
  })

  it('populated list', async () => {
    global.systems.keywords.add(global.systems.keywords, owner, 'a me')
    await message.isSent('keywords.keyword-was-added', owner, { keyword: 'a', sender: owner.username })

    global.systems.keywords.add(global.systems.keywords, owner, 'b me')
    await message.isSent('keywords.keyword-was-added', owner, { keyword: 'b', sender: owner.username })

    global.systems.keywords.list(global.systems.keywords, owner, '')
    await message.isSent('keywords.list-is-not-empty', owner, { list: 'a, b', sender: owner.username })
  })
})

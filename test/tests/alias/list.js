/* global describe it beforeEach */
if (require('cluster').isWorker) process.exit()

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Alias - list()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()
  })

  it('empty list', async () => {
    global.systems.alias.list(global.systems.alias, owner, '')
    await message.isSent('alias.list-is-empty', owner, { sender: owner.username })
  })

  it('populated list', async () => {
    global.systems.alias.add(global.systems.alias, owner, 'viewer !a !me')
    await message.isSent('alias.alias-was-added', owner, { alias: 'a', command: 'me', sender: owner.username })

    global.systems.alias.add(global.systems.alias, owner, 'viewer !b !me')
    await message.isSent('alias.alias-was-added', owner, { alias: 'b', command: 'me', sender: owner.username })

    global.systems.alias.list(global.systems.alias, owner, '')
    await message.isSent('alias.list-is-not-empty', owner, { list: '!a, !b', sender: owner.username })
  })
})

/* global describe it beforeEach */
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
    global.systems.alias.list({ sender: owner, parameters: '' })
    await message.isSent('alias.list-is-empty', owner, { sender: owner.username })
  })

  it('populated list', async () => {
    global.systems.alias.add({ sender: owner, parameters: '-a !a -c !me' })
    await message.isSent('alias.alias-was-added', owner, { alias: '!a', command: '!me', sender: owner.username })

    global.systems.alias.add({ sender: owner, parameters: '-a !b -c !me' })
    await message.isSent('alias.alias-was-added', owner, { alias: '!b', command: '!me', sender: owner.username })

    global.systems.alias.list({ sender: owner, parameters: '' })
    await message.isSent('alias.list-is-not-empty', owner, { list: '!a, !b', sender: owner.username })
  })
})

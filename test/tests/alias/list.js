/* global describe it beforeEach */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const tmi = require('../../general.js').tmi

// users
const owner = { username: 'soge__' }

describe('Alias - list()', () => {
  beforeEach(async () => {
    await tmi.waitForConnection()
    global.commons.sendMessage.reset()
    await db.cleanup()
  })

  it('empty list', async () => {
    global.systems.alias.list(global.systems.alias, owner, '')
    await message.isSent('alias.list-is-empty', owner)
  })

  it('populated list', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!a !me')
    await message.isSent('alias.alias-was-added', owner, { alias: 'a', command: 'me' })

    global.systems.alias.add(global.systems.alias, owner, '!b !me')
    await message.isSent('alias.alias-was-added', owner, { alias: 'b', command: 'me' })

    global.systems.alias.list(global.systems.alias, owner, '')
    await message.isSent('alias.list-is-not-empty', owner, { list: '!a, !b' })
  })
})

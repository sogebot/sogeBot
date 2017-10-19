/* global describe it beforeEach */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Alias - list()', () => {
  beforeEach(async () => {
    global.commons.sendMessage.reset()

    await db.cleanup('settings')
    let items = await global.db.engine.find('alias')
    for (let item of items) {
      await global.db.engine.remove('alias', { alias: item.alias })
      global.parser.unregister(item.alias)
    }
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

/* global describe it beforeEach */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Alias - add()', () => {
  beforeEach(async () => {
    global.commons.sendMessage.reset()

    await db.cleanup('settings')
    let items = await global.db.engine.find('alias')
    for (let item of items) {
      await global.db.engine.remove('alias', { alias: item.alias })
      global.parser.unregister(item.alias)
    }
  })

  it('', async () => {
    global.systems.alias.add(global.systems.alias, owner, '')
    await message.isSent('alias.alias-parse-failed', owner)
  })

  it('!alias', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!alias')
    await message.isSent('alias.alias-parse-failed', owner)
  })

  it('alias', async () => {
    global.systems.alias.add(global.systems.alias, owner, 'alias')
    await message.isSent('alias.alias-parse-failed', owner)
  })

  it('!alias asd', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!alias asd')
    await message.isSent('alias.alias-parse-failed', owner)
  })

  it('alias !asd', async () => {
    global.systems.alias.add(global.systems.alias, owner, 'alias !asd')
    await message.isSent('alias.alias-parse-failed', owner)
  })

  it('!a !me', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!a !me')
    await message.isSent('alias.alias-was-added', owner, { alias: 'a', command: 'me' })
  })

  it('2x - !a !me', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!a !me')
    await message.isSent('alias.alias-was-added', owner, { alias: 'a', command: 'me' })

    global.systems.alias.add(global.systems.alias, owner, '!a !me')
    await message.isSent('core.isRegistered', owner, { keyword: 'a' })
  })
})

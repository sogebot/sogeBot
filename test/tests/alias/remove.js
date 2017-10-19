/* global describe it beforeEach */

const assert = require('chai').assert
require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Alias - remove()', () => {
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
    global.systems.alias.remove(global.systems.alias, owner, '')
    await message.isSent('alias.alias-parse-failed', owner)
  })

  it('!alias', async () => {
    global.systems.alias.remove(global.systems.alias, owner, '!alias')
    await message.isSent('alias.alias-was-not-found', owner, { alias: 'alias' })
  })

  it('alias', async () => {
    global.systems.alias.remove(global.systems.alias, owner, 'alias')
    await message.isSent('alias.alias-parse-failed', owner)
  })

  it('!a', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!a !me')
    await message.isSent('alias.alias-was-added', owner, { alias: 'a', command: 'me' })

    global.systems.alias.remove(global.systems.alias, owner, '!a')
    await message.isSent('alias.alias-was-removed', owner, { alias: 'a' })

    // !a is not registered anymore
    assert.isUndefined(global.parser.registeredCmds['!a'])
  })

  it('2x - !a !me', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!a !me')
    await message.isSent('alias.alias-was-added', owner, { alias: 'a', command: 'me' })

    global.systems.alias.remove(global.systems.alias, owner, '!a')
    await message.isSent('alias.alias-was-removed', owner, { alias: 'a' })

    global.systems.alias.remove(global.systems.alias, owner, '!a')
    await message.isSent('alias.alias-was-not-found', owner, { alias: 'a' })
  })
})

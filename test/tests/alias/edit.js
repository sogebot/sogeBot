/* global describe it beforeEach */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Alias - edit()', () => {
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
    global.systems.alias.edit(global.systems.alias, owner, '')
    await message.isSent('alias.alias-parse-failed', owner)
  })

  it('!a', async () => {
    global.systems.alias.edit(global.systems.alias, owner, '!a')
    await message.isSent('alias.alias-parse-failed', owner)
  })

  it('!unknown !uptime', async () => {
    global.systems.alias.edit(global.systems.alias, owner, '!unknown !uptime')
    await message.isSent('alias.alias-was-not-found', owner, { alias: 'unknown' })
  })

  it('!a !me -> !a !uptime', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!a !me')
    await message.isSent('alias.alias-was-added', owner, { alias: 'a', command: 'me' })

    global.systems.alias.edit(global.systems.alias, owner, '!a !uptime')
    await message.isSent('alias.alias-was-edited', owner, { alias: 'a', command: 'uptime' })
  })
})

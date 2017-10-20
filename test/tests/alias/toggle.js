/* global describe it beforeEach */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Alias - toggle()', () => {
  beforeEach(async () => {
    global.commons.sendMessage.reset()
    await db.cleanup()
  })

  it('', async () => {
    global.systems.alias.toggle(global.systems.alias, owner, '')
    await message.isSent('alias.alias-parse-failed', owner)
  })

  it('!unknown', async () => {
    global.systems.alias.toggle(global.systems.alias, owner, '!unknown')
    await message.isSent('alias.alias-was-not-found', owner, { alias: 'unknown' })
  })

  it('!a', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!a !uptime')
    await message.isSent('alias.alias-was-added', owner, { alias: 'a', command: 'uptime' })

    global.systems.alias.toggle(global.systems.alias, owner, '!a')
    await message.isSent('alias.alias-was-disabled', owner, { alias: 'a' })

    global.systems.alias.toggle(global.systems.alias, owner, '!a')
    await message.isSent('alias.alias-was-enabled', owner, { alias: 'a' })
  })
})

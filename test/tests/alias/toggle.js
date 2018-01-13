/* global describe it beforeEach */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const tmi = require('../../general.js').tmi

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

  it('!a with spaces', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!a with spaces !uptime')
    await message.isSent('alias.alias-was-added', owner, { alias: 'a with spaces', command: 'uptime' })

    global.systems.alias.toggle(global.systems.alias, owner, '!a with spaces')
    await message.isSent('alias.alias-was-disabled', owner, { alias: 'a with spaces' })

    global.systems.alias.toggle(global.systems.alias, owner, '!a with spaces')
    await message.isSent('alias.alias-was-enabled', owner, { alias: 'a with spaces' })
  })

  it('!한국어', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!한국어 !uptime')
    await message.isSent('alias.alias-was-added', owner, { alias: '한국어', command: 'uptime' })

    global.systems.alias.toggle(global.systems.alias, owner, '!한국어')
    await message.isSent('alias.alias-was-disabled', owner, { alias: '한국어' })

    global.systems.alias.toggle(global.systems.alias, owner, '!한국어')
    await message.isSent('alias.alias-was-enabled', owner, { alias: '한국어' })
  })

  it('!русский', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!русский !uptime')
    await message.isSent('alias.alias-was-added', owner, { alias: 'русский', command: 'uptime' })

    global.systems.alias.toggle(global.systems.alias, owner, '!русский')
    await message.isSent('alias.alias-was-disabled', owner, { alias: 'русский' })

    global.systems.alias.toggle(global.systems.alias, owner, '!русский')
    await message.isSent('alias.alias-was-enabled', owner, { alias: 'русский' })
  })
})

/* global describe it beforeEach */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const tmi = require('../../general.js').tmi

// users
const owner = { username: 'soge__' }

describe('Alias - edit()', () => {
  beforeEach(async () => {
    await tmi.waitForConnection()
    global.commons.sendMessage.reset()
    await db.cleanup()
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

  it('!한국어 !me -> !한국어 !uptime', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!한국어 !me')
    await message.isSent('alias.alias-was-added', owner, { alias: '한국어', command: 'me' })

    global.systems.alias.edit(global.systems.alias, owner, '!한국어 !uptime')
    await message.isSent('alias.alias-was-edited', owner, { alias: '한국어', command: 'uptime' })
  })

  it('!русский !me -> !русский !uptime', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!русский !me')
    await message.isSent('alias.alias-was-added', owner, { alias: 'русский', command: 'me' })

    global.systems.alias.edit(global.systems.alias, owner, '!русский !uptime')
    await message.isSent('alias.alias-was-edited', owner, { alias: 'русский', command: 'uptime' })
  })

  it('!a with spaces -> !a with spaces !uptime', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!a with spaces !me')
    await message.isSent('alias.alias-was-added', owner, { alias: 'a with spaces', command: 'me' })

    global.systems.alias.edit(global.systems.alias, owner, '!a with spaces !uptime')
    await message.isSent('alias.alias-was-edited', owner, { alias: 'a with spaces', command: 'uptime' })
  })
})

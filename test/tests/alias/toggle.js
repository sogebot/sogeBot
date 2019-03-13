/* global describe it beforeEach */
require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Alias - toggle()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()
  })

  it('', async () => {
    global.systems.alias.toggle({ sender: owner, parameters: '' })
    await message.isSent('alias.alias-parse-failed', owner, { sender: owner.username })
  })

  it('!unknown', async () => {
    global.systems.alias.toggle({ sender: owner, parameters: '!unknown' })
    await message.isSent('alias.alias-was-not-found', owner, { sender: owner.username, alias: '!unknown' })
  })

  it('!a', async () => {
    global.systems.alias.add({ sender: owner, parameters: '-a !a -c !uptime' })
    await message.isSent('alias.alias-was-added', owner, { sender: owner.username, alias: '!a', command: '!uptime' })

    global.systems.alias.toggle({ sender: owner, parameters: '!a' })
    await message.isSent('alias.alias-was-disabled', owner, { sender: owner.username, alias: '!a' })

    global.systems.alias.toggle({ sender: owner, parameters: '!a' })
    await message.isSent('alias.alias-was-enabled', owner, { sender: owner.username, alias: '!a' })
  })

  it('!a with spaces', async () => {
    global.systems.alias.add({ sender: owner, parameters: '-a !a with spaces -c !uptime' })
    await message.isSent('alias.alias-was-added', owner, { sender: owner.username, alias: '!a with spaces', command: '!uptime' })

    global.systems.alias.toggle({ sender: owner, parameters: '!a with spaces' })
    await message.isSent('alias.alias-was-disabled', owner, { sender: owner.username, alias: '!a with spaces' })

    global.systems.alias.toggle({ sender: owner, parameters: '!a with spaces' })
    await message.isSent('alias.alias-was-enabled', owner, { sender: owner.username, alias: '!a with spaces' })
  })

  it('!한국어', async () => {
    global.systems.alias.add({ sender: owner, parameters: '-a !한국어 -c !uptime' })
    await message.isSent('alias.alias-was-added', owner, { sender: owner.username, alias: '!한국어', command: '!uptime' })

    global.systems.alias.toggle({ sender: owner, parameters: '!한국어' })
    await message.isSent('alias.alias-was-disabled', owner, { sender: owner.username, alias: '!한국어' })

    global.systems.alias.toggle({ sender: owner, parameters: '!한국어' })
    await message.isSent('alias.alias-was-enabled', owner, { sender: owner.username, alias: '!한국어' })
  })

  it('!русский', async () => {
    global.systems.alias.add({ sender: owner, parameters: '-a !русский -c !uptime' })
    await message.isSent('alias.alias-was-added', owner, { sender: owner.username, alias: '!русский', command: '!uptime' })

    global.systems.alias.toggle({ sender: owner, parameters: '!русский' })
    await message.isSent('alias.alias-was-disabled', owner, { sender: owner.username, alias: '!русский' })

    global.systems.alias.toggle({ sender: owner, parameters: '!русский' })
    await message.isSent('alias.alias-was-enabled', owner, { sender: owner.username, alias: '!русский' })
  })
})

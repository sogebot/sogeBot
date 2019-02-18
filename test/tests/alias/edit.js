/* global describe it beforeEach */
require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Alias - edit()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()
  })

  it('', async () => {
    global.systems.alias.edit({ sender: owner, parameters: '' })
    await message.isSent('alias.alias-parse-failed', owner, { sender: owner.username })
  })

  it('!a', async () => {
    global.systems.alias.edit({ sender: owner, parameters: '!a' })
    await message.isSent('alias.alias-parse-failed', owner, { sender: owner.username })
  })

  it('!unknown !uptime', async () => {
    global.systems.alias.edit({ sender: owner, parameters: 'viewer !unknown !uptime' })
    await message.isSent('alias.alias-was-not-found', owner, { alias: '!unknown', sender: owner.username })
  })

  it('!a !me -> !a !uptime', async () => {
    global.systems.alias.add({ sender: owner, parameters: 'viewer !a !me' })
    await message.isSent('alias.alias-was-added', owner, { alias: '!a', command: '!me', sender: owner.username })

    global.systems.alias.edit({ sender: owner, parameters: 'owner !a !uptime' })
    await message.isSent('alias.alias-was-edited', owner, { alias: '!a', command: '!uptime', sender: owner.username })
  })

  it('!한국어 !me -> !한국어 !uptime', async () => {
    global.systems.alias.add({ sender: owner, parameters: 'viewer !한국어 !me' })
    await message.isSent('alias.alias-was-added', owner, { alias: '!한국어', command: '!me', sender: owner.username })

    global.systems.alias.edit({ sender: owner, parameters: 'owner !한국어 !uptime' })
    await message.isSent('alias.alias-was-edited', owner, { alias: '!한국어', command: '!uptime', sender: owner.username })
  })

  it('!русский !me -> !русский !uptime', async () => {
    global.systems.alias.add({ sender: owner, parameters: 'viewer !русский !me' })
    await message.isSent('alias.alias-was-added', owner, { alias: '!русский', command: '!me', sender: owner.username })

    global.systems.alias.edit({ sender: owner, parameters: 'owner !русский !uptime' })
    await message.isSent('alias.alias-was-edited', owner, { alias: '!русский', command: '!uptime', sender: owner.username })
  })

  it('!a with spaces -> !a with spaces !uptime', async () => {
    global.systems.alias.add({ sender: owner, parameters: 'viewer !a with spaces !me' })
    await message.isSent('alias.alias-was-added', owner, { alias: '!a with spaces', command: '!me', sender: owner.username })

    global.systems.alias.edit({ sender: owner, parameters: 'owner !a with spaces !uptime' })
    await message.isSent('alias.alias-was-edited', owner, { alias: '!a with spaces', command: '!uptime', sender: owner.username })
  })
})

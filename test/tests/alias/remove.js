/* global describe it beforeEach */
if (require('cluster').isWorker) process.exit()

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Alias - remove()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()
  })

  it('', async () => {
    global.systems.alias.remove(global.systems.alias, owner, '')
    await message.isSent('alias.alias-parse-failed', owner, { sender: owner.username })
  })

  it('!alias', async () => {
    global.systems.alias.remove(global.systems.alias, owner, '!alias')
    await message.isSent('alias.alias-was-not-found', owner, { alias: 'alias', sender: owner.username })
  })

  it('alias', async () => {
    global.systems.alias.remove(global.systems.alias, owner, 'alias')
    await message.isSent('alias.alias-parse-failed', owner, { sender: owner.username })
  })

  it('!a', async () => {
    global.systems.alias.add(global.systems.alias, owner, 'viewer !a !me')
    await message.isSent('alias.alias-was-added', owner, { alias: 'a', command: 'me', sender: owner.username })

    global.systems.alias.remove(global.systems.alias, owner, '!a')
    await message.isSent('alias.alias-was-removed', owner, { alias: 'a', sender: owner.username })
  })

  it('!a with spaces', async () => {
    global.systems.alias.add(global.systems.alias, owner, 'viewer !a with spaces !me')
    await message.isSent('alias.alias-was-added', owner, { alias: 'a with spaces', command: 'me', sender: owner.username })

    global.systems.alias.remove(global.systems.alias, owner, '!a with spaces')
    await message.isSent('alias.alias-was-removed', owner, { alias: 'a with spaces', sender: owner.username })
  })

  it('!한국어', async () => {
    global.systems.alias.add(global.systems.alias, owner, 'viewer !한국어 !me')
    await message.isSent('alias.alias-was-added', owner, { alias: '한국어', command: 'me', sender: owner.username })

    global.systems.alias.remove(global.systems.alias, owner, '!한국어')
    await message.isSent('alias.alias-was-removed', owner, { alias: '한국어', sender: owner.username })
  })

  it('!русский', async () => {
    global.systems.alias.add(global.systems.alias, owner, 'viewer !русский !me')
    await message.isSent('alias.alias-was-added', owner, { alias: 'русский', command: 'me', sender: owner.username })

    global.systems.alias.remove(global.systems.alias, owner, '!русский')
    await message.isSent('alias.alias-was-removed', owner, { alias: 'русский', sender: owner.username })
  })

  it('2x - !a !me', async () => {
    global.systems.alias.add(global.systems.alias, owner, 'viewer !a !me')
    await message.isSent('alias.alias-was-added', owner, { alias: 'a', command: 'me', sender: owner.username })

    global.systems.alias.remove(global.systems.alias, owner, '!a')
    await message.isSent('alias.alias-was-removed', owner, { alias: 'a', sender: owner.username })

    global.systems.alias.remove(global.systems.alias, owner, '!a')
    await message.isSent('alias.alias-was-not-found', owner, { alias: 'a', sender: owner.username })
  })
})

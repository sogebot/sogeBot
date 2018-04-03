/* global describe it beforeEach */
if (require('cluster').isWorker) process.exit()

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Alias - add()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()
  })

  it('', async () => {
    global.systems.alias.add(global.systems.alias, owner, '')
    await message.isSent('alias.alias-parse-failed', owner, { sender: owner.username })
  })

  it('!alias', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!alias')
    await message.isSent('alias.alias-parse-failed', owner, { sender: owner.username })
  })

  it('alias', async () => {
    global.systems.alias.add(global.systems.alias, owner, 'alias')
    await message.isSent('alias.alias-parse-failed', owner, { sender: owner.username })
  })

  it('!alias asd', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!alias asd')
    await message.isSent('alias.alias-parse-failed', owner, { sender: owner.username })
  })

  it('alias !asd', async () => {
    global.systems.alias.add(global.systems.alias, owner, 'alias !asd')
    await message.isSent('alias.alias-parse-failed', owner, { sender: owner.username })
  })

  it('!a !me', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!a !me')
    await message.isSent('alias.alias-was-added', owner, { alias: 'a', command: 'me', sender: owner.username })
  })

  it('!한국어 !me', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!한국어 !me')
    await message.isSent('alias.alias-was-added', owner, { alias: '한국어', command: 'me', sender: owner.username })
  })

  it('!русский !me', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!русский !me')
    await message.isSent('alias.alias-was-added', owner, { alias: 'русский', command: 'me', sender: owner.username })
  })

  it('!a with spaces !top messages', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!a with spaces !top messages')
    await message.isSent('alias.alias-was-added', owner, { alias: 'a with spaces', command: 'top messages', sender: owner.username })
  })

  it('2x - !a !me', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!a !me')
    await message.isSent('alias.alias-was-added', owner, { alias: 'a', command: 'me', sender: owner.username })

    global.systems.alias.add(global.systems.alias, owner, '!a !me')
    await message.isSent('alias.alias-was-added', owner, { alias: 'a', command: 'me', sender: owner.username })
  })
})

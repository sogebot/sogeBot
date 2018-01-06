/* global describe it beforeEach */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Alias - add()', () => {
  beforeEach(async () => {
    global.commons.sendMessage.reset()
    await db.cleanup()
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

  it('!한국어 !me', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!한국어 !me')
    await message.isSent('alias.alias-was-added', owner, { alias: '한국어', command: 'me' })
  })

  it('!русский !me', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!русский !me')
    await message.isSent('alias.alias-was-added', owner, { alias: 'русский', command: 'me' })
  })

  it('!a with spaces !top messages', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!a with spaces !top messages')
    await message.isSent('alias.alias-was-added', owner, { alias: 'a with spaces', command: 'top messages' })
  })

  it('2x - !a !me', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!a !me')
    await message.isSent('alias.alias-was-added', owner, { alias: 'a', command: 'me' })

    global.systems.alias.add(global.systems.alias, owner, '!a !me')
    await message.isSent('core.isRegistered', owner, { keyword: 'a' })
  })
})

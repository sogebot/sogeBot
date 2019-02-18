/* global describe it beforeEach */
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
    global.systems.alias.add({ sender: owner, parameters: '' })
    await message.isSent('alias.alias-parse-failed', owner, { sender: owner.username })
  })

  it('!alias', async () => {
    global.systems.alias.add({ sender: owner, parameters: '!alias' })
    await message.isSent('alias.alias-parse-failed', owner, { sender: owner.username })
  })

  it('alias', async () => {
    global.systems.alias.add({ sender: owner, parameters: 'alias' })
    await message.isSent('alias.alias-parse-failed', owner, { sender: owner.username })
  })

  it('!alias asd', async () => {
    global.systems.alias.add({ sender: owner, parameters: '!alias asd' })
    await message.isSent('alias.alias-parse-failed', owner, { sender: owner.username })
  })

  it('alias !asd', async () => {
    global.systems.alias.add({ sender: owner, parameters: 'alias !asd' })
    await message.isSent('alias.alias-parse-failed', owner, { sender: owner.username })
  })

  it('!a !me', async () => {
    global.systems.alias.add({ sender: owner, parameters: 'viewer !a !me' })
    await message.isSent('alias.alias-was-added', owner, { alias: '!a', command: '!me', sender: owner.username })
  })

  it('!한국어 !me', async () => {
    global.systems.alias.add({ sender: owner, parameters: 'viewer !한국어 !me' })
    await message.isSent('alias.alias-was-added', owner, { alias: '!한국어', command: '!me', sender: owner.username })
  })

  it('!русский !me', async () => {
    global.systems.alias.add({ sender: owner, parameters: 'viewer !русский !me' })
    await message.isSent('alias.alias-was-added', owner, { alias: '!русский', command: '!me', sender: owner.username })
  })

  it('!a with spaces !top messages', async () => {
    global.systems.alias.add({ sender: owner, parameters: 'viewer !a with spaces !top messages' })
    await message.isSent('alias.alias-was-added', owner, { alias: '!a with spaces', command: '!top messages', sender: owner.username })
  })

  it('2x - !a !me', async () => {
    global.systems.alias.add({ sender: owner, parameters: 'viewer !a !me' })
    await message.isSent('alias.alias-was-added', owner, { alias: '!a', command: '!me', sender: owner.username })

    global.systems.alias.add({ sender: owner, parameters: 'viewer !a !me' })
    await message.isSent('alias.alias-was-added', owner, { alias: '!a', command: '!me', sender: owner.username })
  })
})

/* global describe it beforeEach */
require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Cooldowns - set()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()
  })

  it('', async () => {
    global.systems.cooldown.main({ sender: owner, parameters: '' })
    await message.isSent('cooldowns.cooldown-parse-failed', owner, { sender: owner.username })
  })

  it('!alias', async () => {
    global.systems.cooldown.main({ sender: owner, parameters: '!alias' })
    await message.isSent('cooldowns.cooldown-parse-failed', owner, { sender: owner.username })
  })

  it('alias', async () => {
    global.systems.cooldown.main({ sender: owner, parameters: 'alias' })
    await message.isSent('cooldowns.cooldown-parse-failed', owner, { sender: owner.username })
  })

  it('test global 20', async () => {
    global.systems.cooldown.main({ sender: owner, parameters: 'test global 20' })
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: 'test', type: 'global', seconds: 20, sender: owner.username })
  })

  it('test user 20', async () => {
    global.systems.cooldown.main({ sender: owner, parameters: 'test user 20' })
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: 'test', type: 'user', seconds: 20, sender: owner.username })
  })

  it('!test global 20', async () => {
    global.systems.cooldown.main({ sender: owner, parameters: '!test global 20' })
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: '!test', type: 'global', seconds: 20, sender: owner.username })
  })

  it('!test user 20', async () => {
    global.systems.cooldown.main({ sender: owner, parameters: '!test user 20' })
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: '!test', type: 'user', seconds: 20, sender: owner.username })
  })

  it('test global 20 true', async () => {
    global.systems.cooldown.main({ sender: owner, parameters: 'test global 20 true' })
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: 'test', type: 'global', seconds: 20, sender: owner.username })
  })

  it('test user 20 true', async () => {
    global.systems.cooldown.main({ sender: owner, parameters: 'test user 20 true' })
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: 'test', type: 'user', seconds: 20, sender: owner.username })
  })

  it('!test global 20 true', async () => {
    global.systems.cooldown.main({ sender: owner, parameters: '!test global 20 true' })
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: '!test', type: 'global', seconds: 20, sender: owner.username })
  })

  it('!test user 20 true', async () => {
    global.systems.cooldown.main({ sender: owner, parameters: '!test user 20 true' })
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: '!test', type: 'user', seconds: 20, sender: owner.username })
  })

  it('!한국어 global 20 true', async () => {
    global.systems.cooldown.main({ sender: owner, parameters: '!한국어 global 20 true' })
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: '!한국어', type: 'global', seconds: 20, sender: owner.username })
  })

  it('!한국어 user 20 true', async () => {
    global.systems.cooldown.main({ sender: owner, parameters: '!한국어 user 20 true' })
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: '!한국어', type: 'user', seconds: 20, sender: owner.username })
  })

  it('한국어 global 20 true', async () => {
    global.systems.cooldown.main({ sender: owner, parameters: '한국어 global 20 true' })
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: '한국어', type: 'global', seconds: 20, sender: owner.username })
  })

  it('한국어 user 20 true', async () => {
    global.systems.cooldown.main({ sender: owner, parameters: '한국어 user 20 true' })
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: '한국어', type: 'user', seconds: 20, sender: owner.username })
  })

  it('!русский global 20 true', async () => {
    global.systems.cooldown.main({ sender: owner, parameters: '!русский global 20 true' })
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: '!русский', type: 'global', seconds: 20, sender: owner.username })
  })

  it('!русский user 20 true', async () => {
    global.systems.cooldown.main({ sender: owner, parameters: '!русский user 20 true' })
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: '!русский', type: 'user', seconds: 20, sender: owner.username })
  })

  it('русский global 20 true', async () => {
    global.systems.cooldown.main({ sender: owner, parameters: 'русский global 20 true' })
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: 'русский', type: 'global', seconds: 20, sender: owner.username })
  })

  it('русский user 20 true', async () => {
    global.systems.cooldown.main({ sender: owner, parameters: 'русский user 20 true' })
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: 'русский', type: 'user', seconds: 20, sender: owner.username })
  })
})

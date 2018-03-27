/* global describe it beforeEach */
if (require('cluster').isWorker) process.exit()

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
    global.systems.cooldown.set(global.systems.cooldown, owner, '')
    await message.isSent('cooldowns.cooldown-parse-failed', owner, { sender: owner.username })
  })

  it('!alias', async () => {
    global.systems.cooldown.set(global.systems.cooldown, owner, '!alias')
    await message.isSent('cooldowns.cooldown-parse-failed', owner, { sender: owner.username })
  })

  it('alias', async () => {
    global.systems.cooldown.set(global.systems.cooldown, owner, 'alias')
    await message.isSent('cooldowns.cooldown-parse-failed', owner, { sender: owner.username })
  })

  it('test global 20', async () => {
    global.systems.cooldown.set(global.systems.cooldown, owner, 'test global 20')
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: 'test', type: 'global', seconds: 20, sender: owner.username })
  })

  it('test user 20', async () => {
    global.systems.cooldown.set(global.systems.cooldown, owner, 'test user 20')
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: 'test', type: 'user', seconds: 20, sender: owner.username })
  })

  it('!test global 20', async () => {
    global.systems.cooldown.set(global.systems.cooldown, owner, '!test global 20')
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: '!test', type: 'global', seconds: 20, sender: owner.username })
  })

  it('!test user 20', async () => {
    global.systems.cooldown.set(global.systems.cooldown, owner, '!test user 20')
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: '!test', type: 'user', seconds: 20, sender: owner.username })
  })

  it('test global 20 true', async () => {
    global.systems.cooldown.set(global.systems.cooldown, owner, 'test global 20 true')
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: 'test', type: 'global', seconds: 20, sender: owner.username })
  })

  it('test user 20 true', async () => {
    global.systems.cooldown.set(global.systems.cooldown, owner, 'test user 20 true')
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: 'test', type: 'user', seconds: 20, sender: owner.username })
  })

  it('!test global 20 true', async () => {
    global.systems.cooldown.set(global.systems.cooldown, owner, '!test global 20 true')
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: '!test', type: 'global', seconds: 20, sender: owner.username })
  })

  it('!test user 20 true', async () => {
    global.systems.cooldown.set(global.systems.cooldown, owner, '!test user 20 true')
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: '!test', type: 'user', seconds: 20, sender: owner.username })
  })

  it('!한국어 global 20 true', async () => {
    global.systems.cooldown.set(global.systems.cooldown, owner, '!한국어 global 20 true')
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: '!한국어', type: 'global', seconds: 20, sender: owner.username })
  })

  it('!한국어 user 20 true', async () => {
    global.systems.cooldown.set(global.systems.cooldown, owner, '!한국어 user 20 true')
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: '!한국어', type: 'user', seconds: 20, sender: owner.username })
  })

  it('한국어 global 20 true', async () => {
    global.systems.cooldown.set(global.systems.cooldown, owner, '한국어 global 20 true')
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: '한국어', type: 'global', seconds: 20, sender: owner.username })
  })

  it('한국어 user 20 true', async () => {
    global.systems.cooldown.set(global.systems.cooldown, owner, '한국어 user 20 true')
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: '한국어', type: 'user', seconds: 20, sender: owner.username })
  })

  it('!русский global 20 true', async () => {
    global.systems.cooldown.set(global.systems.cooldown, owner, '!русский global 20 true')
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: '!русский', type: 'global', seconds: 20, sender: owner.username })
  })

  it('!русский user 20 true', async () => {
    global.systems.cooldown.set(global.systems.cooldown, owner, '!русский user 20 true')
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: '!русский', type: 'user', seconds: 20, sender: owner.username })
  })

  it('русский global 20 true', async () => {
    global.systems.cooldown.set(global.systems.cooldown, owner, 'русский global 20 true')
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: 'русский', type: 'global', seconds: 20, sender: owner.username })
  })

  it('русский user 20 true', async () => {
    global.systems.cooldown.set(global.systems.cooldown, owner, 'русский user 20 true')
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: 'русский', type: 'user', seconds: 20, sender: owner.username })
  })
})

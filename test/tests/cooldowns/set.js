/* global describe it beforeEach */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Cooldowns - set()', () => {
  beforeEach(async () => {
    global.commons.sendMessage.reset()
    await db.cleanup()
  })

  it('', async () => {
    global.systems.cooldown.set(global.systems.cooldown, owner, '')
    await message.isSent('cooldowns.cooldown-parse-failed', owner)
  })

  it('!alias', async () => {
    global.systems.cooldown.set(global.systems.cooldown, owner, '!alias')
    await message.isSent('cooldowns.cooldown-parse-failed', owner)
  })

  it('alias', async () => {
    global.systems.cooldown.set(global.systems.cooldown, owner, 'alias')
    await message.isSent('cooldowns.cooldown-parse-failed', owner)
  })

  it('test global 20', async () => {
    global.systems.cooldown.set(global.systems.cooldown, owner, 'test global 20')
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: 'test', type: 'global', seconds: 20 })
  })

  it('test user 20', async () => {
    global.systems.cooldown.set(global.systems.cooldown, owner, 'test user 20')
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: 'test', type: 'user', seconds: 20 })
  })

  it('!test global 20', async () => {
    global.systems.cooldown.set(global.systems.cooldown, owner, '!test global 20')
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: '!test', type: 'global', seconds: 20 })
  })

  it('!test user 20', async () => {
    global.systems.cooldown.set(global.systems.cooldown, owner, '!test user 20')
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: '!test', type: 'user', seconds: 20 })
  })

  it('test global 20 true', async () => {
    global.systems.cooldown.set(global.systems.cooldown, owner, 'test global 20 true')
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: 'test', type: 'global', seconds: 20 })
  })

  it('test user 20 true', async () => {
    global.systems.cooldown.set(global.systems.cooldown, owner, 'test user 20 true')
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: 'test', type: 'user', seconds: 20 })
  })

  it('!test global 20 true', async () => {
    global.systems.cooldown.set(global.systems.cooldown, owner, '!test global 20 true')
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: '!test', type: 'global', seconds: 20 })
  })

  it('!test user 20 true', async () => {
    global.systems.cooldown.set(global.systems.cooldown, owner, '!test user 20 true')
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: '!test', type: 'user', seconds: 20 })
  })
})

/* global describe it beforeEach */
if (require('cluster').isWorker) process.exit()

const assert = require('chai').assert
require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Alias - run()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()
  })

  it('!a will show !duel', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!a !duel')
    await message.isSent('alias.alias-was-added', owner, { alias: 'a', command: 'duel', sender: owner.username })

    global.systems.alias.run(global.systems.alias, owner, '!a')
    await message.process('!duel', owner)

    global.systems.alias.remove(global.systems.alias, owner, '!a')
    await message.isSent('alias.alias-was-removed', owner, { alias: 'a', sender: owner.username })

    assert.isEmpty(global.systems.alias.run(global.systems.alias, owner, '!a'))
  })

  it('#668 - alias is case insensitive', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!a !duel')
    await message.isSent('alias.alias-was-added', owner, { alias: 'a', command: 'duel', sender: owner.username })

    global.systems.alias.run(global.systems.alias, owner, '!A')
    await message.process('!duel', owner)

    global.systems.alias.remove(global.systems.alias, owner, '!a')
    await message.isSent('alias.alias-was-removed', owner, { alias: 'a', sender: owner.username })

    assert.isEmpty(global.systems.alias.run(global.systems.alias, owner, '!a'))
  })

  it('!a with spaces - will show !duel', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!a with spaces !duel')
    await message.isSent('alias.alias-was-added', owner, { alias: 'a with spaces', command: 'duel', sender: owner.username })

    global.systems.alias.run(global.systems.alias, owner, '!a with spaces')
    await message.process('!duel', owner)

    global.systems.alias.remove(global.systems.alias, owner, '!a with spaces')
    await message.isSent('alias.alias-was-removed', owner, { alias: 'a with spaces', sender: owner.username })

    assert.isEmpty(global.systems.alias.run(global.systems.alias, owner, '!a with spaces'))
  })

  it('!한국어 - will show !duel', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!한국어 !duel')
    await message.isSent('alias.alias-was-added', owner, { alias: '한국어', command: 'duel', sender: owner.username })

    global.systems.alias.run(global.systems.alias, owner, '!한국어')
    await message.process('!duel', owner)

    global.systems.alias.remove(global.systems.alias, owner, '!한국어')
    await message.isSent('alias.alias-was-removed', owner, { alias: '한국어', sender: owner.username })

    assert.isEmpty(global.systems.alias.run(global.systems.alias, owner, '!한국어'))
  })

  it('!русский - will show !duel', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!русский !duel')
    await message.isSent('alias.alias-was-added', owner, { alias: 'русский', command: 'duel', sender: owner.username })

    global.systems.alias.run(global.systems.alias, owner, '!русский')
    await message.process('!duel', owner)

    global.systems.alias.remove(global.systems.alias, owner, '!русский')
    await message.isSent('alias.alias-was-removed', owner, { alias: 'русский', sender: owner.username })

    assert.isEmpty(global.systems.alias.run(global.systems.alias, owner, '!русский'))
  })
})

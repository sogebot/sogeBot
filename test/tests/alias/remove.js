/* global describe it beforeEach */

const assert = require('chai').assert
require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Alias - remove()', () => {
  beforeEach(async () => {
    global.commons.sendMessage.reset()
    await db.cleanup()
  })

  it('', async () => {
    global.systems.alias.remove(global.systems.alias, owner, '')
    await message.isSent('alias.alias-parse-failed', owner)
  })

  it('!alias', async () => {
    global.systems.alias.remove(global.systems.alias, owner, '!alias')
    await message.isSent('alias.alias-was-not-found', owner, { alias: 'alias' })
  })

  it('alias', async () => {
    global.systems.alias.remove(global.systems.alias, owner, 'alias')
    await message.isSent('alias.alias-parse-failed', owner)
  })

  it('!a', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!a !me')
    await message.isSent('alias.alias-was-added', owner, { alias: 'a', command: 'me' })

    global.systems.alias.remove(global.systems.alias, owner, '!a')
    await message.isSent('alias.alias-was-removed', owner, { alias: 'a' })

    // !a is not registered anymore
    assert.isUndefined(global.parser.registeredCmds['!a'])
  })

  it('!a with spaces', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!a with spaces !me')
    await message.isSent('alias.alias-was-added', owner, { alias: 'a with spaces', command: 'me' })

    global.systems.alias.remove(global.systems.alias, owner, '!a with spaces')
    await message.isSent('alias.alias-was-removed', owner, { alias: 'a with spaces' })

    // !a is not registered anymore
    assert.isUndefined(global.parser.registeredCmds['!a with spaces'])
  })

  it('!한국어', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!한국어 !me')
    await message.isSent('alias.alias-was-added', owner, { alias: '한국어', command: 'me' })

    global.systems.alias.remove(global.systems.alias, owner, '!한국어')
    await message.isSent('alias.alias-was-removed', owner, { alias: '한국어' })

    // !a is not registered anymore
    assert.isUndefined(global.parser.registeredCmds['!한국어'])
  })

  it('!русский', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!русский !me')
    await message.isSent('alias.alias-was-added', owner, { alias: 'русский', command: 'me' })

    global.systems.alias.remove(global.systems.alias, owner, '!русский')
    await message.isSent('alias.alias-was-removed', owner, { alias: 'русский' })

    // !a is not registered anymore
    assert.isUndefined(global.parser.registeredCmds['!русский'])
  })

  it('2x - !a !me', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!a !me')
    await message.isSent('alias.alias-was-added', owner, { alias: 'a', command: 'me' })

    global.systems.alias.remove(global.systems.alias, owner, '!a')
    await message.isSent('alias.alias-was-removed', owner, { alias: 'a' })

    global.systems.alias.remove(global.systems.alias, owner, '!a')
    await message.isSent('alias.alias-was-not-found', owner, { alias: 'a' })
  })
})

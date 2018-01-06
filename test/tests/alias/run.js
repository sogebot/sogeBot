/* global describe it beforeEach */

const assert = require('chai').assert
require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Alias - run()', () => {
  beforeEach(async () => {
    global.commons.sendMessage.reset()
    await db.cleanup()
  })

  it('!a will show !duel', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!a !duel')
    await message.isSent('alias.alias-was-added', owner, { alias: 'a', command: 'duel' })

    global.parser.parse(owner, '!a')
    await message.isSent('gambling.duel.notEnoughOptions', owner, { })

    global.systems.alias.remove(global.systems.alias, owner, '!a')
    await message.isSent('alias.alias-was-removed', owner, { alias: 'a' })

    // !a is not registered anymore
    assert.isUndefined(global.parser.registeredCmds['!a'])
  })

  it('#668 - alias is case insensitive', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!test !duel')
    await message.isSent('alias.alias-was-added', owner, { alias: 'test', command: 'duel' })

    global.parser.parse(owner, '!TEST')
    await message.isSent('gambling.duel.notEnoughOptions', owner, { })

    global.systems.alias.remove(global.systems.alias, owner, '!test')
    await message.isSent('alias.alias-was-removed', owner, { alias: 'test' })

    // !a is not registered anymore
    assert.isUndefined(global.parser.registeredCmds['!test'])
  })

  it('!a with spaces - will show !duel', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!a with spaces !duel')
    await message.isSent('alias.alias-was-added', owner, { alias: 'a with spaces', command: 'duel' })

    global.parser.parse(owner, '!a with spaces')
    await message.isSent('gambling.duel.notEnoughOptions', owner, { })

    global.systems.alias.remove(global.systems.alias, owner, '!a with spaces')
    await message.isSent('alias.alias-was-removed', owner, { alias: 'a with spaces' })

    // !a is not registered anymore
    assert.isUndefined(global.parser.registeredCmds['!a with spaces'])
  })

  it('!한국어 - will show !duel', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!한국어 !duel')
    await message.isSent('alias.alias-was-added', owner, { alias: '한국어', command: 'duel' })

    global.parser.parse(owner, '!한국어')
    await message.isSent('gambling.duel.notEnoughOptions', owner, { })

    global.systems.alias.remove(global.systems.alias, owner, '!한국어')
    await message.isSent('alias.alias-was-removed', owner, { alias: '한국어' })

    // !a is not registered anymore
    assert.isUndefined(global.parser.registeredCmds['!a with spaces'])
  })

  it('!русский - will show !duel', async () => {
    global.systems.alias.add(global.systems.alias, owner, '!русский !duel')
    await message.isSent('alias.alias-was-added', owner, { alias: 'русский', command: 'duel' })

    global.parser.parse(owner, '!русский')
    await message.isSent('gambling.duel.notEnoughOptions', owner, { })

    global.systems.alias.remove(global.systems.alias, owner, '!русский')
    await message.isSent('alias.alias-was-removed', owner, { alias: 'русский' })

    // !a is not registered anymore
    assert.isUndefined(global.parser.registeredCmds['!русский'])
  })
})

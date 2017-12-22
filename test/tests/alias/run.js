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
})

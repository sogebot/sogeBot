/* global describe it beforeEach */

const assert = require('chai').assert
require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Custom Commands - run()', () => {
  beforeEach(async () => {
    global.commons.sendMessage.reset()
    await db.cleanup()
  })

  it('!a will show Lorem Ipsum', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, '!a Lorem Ipsum')
    await message.isSent('customcmds.command-was-added', owner, { command: 'a', response: 'Lorem Ipsum' })

    global.parser.parse(owner, '!a')
    await message.isSentRaw('Lorem Ipsum', owner)

    global.systems.customCommands.remove(global.systems.customCommands, owner, '!a')
    await message.isSent('customcmds.command-was-removed', owner, { command: 'a' })

    // !a is not registered anymore
    assert.isUndefined(global.parser.registeredCmds['!a'])
  })
})

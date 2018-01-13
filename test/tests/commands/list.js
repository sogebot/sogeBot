/* global describe it beforeEach */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const tmi = require('../../general.js').tmi

// users
const owner = { username: 'soge__' }

describe('Custom Commands - list()', () => {
  beforeEach(async () => {
    global.commons.sendMessage.reset()
    await db.cleanup()
  })

  it('empty list', async () => {
    global.systems.customCommands.list(global.systems.customCommands, owner, '')
    await message.isSent('customcmds.list-is-empty', owner)
  })

  it('populated list', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, '!a !me')
    await message.isSent('customcmds.command-was-added', owner, { command: 'a' })

    global.systems.customCommands.add(global.systems.customCommands, owner, '!b !me')
    await message.isSent('customcmds.command-was-added', owner, { command: 'b' })

    global.systems.customCommands.list(global.systems.customCommands, owner, '')
    await message.isSent('customcmds.list-is-not-empty', owner, { list: '!a, !b' })
  })
})

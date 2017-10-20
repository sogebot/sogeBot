/* global describe it beforeEach */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Custom Commands - edit()', () => {
  beforeEach(async () => {
    global.commons.sendMessage.reset()
    await db.cleanup()
  })

  it('', async () => {
    global.systems.customCommands.edit(global.systems.customCommands, owner, '')
    await message.isSent('customcmds.commands-parse-failed', owner)
  })

  it('!a', async () => {
    global.systems.customCommands.edit(global.systems.customCommands, owner, '!a')
    await message.isSent('customcmds.commands-parse-failed', owner)
  })

  it('!unknown Lorem Ipsum', async () => {
    global.systems.customCommands.edit(global.systems.customCommands, owner, '!unknown Lorem Ipsum')
    await message.isSent('customcmds.command-was-not-found', owner, { command: 'unknown' })
  })

  it('!a Lorem Ipsum -> !a Ipsum Lorem', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, '!a Lorem Ipsum')
    await message.isSent('customcmds.command-was-added', owner, { command: 'a', response: 'Lorem Ipsum' })

    global.parser.parse(owner, '!a')
    await message.isSentRaw('Lorem Ipsum', owner)

    global.systems.customCommands.edit(global.systems.customCommands, owner, '!a Ipsum Lorem')
    await message.isSent('customcmds.command-was-edited', owner, { command: 'a', response: 'Ipsum Lorem' })

    global.parser.parse(owner, '!a')
    await message.isSentRaw('Ipsum Lorem', owner)
  })
})

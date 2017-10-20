/* global describe it beforeEach */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Custom Commands - visible()', () => {
  beforeEach(async () => {
    global.commons.sendMessage.reset()
    await db.cleanup()
  })

  it('', async () => {
    global.systems.customCommands.visible(global.systems.customCommands, owner, '')
    await message.isSent('customcmds.commands-parse-failed', owner)
  })

  it('!unknown', async () => {
    global.systems.customCommands.visible(global.systems.customCommands, owner, '!unknown')
    await message.isSent('customcmds.command-was-not-found', owner, { command: 'unknown' })
  })

  it('!a', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, '!a !uptime')
    await message.isSent('customcmds.command-was-added', owner, { command: 'a' })

    global.systems.customCommands.visible(global.systems.customCommands, owner, '!a')
    await message.isSent('customcmds.command-was-concealed', owner, { command: 'a' })

    global.systems.customCommands.visible(global.systems.customCommands, owner, '!a')
    await message.isSent('customcmds.command-was-exposed', owner, { command: 'a' })
  })
})

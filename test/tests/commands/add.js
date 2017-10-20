/* global describe it beforeEach */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Custom Commands - add()', () => {
  beforeEach(async () => {
    global.commons.sendMessage.reset()
    await db.cleanup()
  })

  it('', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, '')
    await message.isSent('customcmds.commands-parse-failed', owner)
  })

  it('!alias', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, '!alias')
    await message.isSent('customcmds.commands-parse-failed', owner)
  })

  it('alias', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, 'alias')
    await message.isSent('customcmds.commands-parse-failed', owner)
  })

  it('!new asd', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, '!new asd')
    await message.isSent('customcmds.command-was-added', owner, { command: 'new' })

    global.parser.parse(owner, '!new')
    await message.isSentRaw('asd', owner)
  })

  it('alias !asd', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, 'alias !asd')
    await message.isSent('customcmds.commands-parse-failed', owner)
  })

  it('!alias !me', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, '!alias !me')
    await message.isSent('core.isRegistered', owner, { keyword: 'alias' })
  })

  it('2x - !a Lorem Ipsum', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, '!a Lorem Ipsum')
    await message.isSent('customcmds.command-was-added', owner, { response: 'Lorem Ipsum', command: 'a' })

    global.systems.customCommands.add(global.systems.customCommands, owner, '!a me')
    await message.isSent('core.isRegistered', owner, { keyword: 'a' })
  })
})

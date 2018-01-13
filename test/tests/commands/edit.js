/* global describe it beforeEach */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const tmi = require('../../general.js').tmi

// users
const owner = { username: 'soge__' }

describe('Custom Commands - edit()', () => {
  beforeEach(async () => {
    await tmi.waitForConnection()
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

  it('!한글 Lorem Ipsum -> !a Ipsum Lorem', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, '!한글 Lorem Ipsum')
    await message.isSent('customcmds.command-was-added', owner, { command: '한글', response: 'Lorem Ipsum' })

    global.parser.parse(owner, '!한글')
    await message.isSentRaw('Lorem Ipsum', owner)

    global.systems.customCommands.edit(global.systems.customCommands, owner, '!한글 Ipsum Lorem')
    await message.isSent('customcmds.command-was-edited', owner, { command: '한글', response: 'Ipsum Lorem' })

    global.parser.parse(owner, '!한글')
    await message.isSentRaw('Ipsum Lorem', owner)
  })

  it('!русский Lorem Ipsum -> !a Ipsum Lorem', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, '!русский Lorem Ipsum')
    await message.isSent('customcmds.command-was-added', owner, { command: 'русский', response: 'Lorem Ipsum' })

    global.parser.parse(owner, '!русский')
    await message.isSentRaw('Lorem Ipsum', owner)

    global.systems.customCommands.edit(global.systems.customCommands, owner, '!русский Ipsum Lorem')
    await message.isSent('customcmds.command-was-edited', owner, { command: 'русский', response: 'Ipsum Lorem' })

    global.parser.parse(owner, '!русский')
    await message.isSentRaw('Ipsum Lorem', owner)
  })
})

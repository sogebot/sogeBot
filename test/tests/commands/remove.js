/* global describe it beforeEach */
require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Custom Commands - remove()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()
  })

  it('', async () => {
    global.systems.customCommands.remove({ sender: owner, parameters: '' })
    await message.isSent('customcmds.commands-parse-failed', owner, { sender: owner.username })
  })

  it('!alias', async () => {
    global.systems.customCommands.remove({ sender: owner, parameters: '!alias' })
    await message.isSent('customcmds.command-was-not-found', owner, { command: '!alias', sender: owner.username })
  })

  it('alias', async () => {
    global.systems.customCommands.remove({ sender: owner, parameters: 'alias' })
    await message.isSent('customcmds.commands-parse-failed', owner, { sender: owner.username })
  })

  it('!a', async () => {
    global.systems.customCommands.add({ sender: owner, parameters: '-c !a -r !me' })
    await message.isSent('customcmds.command-was-added', owner, { command: '!a', response: '!me', sender: owner.username })

    global.systems.customCommands.remove({ sender: owner, parameters: '!a' })
    await message.isSent('customcmds.command-was-removed', owner, { command: '!a', sender: owner.username })
  })

  it('!한글', async () => {
    global.systems.customCommands.add({ sender: owner, parameters: '-c !한글 -r !me' })
    await message.isSent('customcmds.command-was-added', owner, { command: '!한글', response: '!me', sender: owner.username })

    global.systems.customCommands.remove({ sender: owner, parameters: '!한글' })
    await message.isSent('customcmds.command-was-removed', owner, { command: '!한글', sender: owner.username })
  })

  it('!русский', async () => {
    global.systems.customCommands.add({ sender: owner, parameters: '-c !русский -r !me' })
    await message.isSent('customcmds.command-was-added', owner, { command: '!русский', response: '!me', sender: owner.username })

    global.systems.customCommands.remove({ sender: owner, parameters: '!русский' })
    await message.isSent('customcmds.command-was-removed', owner, { command: '!русский', sender: owner.username })
  })

  it('2x - !a !me', async () => {
    global.systems.customCommands.add({ sender: owner, parameters: '-c !a -r !me' })
    await message.isSent('customcmds.command-was-added', owner, { command: '!a', response: '!me', sender: owner.username })

    global.systems.customCommands.remove({ sender: owner, parameters: '!a' })
    await message.isSent('customcmds.command-was-removed', owner, { command: '!a', sender: owner.username })

    global.systems.customCommands.remove({ sender: owner, parameters: '!a' })
    await message.isSent('customcmds.command-was-not-found', owner, { command: '!a', sender: owner.username })
  })
})

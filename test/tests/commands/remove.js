/* global describe it beforeEach */

const assert = require('chai').assert
require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const tmi = require('../../general.js').tmi

// users
const owner = { username: 'soge__' }

describe('Custom Commands - remove()', () => {
  beforeEach(async () => {
    await tmi.waitForConnection()
    global.commons.sendMessage.reset()
    await db.cleanup()
  })

  it('', async () => {
    global.systems.customCommands.remove(global.systems.customCommands, owner, '')
    await message.isSent('customcmds.commands-parse-failed', owner)
  })

  it('!alias', async () => {
    global.systems.customCommands.remove(global.systems.customCommands, owner, '!alias')
    await message.isSent('customcmds.command-was-not-found', owner, { command: 'alias' })
  })

  it('alias', async () => {
    global.systems.customCommands.remove(global.systems.customCommands, owner, 'alias')
    await message.isSent('customcmds.commands-parse-failed', owner)
  })

  it('!a', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, '!a !me')
    await message.isSent('customcmds.command-was-added', owner, { command: 'a', response: '!me' })

    global.systems.customCommands.remove(global.systems.customCommands, owner, '!a')
    await message.isSent('customcmds.command-was-removed', owner, { command: 'a' })

    // !a is not registered anymore
    assert.isUndefined(global.parser.registeredCmds['!a'])
  })

  it('!한글', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, '!한글 !me')
    await message.isSent('customcmds.command-was-added', owner, { command: '한글', response: '!me' })

    global.systems.customCommands.remove(global.systems.customCommands, owner, '!한글')
    await message.isSent('customcmds.command-was-removed', owner, { command: '한글' })

    // !a is not registered anymore
    assert.isUndefined(global.parser.registeredCmds['!한글'])
  })

  it('!русский', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, '!русский !me')
    await message.isSent('customcmds.command-was-added', owner, { command: 'русский', response: '!me' })

    global.systems.customCommands.remove(global.systems.customCommands, owner, '!русский')
    await message.isSent('customcmds.command-was-removed', owner, { command: 'русский' })

    // !a is not registered anymore
    assert.isUndefined(global.parser.registeredCmds['!русский'])
  })

  it('2x - !a !me', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, '!a !me')
    await message.isSent('customcmds.command-was-added', owner, { command: 'a', response: '!me' })

    global.systems.customCommands.remove(global.systems.customCommands, owner, '!a')
    await message.isSent('customcmds.command-was-removed', owner, { command: 'a' })

    global.systems.customCommands.remove(global.systems.customCommands, owner, '!a')
    await message.isSent('customcmds.command-was-not-found', owner, { command: 'a' })
  })
})

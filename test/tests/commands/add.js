/* global describe it beforeEach */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const tmi = require('../../general.js').tmi

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

  it('!cmd', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, '!cmd')
    await message.isSent('customcmds.commands-parse-failed', owner)
  })

  it('cmd', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, 'cmd')
    await message.isSent('customcmds.commands-parse-failed', owner)
  })

  it('cmd !asd', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, 'cmd !asd')
    await message.isSent('customcmds.commands-parse-failed', owner)
  })

  it('2x - !a Lorem Ipsum', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, '!a Lorem Ipsum')
    await message.isSent('customcmds.command-was-added', owner, { response: 'Lorem Ipsum', command: 'a' })

    global.systems.customCommands.add(global.systems.customCommands, owner, '!a me')
    await message.isSent('core.isRegistered', owner, { keyword: 'a' })
  })

  it('!cmd this is command response', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, '!cmd this is command response')
    await message.isSent('customcmds.command-was-added', owner, { response: 'this is command response', command: 'cmd' })

    global.parser.parse(owner, '!cmd')
    await message.isSentRaw('this is command response', owner)
  })

  it('!한국어 this is command response', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, '!한국어 this is command response')
    await message.isSent('customcmds.command-was-added', owner, { response: 'this is command response', command: '한국어' })

    global.parser.parse(owner, '!한국어')
    await message.isSentRaw('this is command response', owner)
  })

  it('!русский this is command response', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, '!русский this is command response')
    await message.isSent('customcmds.command-was-added', owner, { response: 'this is command response', command: 'русский' })

    global.parser.parse(owner, '!русский')
    await message.isSentRaw('this is command response', owner)
  })
})

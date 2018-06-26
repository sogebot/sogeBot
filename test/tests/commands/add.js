/* global describe it beforeEach */
if (require('cluster').isWorker) process.exit()

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Custom Commands - add()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()
  })

  it('', async () => {
    global.systems.customCommands.add({ sender: owner, parameters: '' })
    await message.isSent('customcmds.commands-parse-failed', owner, { sender: owner.username })
  })

  it('!cmd', async () => {
    global.systems.customCommands.add({ sender: owner, parameters: '!cmd' })
    await message.isSent('customcmds.commands-parse-failed', owner, { sender: owner.username })
  })

  it('cmd', async () => {
    global.systems.customCommands.add({ sender: owner, parameters: 'cmd' })
    await message.isSent('customcmds.commands-parse-failed', owner, { sender: owner.username })
  })

  it('cmd !asd', async () => {
    global.systems.customCommands.add({ sender: owner, parameters: 'cmd !asd' })
    await message.isSent('customcmds.commands-parse-failed', owner, { sender: owner.username })
  })

  it('2x - !a Lorem Ipsum', async () => {
    global.systems.customCommands.add({ sender: owner, parameters: 'viewer !a Lorem Ipsum' })
    await message.isSent('customcmds.command-was-added', owner, { response: 'Lorem Ipsum', command: '!a', sender: owner.username })

    global.systems.customCommands.add({ sender: owner, parameters: 'viewer !a me' })
    await message.isSent('customcmds.command-was-added', owner, { response: 'Lorem Ipsum', command: '!a', sender: owner.username })
  })

  it('!cmd this is command response', async () => {
    global.systems.customCommands.add({ sender: owner, parameters: 'viewer !cmd this is command response' })
    await message.isSent('customcmds.command-was-added', owner, { response: 'this is command response', command: '!cmd', sender: owner.username })

    global.systems.customCommands.run({ sender: owner, message: '!cmd' })
    await message.isSentRaw('this is command response', owner)
  })

  it('!한국어 this is command response', async () => {
    global.systems.customCommands.add({ sender: owner, parameters: 'viewer !한국어 this is command response' })
    await message.isSent('customcmds.command-was-added', owner, { response: 'this is command response', command: '!한국어', sender: owner.username })

    global.systems.customCommands.run({ sender: owner, message: '!한국어' })
    await message.isSentRaw('this is command response', owner)
  })

  it('!русский this is command response', async () => {
    global.systems.customCommands.add({ sender: owner, parameters: 'viewer !русский this is command response' })
    await message.isSent('customcmds.command-was-added', owner, { response: 'this is command response', command: '!русский', sender: owner.username })

    global.systems.customCommands.run({ sender: owner, message: '!русский' })
    await message.isSentRaw('this is command response', owner)
  })
})

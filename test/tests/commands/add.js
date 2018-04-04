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
    global.systems.customCommands.add(global.systems.customCommands, owner, '')
    await message.isSent('customcmds.commands-parse-failed', owner, { sender: owner.username })
  })

  it('!cmd', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, '!cmd')
    await message.isSent('customcmds.commands-parse-failed', owner, { sender: owner.username })
  })

  it('cmd', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, 'cmd')
    await message.isSent('customcmds.commands-parse-failed', owner, { sender: owner.username })
  })

  it('cmd !asd', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, 'cmd !asd')
    await message.isSent('customcmds.commands-parse-failed', owner, { sender: owner.username })
  })

  it('2x - !a Lorem Ipsum', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, 'viewer !a Lorem Ipsum')
    await message.isSent('customcmds.command-was-added', owner, { response: 'Lorem Ipsum', command: 'a', sender: owner.username })

    global.systems.customCommands.add(global.systems.customCommands, owner, 'viewer !a me')
    await message.isSent('customcmds.command-was-added', owner, { response: 'Lorem Ipsum', command: 'a', sender: owner.username })
  })

  it('!cmd this is command response', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, 'viewer !cmd this is command response')
    await message.isSent('customcmds.command-was-added', owner, { response: 'this is command response', command: 'cmd', sender: owner.username })

    global.systems.customCommands.run(global.systems.customCommands, owner, '!cmd')
    await message.isSentRaw('this is command response', owner)
  })

  it('!한국어 this is command response', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, 'viewer !한국어 this is command response')
    await message.isSent('customcmds.command-was-added', owner, { response: 'this is command response', command: '한국어', sender: owner.username })

    global.systems.customCommands.run(global.systems.customCommands, owner, '!한국어')
    await message.isSentRaw('this is command response', owner)
  })

  it('!русский this is command response', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, 'viewer !русский this is command response')
    await message.isSent('customcmds.command-was-added', owner, { response: 'this is command response', command: 'русский', sender: owner.username })

    global.systems.customCommands.run(global.systems.customCommands, owner, '!русский')
    await message.isSentRaw('this is command response', owner)
  })
})

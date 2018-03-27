/* global describe it beforeEach */
if (require('cluster').isWorker) process.exit()

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Custom Commands - list()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()
  })

  it('empty list', async () => {
    global.systems.customCommands.list(global.systems.customCommands, owner, '')
    await message.isSent('customcmds.list-is-empty', owner, { sender: owner.username })
  })

  it('populated list', async () => {
    global.systems.customCommands.add(global.systems.customCommands, owner, '!a !me')
    await message.isSent('customcmds.command-was-added', owner, { command: 'a', sender: owner.username })

    global.systems.customCommands.add(global.systems.customCommands, owner, '!b !me')
    await message.isSent('customcmds.command-was-added', owner, { command: 'b', sender: owner.username })

    global.systems.customCommands.list(global.systems.customCommands, owner, '')
    await message.isSent('customcmds.list-is-not-empty', owner, { list: '!a, !b', sender: owner.username })
  })
})

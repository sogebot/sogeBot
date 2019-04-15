/* global describe it before */
const {
  isMainThread
} = require('worker_threads');
if (!isMainThread) process.exit()

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

const owner = { username: 'soge__', userId: Math.random() }

describe('Message - $touser filter', async () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()

    await global.db.engine.insert('users', { username: owner.username, id: owner.userId })
    global.systems.customCommands.add({ sender: owner, parameters: '-c !point -r $sender points to $touser'});
    await message.isSent('customcmds.command-was-added', owner, { response: '$sender point to $touser', command: '!point', sender: owner.username })
  })

  it('!point someuser', async () => {
    global.systems.customCommands.run({ sender: owner, message: '!point someuser' })
    await message.isSentRaw('@soge__ points to @someuser', owner)
  })

  it('!point @someuser', async () => {
    global.systems.customCommands.run({ sender: owner, message: '!point @someuser' })
    await message.isSentRaw('@soge__ points to @someuser', owner)
  })

  it('!point', async () => {
    global.systems.customCommands.run({ sender: owner, message: '!point' })
    await message.isSentRaw('@soge__ points to @soge__', owner)
  })

  it('!point @', async () => {
    global.systems.customCommands.run({ sender: owner, message: '!point' })
    await message.isSentRaw('@soge__ points to @soge__', owner)
  })
})

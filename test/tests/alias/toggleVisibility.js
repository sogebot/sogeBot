/* global describe it beforeEach */
require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Alias - toggleVisibility()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()
  })

  it('', async () => {
    global.systems.alias.toggleVisibility({ sender: owner, parameters: '' })
    await message.isSent('alias.alias-parse-failed', owner, { sender: owner.username })
  })

  it('!unknown', async () => {
    global.systems.alias.toggleVisibility({ sender: owner, parameters: '!unknown' })
    await message.isSent('alias.alias-was-not-found', owner, { alias: '!unknown', sender: owner.username })
  })

  it('!a', async () => {
    global.systems.alias.add({ sender: owner, parameters: '-a !a -c !uptime' })
    await message.isSent('alias.alias-was-added', owner, { alias: '!a', command: '!uptime', sender: owner.username })

    global.systems.alias.toggleVisibility({ sender: owner, parameters: '!a' })
    await message.isSent('alias.alias-was-concealed', owner, { alias: '!a', sender: owner.username })

    global.systems.alias.toggleVisibility({ sender: owner, parameters: '!a' })
    await message.isSent('alias.alias-was-exposed', owner, { alias: '!a', sender: owner.username })
  })

  it('!a with spaces', async () => {
    global.systems.alias.add({ sender: owner, parameters: '-a !a with spaces -c !uptime' })
    await message.isSent('alias.alias-was-added', owner, { alias: '!a with spaces', command: '!uptime', sender: owner.username })

    global.systems.alias.toggleVisibility({ sender: owner, parameters: '!a with spaces' })
    await message.isSent('alias.alias-was-concealed', owner, { alias: '!a with spaces', sender: owner.username })

    global.systems.alias.toggleVisibility({ sender: owner, parameters: '!a with spaces' })
    await message.isSent('alias.alias-was-exposed', owner, { alias: '!a with spaces', sender: owner.username })
  })

  it('!한국어', async () => {
    global.systems.alias.add({ sender: owner, parameters: '-a !한국어 -c !uptime' })
    await message.isSent('alias.alias-was-added', owner, { alias: '!한국어', command: '!uptime', sender: owner.username })

    global.systems.alias.toggleVisibility({ sender: owner, parameters: '!한국어' })
    await message.isSent('alias.alias-was-concealed', owner, { alias: '!한국어', sender: owner.username })

    global.systems.alias.toggleVisibility({ sender: owner, parameters: '!한국어' })
    await message.isSent('alias.alias-was-exposed', owner, { alias: '!한국어', sender: owner.username })
  })

  it('!русский', async () => {
    global.systems.alias.add({ sender: owner, parameters: '-a !русский -c !uptime' })
    await message.isSent('alias.alias-was-added', owner, { alias: '!русский', command: '!uptime', sender: owner.username })

    global.systems.alias.toggleVisibility({ sender: owner, parameters: '!русский' })
    await message.isSent('alias.alias-was-concealed', owner, { alias: '!русский', sender: owner.username })

    global.systems.alias.toggleVisibility({ sender: owner, parameters: '!русский' })
    await message.isSent('alias.alias-was-exposed', owner, { alias: '!русский', sender: owner.username })
  })
})

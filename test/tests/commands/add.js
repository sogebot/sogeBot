/* global describe it beforeEach */
if (require('cluster').isWorker) process.exit()

require('../../general.js')

const db = require('../../general.js').db
const assert = require('chai').assert
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }
const viewer = { username: 'viewer' }

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
    global.systems.customCommands.add({ sender: owner, parameters: '!a Lorem Ipsum' })
    await message.isSent('customcmds.command-was-added', owner, { response: 'Lorem Ipsum', command: '!a', sender: owner.username })

    global.systems.customCommands.add({ sender: owner, parameters: '!a me' })
    await message.isSent('customcmds.command-was-added', owner, { response: 'Lorem Ipsum', command: '!a', sender: owner.username })
  })

  it('!cmd this is command response', async () => {
    global.systems.customCommands.add({ sender: owner, parameters: '!cmd this is command response' })
    await message.isSent('customcmds.command-was-added', owner, { response: 'this is command response', command: '!cmd', sender: owner.username })

    let responses = global.systems.customCommands.run({ sender: owner, message: '!cmd' })
    assert.deepEqual(await responses, ['this is command response'])
  })

  it('!한국어 this is command response', async () => {
    global.systems.customCommands.add({ sender: owner, parameters: '!한국어 this is command response' })
    await message.isSent('customcmds.command-was-added', owner, { response: 'this is command response', command: '!한국어', sender: owner.username })

    let responses = global.systems.customCommands.run({ sender: owner, message: '!한국어' })
    assert.deepEqual(await responses, ['this is command response'])
  })

  it('!русский this is command response', async () => {
    global.systems.customCommands.add({ sender: owner, parameters: '!русский this is command response' })
    await message.isSent('customcmds.command-was-added', owner, { response: 'this is command response', command: '!русский', sender: owner.username })

    let responses = global.systems.customCommands.run({ sender: owner, message: '!русский' })
    assert.deepEqual(await responses, ['this is command response'])
  })

  it('-ul owner !cmd this is command response', async () => {
    global.systems.customCommands.add({ sender: owner, parameters: '-ul owner !cmd this is command response' })
    await message.isSent('customcmds.command-was-added', owner, { response: 'this is command response', command: '!cmd', sender: owner.username })

    let responses = global.systems.customCommands.run({ sender: viewer, message: '!cmd' })
    assert.deepEqual(await responses, [])

    responses = global.systems.customCommands.run({ sender: owner, message: '!cmd' })
    assert.deepEqual(await responses, ['this is command response'])
  })

  it('-ul owner !русский this is command response', async () => {
    global.systems.customCommands.add({ sender: owner, parameters: '-ul owner !русский this is command response' })
    await message.isSent('customcmds.command-was-added', owner, { response: 'this is command response', command: '!русский', sender: owner.username })

    let responses = global.systems.customCommands.run({ sender: viewer, message: '!русский' })
    assert.deepEqual(await responses, [])

    responses = global.systems.customCommands.run({ sender: owner, message: '!русский' })
    assert.deepEqual(await responses, ['this is command response'])
  })

  it('-ul owner !한국어 this is command response', async () => {
    global.systems.customCommands.add({ sender: owner, parameters: '-ul owner !한국어 this is command response' })
    await message.isSent('customcmds.command-was-added', owner, { response: 'this is command response', command: '!한국어', sender: owner.username })

    let responses = global.systems.customCommands.run({ sender: viewer, message: '!한국어' })
    assert.deepEqual(await responses, [])

    responses = global.systems.customCommands.run({ sender: owner, message: '!한국어' })
    assert.deepEqual(await responses, ['this is command response'])
  })
})

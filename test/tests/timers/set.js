/* global describe it beforeEach */
const {
  isMainThread
} = require('worker_threads');
if (!isMainThread) process.exit()


const assert = require('chai').assert
require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Timers - set()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()
  })

  it('', async () => {
    global.systems.timers.set({ sender: owner, parameters: '' })
    await message.isSent('timers.name-must-be-defined', owner, { name: 'unknown', sender: owner.username })
  })

  it('-name test', async () => {
    await global.systems.timers.set({ sender: owner, parameters: '-name test' })
    await message.isSent('timers.timer-was-set', owner, { name: 'test', messages: 0, seconds: 60, sender: owner.username })

    let item = await global.db.engine.findOne(global.systems.timers.collection.data, { name: 'test' })
    assert.notEmpty(item)
    assert.equal(item.seconds, 60)
    assert.equal(item.messages, 0)
  })

  it('-name test -seconds 20', async () => {
    await global.systems.timers.set({ sender: owner, parameters: '-name test -seconds 20' })
    await message.isSent('timers.timer-was-set', owner, { name: 'test', messages: 0, seconds: 20, sender: owner.username })

    let item = await global.db.engine.findOne(global.systems.timers.collection.data, { name: 'test' })
    assert.notEmpty(item)
    assert.equal(item.seconds, 20)
    assert.equal(item.messages, 0)
  })

  it('-name test -seconds 0', async () => {
    await global.systems.timers.set({ sender: owner, parameters: '-name test -seconds 0' })
    await message.isSent('timers.cannot-set-messages-and-seconds-0', owner, { sender: owner.username })
    let item = await global.db.engine.findOne(global.systems.timers.collection.data, { name: 'test' })
    assert.empty(item)
  })

  it('-name test -messages 20', async () => {
    await global.systems.timers.set({ sender: owner, parameters: '-name test -messages 20' })
    await message.isSent('timers.timer-was-set', owner, { name: 'test', messages: 20, seconds: 60, sender: owner.username })

    let item = await global.db.engine.findOne(global.systems.timers.collection.data, { name: 'test' })
    assert.notEmpty(item)
    assert.equal(item.seconds, 60)
    assert.equal(item.messages, 20)
  })

  it('-name test -messages 0', async () => {
    await global.systems.timers.set({ sender: owner, parameters: '-name test -messages 0' })
    await message.isSent('timers.timer-was-set', owner, { name: 'test', messages: 0, seconds: 60, sender: owner.username })

    let item = await global.db.engine.findOne(global.systems.timers.collection.data, { name: 'test' })
    assert.notEmpty(item)
    assert.equal(item.seconds, 60)
    assert.equal(item.messages, 0)
  })

  it('-name test -seconds 0 -messages 0', async () => {
    await global.systems.timers.set({ sender: owner, parameters: '-name test -seconds 0 -messages 0' })
    await message.isSent('timers.cannot-set-messages-and-seconds-0', owner, { sender: owner.username })

    let item = await global.db.engine.findOne(global.systems.timers.collection.data, { name: 'test' })
    assert.empty(item)
  })

  it('-name test -seconds 5 -messages 6', async () => {
    await global.systems.timers.set({ sender: owner, parameters: '-name test -seconds 5 -messages 6' })
    await message.isSent('timers.timer-was-set', owner, { name: 'test', messages: 6, seconds: 5, sender: owner.username })

    let item = await global.db.engine.findOne(global.systems.timers.collection.data, { name: 'test' })
    assert.notEmpty(item)
    assert.equal(item.seconds, 5)
    assert.equal(item.messages, 6)
  })
})

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

describe('Timers - unset()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()
    await global.db.engine.insert(global.systems.timers.collection.data, { name: 'test', messages: 0, seconds: 60, enabled: true, trigger: { messages: global.linesParsed, timestamp: new Date().getTime() } })
  })

  it('', async () => {
    global.systems.timers.unset({ sender: owner, parameters: '' })
    await message.isSent('timers.name-must-be-defined', owner, { name: 'unknown', sender: owner.username })
  })
  it('-name test', async () => {
    global.systems.timers.unset({ sender: owner, parameters: '-name test' })
    await message.isSent('timers.timer-deleted', owner, { name: 'test', sender: owner.username })

    let item = await global.db.engine.findOne(global.systems.timers.collection.data, { name: 'test' })
    assert.empty(item)
  })
  it('-name nonexistent', async () => {
    global.systems.timers.unset({ sender: owner, parameters: '-name nonexistent' })
    await message.isSent('timers.timer-not-found', owner, { name: 'nonexistent', sender: owner.username })

    let item = await global.db.engine.findOne(global.systems.timers.collection.data, { name: 'test' })
    assert.notEmpty(item)
    assert.equal(item.seconds, 60)
    assert.equal(item.messages, 0)
  })
})

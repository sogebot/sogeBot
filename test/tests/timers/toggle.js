/* global describe it beforeEach */
require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Timers - toggle()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()
    let timer = await global.db.engine.insert(global.systems.timers.collection.data, { name: 'test', messages: 0, seconds: 60, enabled: true, trigger: { messages: global.linesParsed, timestamp: new Date().getTime() } })
    await global.db.engine.insert(global.systems.timers.collection.responses, { response: 'Lorem Ipsum', timerId: timer._id, enabled: true })
  })

  it('', async () => {
    global.systems.timers.toggle({ sender: owner, parameters: '' })
    await message.isSent('timers.id-or-name-must-be-defined', owner, { sender: owner.username })
  })

  it('-id something -name something', async () => {
    global.systems.timers.toggle({ sender: owner, parameters: '-id something -name something' })
    await message.isSent('timers.id-or-name-must-be-defined', owner, { sender: owner.username })
  })

  it('-id unknown', async () => {
    global.systems.timers.toggle({ sender: owner, parameters: '-id unknown' })
    await message.isSent('timers.response-not-found', owner, { id: 'unknown', sender: owner.username })
  })

  it('-id response_id', async () => {
    let response = await global.db.engine.findOne(global.systems.timers.collection.responses, { response: 'Lorem Ipsum' })
    global.systems.timers.toggle({ sender: owner, parameters: '-id ' + response._id })
    await message.isSent('timers.response-disabled', owner, { id: response._id, sender: owner.username })

    global.systems.timers.toggle({ sender: owner, parameters: '-id ' + response._id })
    await message.isSent('timers.response-enabled', owner, { id: response._id, sender: owner.username })
  })

  it('-name unknown', async () => {
    global.systems.timers.toggle({ sender: owner, parameters: '-name unknown' })
    await message.isSent('timers.timer-not-found', owner, { name: 'unknown', sender: owner.username })
  })

  it('-name test', async () => {
    global.systems.timers.toggle({ sender: owner, parameters: '-name test' })
    await message.isSent('timers.timer-disabled', owner, { name: 'test', sender: owner.username })

    global.systems.timers.toggle({ sender: owner, parameters: '-name test' })
    await message.isSent('timers.timer-enabled', owner, { name: 'test', sender: owner.username })
  })
})

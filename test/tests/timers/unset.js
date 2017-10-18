/* global describe it beforeEach */

const assert = require('chai').assert
const sinon = require('sinon')
require('../../general.js')

const db = require('../../general.js').db
const until = require('test-until')

// users
const owner = { username: 'soge__' }

describe('Timers - unset()', () => {
  beforeEach(async () => {
    await db.cleanup('timers')
    await global.db.engine.insert('timers', {name: 'test', messages: 0, seconds: 60, enabled: true, trigger: { messages: global.parser.linesParsed, timestamp: new Date().getTime() }})
    global.commons.sendMessage.reset()
  })

  it('', async () => {
    global.systems.timers.unset(global.systems.timers, owner, '')

    await until(setError => {
      let expected = global.commons.prepare('timers.name-must-be-defined')
      try {
        assert.isTrue(global.commons.sendMessage.calledWith(expected, sinon.match(owner)))
        return true
      } catch (err) {
        return setError('\nExpected message: ' + expected + '\nActual message: ' + global.commons.sendMessage.lastCall.args[0])
      }
    })
  })
  it('-name test', async () => {
    global.systems.timers.unset(global.systems.timers, owner, '-name test')

    await until(setError => {
      let expected = global.commons.prepare('timers.timer-deleted', { name: 'test' })
      try {
        if (!global.commons.sendMessage.called) return false
        assert.equal(global.commons.sendMessage.lastCall.args[0], expected)
        return true
      } catch (err) {
        return setError('\nExpected message: ' + expected + '\nActual message: ' + global.commons.sendMessage.lastCall.args[0])
      }
    }, 1000)

    let item = await global.db.engine.findOne('timers', { name: 'test' })
    assert.empty(item)
  })
  it('-name nonexistent', async () => {
    global.systems.timers.unset(global.systems.timers, owner, '-name nonexistent')

    await until(setError => {
      let expected = global.commons.prepare('timers.timer-not-found', { name: 'nonexistent' })
      try {
        if (!global.commons.sendMessage.called) return false
        assert.equal(global.commons.sendMessage.lastCall.args[0], expected)
        return true
      } catch (err) {
        return setError('\nExpected message: ' + expected + '\nActual message: ' + global.commons.sendMessage.lastCall.args[0])
      }
    }, 1000)

    let item = await global.db.engine.findOne('timers', { name: 'test' })
    assert.notEmpty(item)
    assert.equal(item.seconds, 60)
    assert.equal(item.messages, 0)
  })
})

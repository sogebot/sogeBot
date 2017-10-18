/* global describe it beforeEach */

const assert = require('chai').assert
const sinon = require('sinon')
const until = require('test-until')
require('../../general.js')

const db = require('../../general.js').db

// users
const owner = { username: 'soge__' }

describe('Timers - add()', () => {
  beforeEach(async () => {
    await db.cleanup('timers')
    await db.cleanup('timersResponses')
    await global.db.engine.insert('timers', {name: 'test', messages: 0, seconds: 60, enabled: true, trigger: { messages: global.parser.linesParsed, timestamp: new Date().getTime() }})
    global.commons.sendMessage.reset()
  })

  it('', async () => {
    global.systems.timers.add(global.systems.timers, owner, '')

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
    global.systems.timers.add(global.systems.timers, owner, '-name test')

    await until(setError => {
      let expected = global.commons.prepare('timers.response-must-be-defined')
      try {
        assert.isTrue(global.commons.sendMessage.calledWith(expected, sinon.match(owner)))
        return true
      } catch (err) {
        return setError('\nExpected message: ' + expected + '\nActual message: ' + global.commons.sendMessage.lastCall.args[0])
      }
    })
  })

  it('-name unknown -response "Lorem Ipsum"', async () => {
    await global.systems.timers.add(global.systems.timers, owner, '-name unknown -response "Lorem Ipsum"')

    await until(setError => {
      let expected = global.commons.prepare('timers.timer-not-found', { name: 'unknown' })
      try {
        assert.isTrue(global.commons.sendMessage.calledWith(expected, sinon.match(owner)))
        return true
      } catch (err) {
        return setError('\nExpected message: ' + expected + '\nActual message: ' + global.commons.sendMessage.lastCall.args[0])
      }
    })
  })

  it('-name test -response "Lorem Ipsum"', async () => {
    await global.systems.timers.add(global.systems.timers, owner, '-name test -response "Lorem Ipsum"')

    let item = await global.db.engine.findOne('timersResponses', { response: 'Lorem Ipsum' })
    assert.notEmpty(item)

    await until(setError => {
      let expected = global.commons.prepare('timers.response-was-added', { id: item._id, name: 'test', response: 'Lorem Ipsum' })
      try {
        assert.isTrue(global.commons.sendMessage.calledWith(expected, sinon.match(owner)))
        return true
      } catch (err) {
        return setError('\nExpected message: ' + expected + '\nActual message: ' + global.commons.sendMessage.lastCall.args[0])
      }
    })
  })
})

/* global describe it beforeEach */

const assert = require('chai').assert
const sinon = require('sinon')
const _ = require('lodash')
const until = require('test-until')
require('../../general.js')

const db = require('../../general.js').db
const tmi = require('../../general.js').tmi

// users
const owner = { username: 'soge__' }

describe('Timers - unset()', () => {
  beforeEach(async () => {
    await tmi.waitForConnection()
    await db.cleanup()
    await global.db.engine.insert('timers', {name: 'test', messages: 0, seconds: 60, enabled: true, trigger: { messages: global.parser.linesParsed, timestamp: new Date().getTime() }})
    global.commons.sendMessage.reset()
  })

  it('', async () => {
    global.systems.timers.unset(global.systems.timers, owner, '')

    await until(setError => {
      let expected = global.commons.prepare('timers.name-must-be-defined')
      let user = owner
      try {
        assert.isTrue(global.commons.sendMessage.calledWith(expected, sinon.match(user)))
        return true
      } catch (err) {
        return setError(
          '\nExpected message: "' + expected + '"\nActual message:   "' + (!_.isNil(global.commons.sendMessage.lastCall) ? global.commons.sendMessage.lastCall.args[0] : '') + '"' +
          '\n\nExpected user: "' + JSON.stringify(user) + '"\nActual user:   "' + (!_.isNil(global.commons.sendMessage.lastCall) ? JSON.stringify(global.commons.sendMessage.lastCall.args[1]) : '') + '"')
      }
    })
  })
  it('-name test', async () => {
    global.systems.timers.unset(global.systems.timers, owner, '-name test')

    await until(setError => {
      let expected = global.commons.prepare('timers.timer-deleted', { name: 'test' })
      let user = owner
      try {
        assert.isTrue(global.commons.sendMessage.calledWith(expected, sinon.match(user)))
        return true
      } catch (err) {
        return setError(
          '\nExpected message: "' + expected + '"\nActual message:   "' + (!_.isNil(global.commons.sendMessage.lastCall) ? global.commons.sendMessage.lastCall.args[0] : '') + '"' +
          '\n\nExpected user: "' + JSON.stringify(user) + '"\nActual user:   "' + (!_.isNil(global.commons.sendMessage.lastCall) ? JSON.stringify(global.commons.sendMessage.lastCall.args[1]) : '') + '"')
      }
    })

    let item = await global.db.engine.findOne('timers', { name: 'test' })
    assert.empty(item)
  })
  it('-name nonexistent', async () => {
    global.systems.timers.unset(global.systems.timers, owner, '-name nonexistent')

    await until(setError => {
      let expected = global.commons.prepare('timers.timer-not-found', { name: 'nonexistent' })
      let user = owner
      try {
        assert.isTrue(global.commons.sendMessage.calledWith(expected, sinon.match(user)))
        return true
      } catch (err) {
        return setError(
          '\nExpected message: "' + expected + '"\nActual message:   "' + (!_.isNil(global.commons.sendMessage.lastCall) ? global.commons.sendMessage.lastCall.args[0] : '') + '"' +
          '\n\nExpected user: "' + JSON.stringify(user) + '"\nActual user:   "' + (!_.isNil(global.commons.sendMessage.lastCall) ? JSON.stringify(global.commons.sendMessage.lastCall.args[1]) : '') + '"')
      }
    })

    let item = await global.db.engine.findOne('timers', { name: 'test' })
    assert.notEmpty(item)
    assert.equal(item.seconds, 60)
    assert.equal(item.messages, 0)
  })
})

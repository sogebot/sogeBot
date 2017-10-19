/* global describe it beforeEach */

const assert = require('chai').assert
const sinon = require('sinon')
const until = require('test-until')
const _ = require('lodash')
require('../../general.js')

const db = require('../../general.js').db

// users
const owner = { username: 'soge__' }

describe('Timers - set()', () => {
  beforeEach(async () => {
    await db.cleanup('timers')
    global.commons.sendMessage.reset()
  })

  it('', async () => {
    global.systems.timers.set(global.systems.timers, owner, '')

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
    await global.systems.timers.set(global.systems.timers, owner, '-name test')

    await until(setError => {
      let expected = global.commons.prepare('timers.timer-was-set', { name: 'test', messages: 0, seconds: 60 })
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
  it('-name test -seconds 20', async () => {
    await global.systems.timers.set(global.systems.timers, owner, '-name test -seconds 20')

    await until(setError => {
      let expected = global.commons.prepare('timers.timer-was-set', { name: 'test', messages: 0, seconds: 20 })
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
    assert.equal(item.seconds, 20)
    assert.equal(item.messages, 0)
  })
  it('-name test -seconds 0', async () => {
    await global.systems.timers.set(global.systems.timers, owner, '-name test -seconds 0')

    await until(setError => {
      let expected = global.commons.prepare('timers.cannot-set-messages-and-seconds-0')
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
  it('-name test -messages 20', async () => {
    await global.systems.timers.set(global.systems.timers, owner, '-name test -messages 20')

    await until(setError => {
      let expected = global.commons.prepare('timers.timer-was-set', { name: 'test', messages: 20, seconds: 60 })
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
    assert.equal(item.messages, 20)
  })
  it('-name test -messages 0', async () => {
    await global.systems.timers.set(global.systems.timers, owner, '-name test -messages 0')

    await until(setError => {
      let expected = global.commons.prepare('timers.timer-was-set', { name: 'test', messages: 0, seconds: 60 })
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
  it('-name test -seconds 0 -messages 0', async () => {
    await global.systems.timers.set(global.systems.timers, owner, '-name test -seconds 0 -messages 0')

    await until(setError => {
      let expected = global.commons.prepare('timers.cannot-set-messages-and-seconds-0')
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
  it('-name test -seconds 5 -messages 6', async () => {
    await global.systems.timers.set(global.systems.timers, owner, '-name test -seconds 5 -messages 6')

    await until(setError => {
      let expected = global.commons.prepare('timers.timer-was-set', { name: 'test', messages: 6, seconds: 5 })
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
    assert.equal(item.seconds, 5)
    assert.equal(item.messages, 6)
  })
})

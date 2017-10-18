/* global describe it beforeEach */

const assert = require('chai').assert
const sinon = require('sinon')
const until = require('test-until')
const _ = require('lodash')
require('../../general.js')

const db = require('../../general.js').db

// users
const owner = { username: 'soge__' }

describe.only('Timers - toggle()', () => {
  beforeEach(async () => {
    await db.cleanup('timers')
    await db.cleanup('timersResponses')
    let timer = await global.db.engine.insert('timers', {name: 'test', messages: 0, seconds: 60, enabled: true, trigger: { messages: global.parser.linesParsed, timestamp: new Date().getTime() }})
    global.db.engine.insert('timersResponses', {response: 'Lorem Ipsum', timerId: timer._id, enabled: true})
    global.commons.sendMessage.reset()
  })

  it('', async () => {
    global.systems.timers.toggle(global.systems.timers, owner, '')

    await until(setError => {
      let expected = global.commons.prepare('timers.id-or-name-must-be-defined')
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

  it('-id something -name something', async () => {
    global.systems.timers.toggle(global.systems.timers, owner, '-id something -name something')

    await until(setError => {
      let expected = global.commons.prepare('timers.id-or-name-must-be-defined')
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

  it('-id unknown', async () => {
    global.systems.timers.toggle(global.systems.timers, owner, '-id unknown')

    await until(setError => {
      let expected = global.commons.prepare('timers.response-not-found', { id: 'unknown' })
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

  it('-id response_id', async () => {
    let response = await global.db.engine.findOne('timersResponses', { response: 'Lorem Ipsum' })

    global.systems.timers.toggle(global.systems.timers, owner, '-id ' + response._id)
    await until(setError => {
      let expected = global.commons.prepare('timers.response-disabled', { id: response._id })
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

    global.systems.timers.toggle(global.systems.timers, owner, '-id ' + response._id)
    await until(setError => {
      let expected = global.commons.prepare('timers.response-enabled', { id: response._id })
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

  it('-name unknown', async () => {
    global.systems.timers.toggle(global.systems.timers, owner, '-name unknown')

    await until(setError => {
      let expected = global.commons.prepare('timers.timer-not-found', { name: 'unknown' })
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
    global.systems.timers.toggle(global.systems.timers, owner, '-name test')
    await until(setError => {
      let expected = global.commons.prepare('timers.timer-disabled', { name: 'test' })
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

    global.systems.timers.toggle(global.systems.timers, owner, '-name test')
    await until(setError => {
      let expected = global.commons.prepare('timers.timer-enabled', { name: 'test' })
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
})

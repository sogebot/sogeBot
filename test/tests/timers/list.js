/* global describe it beforeEach */

const assert = require('chai').assert
const sinon = require('sinon')
const until = require('test-until')
const _ = require('lodash')
require('../../general.js')

const db = require('../../general.js').db

// users
const owner = { username: 'soge__' }

describe('Timers - list()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await global.db.engine.insert('timers', {name: 'test', messages: 0, seconds: 60, enabled: true, trigger: { messages: global.parser.linesParsed, timestamp: new Date().getTime() }})
    let timer = await global.db.engine.insert('timers', {name: 'test2', messages: 0, seconds: 60, enabled: false, trigger: { messages: global.parser.linesParsed, timestamp: new Date().getTime() }})
    global.db.engine.insert('timersResponses', {response: 'Lorem Ipsum', timerId: timer._id.toString(), enabled: true})
    global.db.engine.insert('timersResponses', {response: 'Lorem Ipsum 2', timerId: timer._id.toString(), enabled: false})
    global.commons.sendMessage.reset()
  })

  it('', async () => {
    global.systems.timers.list(global.systems.timers, owner, '')

    await until(setError => {
      let expected = '$sender, timers list: ⚫ test, ⚪ test2'
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
    global.systems.timers.list(global.systems.timers, owner, '-name unknown')

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

  it('-name test2', async () => {
    global.systems.timers.list(global.systems.timers, owner, '-name test2')

    let response1 = await global.db.engine.findOne('timersResponses', { response: 'Lorem Ipsum' })
    let response2 = await global.db.engine.findOne('timersResponses', { response: 'Lorem Ipsum 2' })

    await until(setError => {
      let expected = global.commons.prepare('timers.responses-list', { name: 'test2' })
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

    await until(setError => {
      let expected = `⚫ ${response1._id} - ${response1.response}`
      let user = owner
      try {
        assert.isTrue(global.commons.sendMessage.calledWith(expected, sinon.match(user)))
        return true
      } catch (err) {
        return setError(
          '\nExpected message: "' + expected + '"\nActual message:   "' + (!_.isNil(global.commons.sendMessage.lastCall) ? global.commons.sendMessage.lastCall.args[0] : '') + '"' +
          '\n\nExpected user: "' + JSON.stringify(user) + '"\nActual user:   "' + (!_.isNil(global.commons.sendMessage.lastCall) ? JSON.stringify(global.commons.sendMessage.lastCall.args[1]) : '') + '"')
      }
    },)

    await until(setError => {
      let expected = `⚪ ${response2._id} - ${response2.response}`
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

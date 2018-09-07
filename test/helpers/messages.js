const assert = require('chai').assert
const until = require('test-until')
const sinon = require('sinon')
const _ = require('lodash')
const util = require('util')

module.exports = {
  prepare: function () {
    try {
      sinon.stub(global.log, 'chatOut')
      sinon.stub(global.log, 'warning')
      sinon.stub(global.log, 'process')
      sinon.stub(global.events, 'fire')
    } catch (e) {
      global.log.chatOut.reset()
      global.log.warning.reset()
      global.log.process.reset()
      global.events.fire.reset()
    }
  },
  process: async function (expected, user) {
    await until(setError => {
      try {
        let args = global.log.process.lastCall.args[0]
        assert.isTrue(args.type === 'parse')
        assert.isTrue(args.message === expected)
        assert.isTrue(args.sender.username === user.username)
        return true
      } catch (err) {
        return setError(
          '\nExpected message: "' + expected + '"\nActual message:   "' + (!_.isNil(global.log.process.lastCall) ? global.log.process.lastCall.args[0] : '') + '"' +
          '\n\nExpected user: "' + JSON.stringify(user) + '"\nActual user:   "' + (!_.isNil(global.log.process.lastCall) ? JSON.stringify(global.log.process.lastCall.args[1]) : '') + '"')
      }
    }, 5000)
  },
  isWarned: async function (entry, user, opts) {
    opts = opts || {}
    await until(async setError => {
      let expected = []
      if (_.isArray(opts)) {
        for (let o of opts) {
          o.sender = _.isNil(user.username) ? '' : user.username
          expected.push(await global.commons.prepare(entry, o))
        }
      } else {
        opts.sender = _.isNil(user.username) ? '' : user.username
        expected = [await global.commons.prepare(entry, opts)]
      }
      try {
        let isCorrectlyCalled = false
        for (let e of expected) {
          if (global.log.warning.calledWith(e)) {
            isCorrectlyCalled = true
            break
          }
        }
        assert.isTrue(isCorrectlyCalled)
        global.log.warning.reset()
        return true
      } catch (err) {
        return setError(
          '\nExpected message: "' + JSON.stringify(expected) + '"\nActual message:   "' + (!_.isNil(global.log.warning.lastCall) ? global.log.warning.lastCall.args[0] : '') + '"')
      }
    }, 5000)
  },
  isSent: async function (entry, user, opts) {
    opts = opts || {}
    await until(async setError => {
      let expected = []
      if (_.isArray(opts)) {
        for (let o of opts) {
          o.sender = _.isNil(user.username) ? '' : user.username
          if (_.isArray(entry)) {
            for (let e of entry) expected.push(await global.commons.prepare(e, o))
          } else expected.push(await global.commons.prepare(entry, o))
        }
      } else {
        opts.sender = _.isNil(user.username) ? '' : user.username
        if (_.isArray(entry)) {
          for (let e of entry) expected.push(await global.commons.prepare(e, opts))
        } else expected.push(await global.commons.prepare(entry, opts))
      }
      try {
        let isCorrectlyCalled = false
        for (let e of expected) {
          /*
          console.log(util.inspect(global.log.chatOut.args))
          console.log({ expected: e, user })
          */
          delete user['message-type'] // remove unnecessary message-type
          delete user['userId'] // remove unnecessary message-type
          if (global.log.chatOut.calledWith(e, sinon.match(user))) {
            isCorrectlyCalled = true
            break
          }
        }
        assert.isTrue(isCorrectlyCalled)
        global.log.chatOut.reset()
        return true
      } catch (err) {
        return setError(
          '\nExpected message: "' + JSON.stringify(expected) + '"\nActual message:   "' + (!_.isNil(global.log.chatOut.args) ? util.inspect(global.log.chatOut.args) : '') + '"' +
          '\n\nExpected user: "' + JSON.stringify(user) + '"\nActual user:   "' + (!_.isNil(global.log.chatOut.lastCall) ? JSON.stringify(global.log.chatOut.lastCall.args[1]) : '') + '"')
      }
    }, 5000)
  },
  isSentRaw: async function (expected, user) {
    await until(setError => {
      try {
        let isOK = false
        if (_.isArray(expected)) {
          for (let e of expected) {
            if (global.log.chatOut.calledWith(e, sinon.match(user))) {
              isOK = true
              break
            }
          }
        } else {
          isOK = global.log.chatOut.calledWith(expected, sinon.match(user))
        }
        assert.isTrue(isOK)
        return true
      } catch (err) {
        return setError(
          '\nExpected message: "' + expected + '"\nActual message:   "' + (!_.isNil(global.log.chatOut.lastCall) ? global.log.chatOut.lastCall.args[0] : '') + '"' +
          '\n\nExpected user: "' + JSON.stringify(user) + '"\nActual user:   "' + (!_.isNil(global.log.chatOut.lastCall) ? JSON.stringify(global.log.chatOut.lastCall.args[1]) : '') + '"')
      }
    }, 5000)
  }
}

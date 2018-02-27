const assert = require('chai').assert
const until = require('test-until')
const sinon = require('sinon')
const _ = require('lodash')

module.exports = {
  isSent: async function (entry, user, opts) {
    opts = opts || {}
    await until(setError => {
      let expected = []
      if (_.isArray(opts)) {
        for (let o of opts) {
          expected.push(global.commons.prepare(entry, o))
        }
      } else expected = [global.commons.prepare(entry, opts)]
      try {
        let isCorrectlyCalled = false
        for (let e of expected) {
          if (global.commons.sendMessage.calledWith(e, sinon.match(user))) {
            isCorrectlyCalled = true
            break
          }
        }
        assert.isTrue(isCorrectlyCalled)
        global.commons.sendMessage.reset()
        return true
      } catch (err) {
        return setError(
          '\nExpected message: "' + JSON.stringify(expected) + '"\nActual message:   "' + (!_.isNil(global.commons.sendMessage.lastCall) ? global.commons.sendMessage.lastCall.args[0] : '') + '"' +
          '\n\nExpected user: "' + JSON.stringify(user) + '"\nActual user:   "' + (!_.isNil(global.commons.sendMessage.lastCall) ? JSON.stringify(global.commons.sendMessage.lastCall.args[1]) : '') + '"')
      }
    }, 10000)
  },
  isSentRaw: async function (expected, user) {
    await until(setError => {
      try {
        assert.isTrue(global.commons.sendMessage.calledWith(expected, sinon.match(user)))
        return true
      } catch (err) {
        return setError(
          '\nExpected message: "' + expected + '"\nActual message:   "' + (!_.isNil(global.commons.sendMessage.lastCall) ? global.commons.sendMessage.lastCall.args[0] : '') + '"' +
          '\n\nExpected user: "' + JSON.stringify(user) + '"\nActual user:   "' + (!_.isNil(global.commons.sendMessage.lastCall) ? JSON.stringify(global.commons.sendMessage.lastCall.args[1]) : '') + '"')
      }
    }, 10000)
  }
}

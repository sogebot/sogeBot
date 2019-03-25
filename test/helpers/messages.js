const assert = require('chai').assert
const until = require('test-until')
const chalk = require('chalk')
const sinon = require('sinon')
const _ = require('lodash')
const { prepare } = require('../../dest/commons')

var eventSpy

const __DEBUG__ = (process.env.DEBUG && process.env.DEBUG.includes('test'))

module.exports = {
  prepare: function () {
    if (__DEBUG__) {
      console.log(chalk.bgRed('*** Restoring all spies ***'))
    }

    if (eventSpy) eventSpy.restore()
    eventSpy = sinon.spy(global.events, 'fire')

    global.tmi.client = {
      bot: {
        chat: {
          say: function () { },
          color: function () {},
          timeout: function () {},
          on: function () {},
          connect: function () {},
          join: function () {}
        }
      },
      broadcaster: {
        chat: {
          say: function () { },
          color: function () {},
          timeout: function () {},
          on: function () {},
          connect: function () {},
          join: function () {}
        }
      }
    }

    try {
      sinon.stub(global.log, 'chatOut')
      sinon.stub(global.log, 'warning')
      sinon.stub(global.log, 'process')
    } catch (e) {
      global.log.chatOut.reset()
      global.log.warning.reset()
      global.log.process.reset()
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
    user = _.cloneDeep(user)
    opts = opts || {}
    await until(async setError => {
      let expected = []
      if (_.isArray(opts)) {
        for (let o of opts) {
          o.sender = _.isNil(user.username) ? '' : user.username
          expected.push(await prepare(entry, o))
        }
      } else {
        opts.sender = _.isNil(user.username) ? '' : user.username
        expected = [await prepare(entry, opts)]
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
  isSent: async function (entry, user, opts, wait) {
    user = _.cloneDeep(user)
    opts = opts || {}
    return until(async setError => {
      let expected = []
      if (_.isArray(opts)) {
        for (let o of opts) {
          o.sender = _.isNil(user.username) ? '' : user.username
          if (_.isArray(entry)) {
            for (let e of entry) expected.push(await prepare(e, o))
          } else expected.push(await prepare(entry, o))
        }
      } else {
        opts.sender = _.isNil(user.username) ? '' : user.username
        if (_.isArray(entry)) {
          for (let e of entry) expected.push(await prepare(e, opts))
        } else expected.push(await prepare(entry, opts))
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
          if (global.log.chatOut.calledWith(e, sinon.match.has('username', user.username))) {
            isCorrectlyCalled = true
            break
          }
        }
        assert.isTrue(isCorrectlyCalled)
        global.log.chatOut.reset()
        return true
      } catch (err) {
        return setError(
          '\nExpected message: "' + expected + '"\nExpected user: "' + JSON.stringify(user) +
          '\n\nActual message:   "' + JSON.stringify(global.log.chatOut.args) + '"'
        )
      }
    }, wait || 5000)
  },
  isSentRaw: async function (expected, user, wait) {
    user = _.cloneDeep(user)
    return until(setError => {
      try {
        let isOK = false
        if (_.isArray(expected)) {
          for (let e of expected) {
            if (global.log.chatOut.calledWith(e, sinon.match.has('username', user.username))) {
              isOK = true
              break
            }
          }
        } else {
          isOK = global.log.chatOut.calledWith(expected, sinon.match.has('username', user.username))
        }
        assert.isTrue(isOK)
        return true
      } catch (err) {
        return setError(
          '\nExpected message: "' + expected + '"\n\nExpected user: "' + JSON.stringify(user) +
          '\n\n\nActual message:   "' + global.log.chatOut.args + '"'
        )
      }
    }, wait || 5000)
  },
  isNotSent: async function (expected, user, wait) {
    user = _.cloneDeep(user)
    const race = await Promise.race([
      this.isSent(expected, user, wait * 2),
      new Promise((resolve) => {
        setTimeout(() => resolve(false), wait)
      })
    ])
    assert.isTrue(!race, 'Message was unexpectedly sent ' + expected);
  },
  isNotSentRaw: async function (expected, user, wait) {
    user = _.cloneDeep(user)
    const race = await Promise.race([
      this.isSentRaw(expected, user, wait * 2),
      new Promise((resolve) => {
        setTimeout(() => resolve(false), wait)
      })
    ])
    assert.isTrue(!race, 'Message was unexpectedly sent ' + expected);
  }
}

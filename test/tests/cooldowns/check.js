/* global describe it beforeEach */

require('../../general.js')

const assert = require('chai').assert
const _ = require('lodash')
const sinon = require('sinon')
const until = require('test-until')

const db = require('../../general.js').db
const message = require('../../general.js').message
const tmi = require('../../general.js').tmi

// users
const owner = { username: 'soge__' }
const testUser = { username: 'test' }
const testUser2 = { username: 'test2' }

describe('Cooldowns - check()', () => {
  beforeEach(async () => {
    await tmi.waitForConnection()
    global.commons.sendMessage.reset()
    await db.cleanup()
    if (_.isFunction(global.updateQueue.restore)) global.updateQueue.restore()
  })

  it('command - user', async () => {
    let [command, type, seconds, quiet] = ['!me', 'user', '60', true]
    global.systems.cooldown.set(global.systems.cooldown, owner, `${command} ${type} ${seconds} ${quiet}`)
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: command, type: type, seconds: seconds })

    let item = await global.db.engine.findOne('cooldowns', { key: '!me' })
    assert.notEmpty(item)

    var spy = sinon.spy(global, 'updateQueue')
    global.parser.parse(testUser, '!me')
    await until(() => {
      if (spy.called) {
        let isTrue = true
        for (let args of spy.args) {
          if (!args[1]) isTrue = false
        }
        return isTrue
      }
      return false
    }, 5000)
    await message.isSentRaw('$sender | 0.0h | 0 points | 0 messages', testUser)

    spy.reset()
    global.parser.parse(testUser, '!me')
    await until(() => {
      if (spy.called) {
        let isFalse = false
        for (let args of spy.args) {
          if (!args[1]) isFalse = true
        }
        return isFalse
      }
      return false
    }, 5000)

    spy.reset()
    global.parser.parse(testUser2, '!me')
    await until(() => {
      if (spy.called) {
        let isTrue = true
        for (let args of spy.args) {
          if (!args[1]) isTrue = false
        }
        return isTrue
      }
      return false
    }, 5000)
    await message.isSentRaw('$sender | 0.0h | 0 points | 0 messages', testUser2)
  })

  it('command - global', async () => {
    let [command, type, seconds, quiet] = ['!me', 'global', '60', true]
    global.systems.cooldown.set(global.systems.cooldown, owner, `${command} ${type} ${seconds} ${quiet}`)
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: command, type: type, seconds: seconds })

    let item = await global.db.engine.findOne('cooldowns', { key: '!me' })
    assert.notEmpty(item)

    var spy = sinon.spy(global, 'updateQueue')
    global.parser.parse(testUser, '!me')
    await until(() => {
      if (spy.called) {
        let isTrue = true
        for (let args of spy.args) {
          if (!args[1]) isTrue = false
        }
        return isTrue
      }
      return false
    }, 5000)
    await message.isSentRaw('$sender | 0.0h | 0 points | 0 messages', testUser)

    spy.reset()
    global.parser.parse(testUser, '!me')
    await until(() => {
      if (spy.called) {
        let isFalse = false
        for (let args of spy.args) {
          if (!args[1]) isFalse = true
        }
        return isFalse
      }
      return false
    }, 5000)

    spy.reset()
    global.parser.parse(testUser2, '!me')
    await until(() => {
      if (spy.called) {
        let isFalse = false
        for (let args of spy.args) {
          if (!args[1]) isFalse = true
        }
        return isFalse
      }
      return false
    }, 5000)
  })

  it('keyword - user', async () => {
    global.systems.keywords.add(global.systems.keywords, owner, 'me (!me)')
    await message.isSent('keywords.keyword-was-added', owner, { keyword: 'me' })

    let [command, type, seconds, quiet] = ['me', 'user', '60', true]
    global.systems.cooldown.set(global.systems.cooldown, owner, `${command} ${type} ${seconds} ${quiet}`)
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: command, type: type, seconds: seconds })

    let item = await global.db.engine.findOne('cooldowns', { key: 'me' })
    assert.notEmpty(item)

    var spy = sinon.spy(global, 'updateQueue')
    global.parser.parse(testUser, 'Lorem me Ipsum')
    await until(() => {
      if (spy.called) {
        let isTrue = true
        for (let args of spy.args) {
          if (!args[1]) isTrue = false
        }
        return isTrue
      }
      return false
    }, 5000)
    await message.isSentRaw('$sender | 0.0h | 0 points | 0 messages', testUser)

    spy.reset()
    global.parser.parse(testUser, 'Lorem me Ipsum')
    await until(() => {
      if (spy.called) {
        let isFalse = false
        for (let args of spy.args) {
          if (!args[1]) isFalse = true
        }
        return isFalse
      }
      return false
    }, 5000)

    spy.reset()
    global.parser.parse(testUser2, 'Lorem me Ipsum')
    await until(() => {
      if (spy.called) {
        let isTrue = true
        for (let args of spy.args) {
          if (!args[1]) isTrue = false
        }
        return isTrue
      }
      return false
    }, 5000)
    await message.isSentRaw('$sender | 0.0h | 0 points | 0 messages', testUser2)
  })

  it('keyword - global', async () => {
    global.systems.keywords.add(global.systems.keywords, owner, 'me (!me)')
    await message.isSent('keywords.keyword-was-added', owner, { keyword: 'me' })

    let [command, type, seconds, quiet] = ['me', 'global', '60', true]
    global.systems.cooldown.set(global.systems.cooldown, owner, `${command} ${type} ${seconds} ${quiet}`)
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: command, type: type, seconds: seconds })

    let item = await global.db.engine.findOne('cooldowns', { key: 'me' })
    assert.notEmpty(item)

    var spy = sinon.spy(global, 'updateQueue')
    global.parser.parse(testUser, 'Lorem me Ipsum')
    await until(() => {
      if (spy.called) {
        let isTrue = true
        for (let args of spy.args) {
          if (!args[1]) isTrue = false
        }
        return isTrue
      }
      return false
    }, 5000)
    await message.isSentRaw('$sender | 0.0h | 0 points | 0 messages', testUser)

    spy.reset()
    global.parser.parse(testUser, 'Lorem me Ipsum')
    await until(() => {
      if (spy.called) {
        let isFalse = false
        for (let args of spy.args) {
          if (!args[1]) isFalse = true
        }
        return isFalse
      }
      return false
    }, 5000)

    spy.reset()
    global.parser.parse(testUser2, 'Lorem me Ipsum')
    await until(() => {
      if (spy.called) {
        let isFalse = false
        for (let args of spy.args) {
          if (!args[1]) isFalse = true
        }
        return isFalse
      }
      return false
    }, 5000)
  })
})

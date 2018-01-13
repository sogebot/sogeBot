/* global describe it beforeEach */

require('../../general.js')

const _ = require('lodash')
const sinon = require('sinon')
const until = require('test-until')

const db = require('../../general.js').db
const message = require('../../general.js').message
const tmi = require('../../general.js').tmi

// users
const owner = { username: 'soge__' }
const testUser = { username: 'test' }

describe('Cooldowns - toggleEnabled()', () => {
  beforeEach(async () => {
    await tmi.waitForConnection()
    global.commons.sendMessage.reset()
    await db.cleanup()
    if (_.isFunction(global.updateQueue.restore)) global.updateQueue.restore()
  })

  it('incorrect toggle', async () => {
    let [command, type, seconds, quiet] = ['!me', 'user', '60', true]
    global.systems.cooldown.set(global.systems.cooldown, owner, `${command} ${type} ${seconds} ${quiet}`)
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: command, type: type, seconds: seconds })

    global.systems.cooldown.toggleEnabled(global.systems.cooldown, owner, command)
    await message.isSent('cooldowns.cooldown-parse-failed', owner)
  })

  it('correct toggle', async () => {
    var spy = sinon.spy(global, 'updateQueue')
    let [command, type, seconds, quiet] = ['!me', 'user', '60', true]
    global.systems.cooldown.set(global.systems.cooldown, owner, `${command} ${type} ${seconds} ${quiet}`)
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: command, type: type, seconds: seconds })

    global.systems.cooldown.toggleEnabled(global.systems.cooldown, owner, `${command} ${type}`)
    await message.isSent('cooldowns.cooldown-was-disabled', owner, { command: command })
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
    spy.reset()

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

    global.systems.cooldown.toggleEnabled(global.systems.cooldown, owner, `${command} ${type}`)
    await message.isSent('cooldowns.cooldown-was-enabled', owner, { command: command })
  })
})

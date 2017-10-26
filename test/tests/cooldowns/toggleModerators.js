/* global describe it beforeEach */

require('../../general.js')

const _ = require('lodash')
const sinon = require('sinon')
const until = require('test-until')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }
const mod = { username: 'mod', mod: true }

describe('Cooldowns - toggleModerators()', () => {
  beforeEach(async () => {
    global.commons.sendMessage.reset()
    await db.cleanup()
    if (_.isFunction(global.updateQueue.restore)) global.updateQueue.restore()
  })

  it('incorrect toggle', async () => {
    let [command, type, seconds, quiet] = ['!me', 'user', '60', true]
    global.systems.cooldown.set(global.systems.cooldown, owner, `${command} ${type} ${seconds} ${quiet}`)
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: command, type: type, seconds: seconds })

    global.systems.cooldown.toggleModerators(global.systems.cooldown, owner, command)
    await message.isSent('cooldowns.cooldown-parse-failed', owner)
  })

  it('correct toggle', async () => {
    var spy = sinon.spy(global, 'updateQueue')
    let [command, type, seconds, quiet] = ['!me', 'user', '60', true]
    global.systems.cooldown.set(global.systems.cooldown, owner, `${command} ${type} ${seconds} ${quiet}`)
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: command, type: type, seconds: seconds })

    global.systems.cooldown.toggleModerators(global.systems.cooldown, owner, `${command} ${type}`)
    await message.isSent('cooldowns.cooldown-was-enabled-for-moderators', owner, { command: command })
    global.parser.parse(mod, '!me')
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

    global.systems.cooldown.toggleModerators(global.systems.cooldown, owner, `${command} ${type}`)
    await message.isSent('cooldowns.cooldown-was-disabled-for-moderators', owner, { command: command })
  })
})

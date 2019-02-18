/* global describe it beforeEach */
require('../../general.js')

const assert = require('chai').assert

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { badges: {}, username: 'soge__' }
const subscriber = { badges: { subscriber: 1 }, username: 'sub1'}

describe('Cooldowns - toggleSubscribers()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()
  })

  it('incorrect toggle', async () => {
    let [command, type, seconds, quiet] = ['!me', 'user', '60', true]
    global.systems.cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` })
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: command, type: type, seconds: seconds, sender: owner.username })

    global.systems.cooldown.toggleSubscribers({ sender: owner, parameters: command })
    await message.isSent('cooldowns.cooldown-parse-failed', owner, { sender: owner.username })
  })

  it('correct toggle', async () => {
    let [command, type, seconds, quiet] = ['!me', 'user', '60', true]
    global.systems.cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` })
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: command, type: type, seconds: seconds, sender: owner.username })

    global.systems.cooldown.toggleSubscribers({ sender: owner, parameters: `${command} ${type}` })
    await message.isSent('cooldowns.cooldown-was-disabled-for-subscribers', owner, { command: command, sender: owner.username })

    let isOk = await global.systems.cooldown.check({ sender: subscriber, message: '!me' })
    assert.isTrue(isOk)
    isOk = await global.systems.cooldown.check({ sender: subscriber, message: '!me' })
    assert.isTrue(isOk)

    global.systems.cooldown.toggleSubscribers({ sender: owner, parameters: `${command} ${type}` })
    await message.isSent('cooldowns.cooldown-was-enabled-for-subscribers', owner, { command: command, sender: owner.username })

    isOk = await global.systems.cooldown.check({ sender: subscriber, message: '!me' })
    assert.isTrue(isOk)
    isOk = await global.systems.cooldown.check({ sender: subscriber, message: '!me' })
    assert.isFalse(isOk)
  })
})

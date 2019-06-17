/* global describe it before */
const {
  isMainThread
} = require('worker_threads');
if (!isMainThread) process.exit()


require('../../general.js')

const assert = require('chai').assert

const db = require('../../general.js').db
const message = require('../../general.js').message
const variable = require('../../general.js').variable

// users
const owner = { username: 'soge__', badges: {} }
const usermod1 = { username: 'usermod1', badges: { moderator: 1 } }
const subuser1 = { username: 'subuser1', badges: { subscriber: 1 } }
const testUser = { username: 'test', badges: {} }
const testUser2 = { username: 'test2', badges: {} }

describe('Cooldowns - check()', () => {
  describe('#1969 - commands with special chars should not threadlock check', () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()
    })

    it('Command !_debug should pass', async () => {
      let isOk = await global.systems.cooldown.check({ sender: testUser, message: '!_debug' })
      assert.isTrue(isOk)
    })

    it('Command !$debug should pass', async () => {
      let isOk = await global.systems.cooldown.check({ sender: testUser, message: '!$debug' })
      assert.isTrue(isOk)
    })

    it('Command `!_debug test` should pass', async () => {
      let isOk = await global.systems.cooldown.check({ sender: testUser, message: '!_debug test' })
      assert.isTrue(isOk)
    })

    it('Command `!$debug test` should pass', async () => {
      let isOk = await global.systems.cooldown.check({ sender: testUser, message: '!$debug test' })
      assert.isTrue(isOk)
    })

    it('Command `!_debug te$st` should pass', async () => {
      let isOk = await global.systems.cooldown.check({ sender: testUser, message: '!_debug te$st' })
      assert.isTrue(isOk)
    })

    it('Command `!$debug te$st` should pass', async () => {
      let isOk = await global.systems.cooldown.check({ sender: testUser, message: '!$debug te$st' })
      assert.isTrue(isOk)
    })
  })

  describe('#1938 - !cmd with param (*)', () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()
    })

    it('create command', async () => {
      let cmd = await global.db.engine.insert('systems.customcommands', { command: '!cmd', enabled: true, visible: true })
      await global.db.engine.insert('systems.customcommands.responses', { cid: String(cmd._id), filter: '', response: '$param', permission: 1 })
    })

    it('Add !cmd to cooldown', async () => {
      await global.db.engine.insert(global.systems.cooldown.collection.data, {
        'key': '!cmd',
        'type': 'global',
        'quiet': true,
        'owner': true,
        'enabled': true,
        'timestamp': 0,
        'moderator': true,
        'miliseconds': 60000
      })
    })

    it('First user should PASS', async () => {
      let isOk = await global.systems.cooldown.check({ sender: testUser, message: '!cmd (*)' })
      assert.isTrue(isOk)
    })

    it('Second user should FAIL', async () => {
      let isOk = await global.systems.cooldown.check({ sender: testUser2, message: '!cmd (*)' })
      assert.isFalse(isOk)
    })
  })

  describe('#1658 - cooldown not working on not full cooldown object KonCha', async () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()

      global.games.gamble.enabled = true
      await variable.isEqual('global.games.gamble.enabled', true)
    })

    it('Add usermod1 as moderator', async () => {
      await global.db.engine.insert('users', { id: '2', username: 'usermod1', is: { moderator: true } })
    })

    it('Add global KonCha to cooldown', async () => {
      await global.db.engine.insert(global.systems.cooldown.collection.data, {
        'key': 'KonCha',
        'type': 'global',
        'quiet': true,
        'owner': true,
        'enabled': true,
        'timestamp': 0,
        'moderator': true,
        'miliseconds': 60000
      })
    })

    it('Add koncha to keywords', async () => {
      await global.db.engine.insert(global.systems.keywords.collection.data, {
        'keyword': 'koncha',
        'response': '$sender KonCha',
        'enabled': true
      })
    })

    it('First user should PASS', async () => {
      let isOk = await global.systems.cooldown.check({ sender: testUser, message: 'KonCha' })
      assert.isTrue(isOk)
    })

    for (let user of [testUser, testUser2, owner, usermod1, subuser1]) {
      it('Other users should FAIL', async () => {
        let isOk = await global.systems.cooldown.check({ sender: user, message: 'koncha' })
        assert.isFalse(isOk)
      })
    }
  })

  describe('#1658 - cooldown not working on !followage', async () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()

      global.games.gamble.enabled = true
      await variable.isEqual('global.games.gamble.enabled', true)
    })

    it('Add usermod1 as moderator', async () => {
      await global.db.engine.insert('users', { id: '2', username: 'usermod1', is: { moderator: true } })
    })

    it('Add global !followage to cooldown', async () => {
      await global.db.engine.insert(global.systems.cooldown.collection.data, {
        'key': '!followage',
        'type': 'global',
        'owner': false,
        'quiet': true,
        'enabled': true,
        'follower': true,
        'moderator': false,
        'subscriber': true,
        'miliseconds': 30000,
        'timestamp': 1544713598872
      })
    })

    it('First user should PASS', async () => {
      let isOk = await global.systems.cooldown.check({ sender: testUser, message: '!followage' })
      assert.isTrue(isOk)
    })

    it('Owner user should PASS', async () => {
      let isOk = await global.systems.cooldown.check({ sender: owner, message: '!followage' })
      assert.isTrue(isOk)
    })

    it('Moderator user should PASS', async () => {
      let isOk = await global.systems.cooldown.check({ sender: usermod1, message: '!followage' })
      assert.isTrue(isOk)
    })

    for (let user of [testUser, testUser2, subuser1]) {
      it('Other users should FAIL', async () => {
        let isOk = await global.systems.cooldown.check({ sender: user, message: '!followage' })
        assert.isFalse(isOk)
      })
    }
  })

  describe('#1406 - cooldown not working on gamble', async () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()

      global.games.gamble.enabled = true
      await variable.isEqual('global.games.gamble.enabled', true)
    })

    it('test', async () => {
      let [command, type, seconds, quiet] = ['!gamble', 'user', '300', true]
      global.systems.cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` })
      await message.isSent('cooldowns.cooldown-was-set', owner, { command: command, type: type, seconds: seconds, sender: owner.username })

      let item = await global.db.engine.findOne('systems.cooldown', { key: '!gamble' })
      assert.notEmpty(item)

      let isOk = await global.systems.cooldown.check({ sender: testUser, message: '!gamble 10' })
      assert.isTrue(isOk)

      isOk = await global.systems.cooldown.check({ sender: testUser, message: '!gamble 15' })
      assert.isFalse(isOk) // second should fail

      isOk = await global.systems.cooldown.check({ sender: testUser2, message: '!gamble 20' })
      assert.isTrue(isOk)

      isOk = await global.systems.cooldown.check({ sender: testUser2, message: '!gamble 25' })
      assert.isFalse(isOk) // second should fail
    })
  })

  describe('#1352 - command in a sentence', async () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()

      global.games.gamble.enabled = true
      await variable.isEqual('global.games.gamble.enabled', true)
    })

    it('test', async () => {
      let [command, type, seconds, quiet] = ['!test', 'user', '60', true]
      global.systems.cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` })
      await message.isSent('cooldowns.cooldown-was-set', owner, { command: command, type: type, seconds: seconds, sender: owner.username })

      let item = await global.db.engine.findOne('systems.cooldown', { key: '!test' })
      assert.notEmpty(item)

      let isOk = await global.systems.cooldown.check({ sender: testUser, message: 'Lorem Ipsum !test' })
      assert.isTrue(isOk)

      isOk = await global.systems.cooldown.check({ sender: testUser, message: 'Lorem Ipsum !test' })
      assert.isTrue(isOk) // second should fail
    })
  })

  describe('command with subcommand - user', async () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()

      global.games.gamble.enabled = true
      await variable.isEqual('global.games.gamble.enabled', true)
    })

    it('test', async () => {
      let [command, type, seconds, quiet] = ['!test me', 'user', '60', true]
      global.systems.cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` })
      await message.isSent('cooldowns.cooldown-was-set', owner, { command: command, type: type, seconds: seconds, sender: owner.username })

      let item = await global.db.engine.findOne('systems.cooldown', { key: '!test me' })
      assert.notEmpty(item)

      assert.isTrue(await global.systems.cooldown.check({ sender: testUser, message: command }), `'${command}' expected to not fail`)
      assert.isFalse(await global.systems.cooldown.check({ sender: testUser, message: command }), `'${command}' expected to fail`)
      assert.isTrue(await global.systems.cooldown.check({ sender: testUser2, message: command }), `'${command}' expected to not fail`)

      assert.isTrue(await global.systems.cooldown.check({ sender: testUser, message: '!test' }))
      assert.isTrue(await global.systems.cooldown.check({ sender: testUser, message: '!test' }))
      assert.isTrue(await global.systems.cooldown.check({ sender: testUser2, message: '!test' }))
    })
  })

  describe('command - user', async () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()

      global.games.gamble.enabled = true
      await variable.isEqual('global.games.gamble.enabled', true)
    })

    it('test', async () => {
      let [command, type, seconds, quiet] = ['!test', 'user', '60', true]
      global.systems.cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` })
      await message.isSent('cooldowns.cooldown-was-set', owner, { command: command, type: type, seconds: seconds, sender: owner.username })

      let item = await global.db.engine.findOne('systems.cooldown', { key: '!test' })
      assert.notEmpty(item)

      let isOk = await global.systems.cooldown.check({ sender: testUser, message: '!test' })
      assert.isTrue(isOk)

      isOk = await global.systems.cooldown.check({ sender: testUser, message: '!test' })
      assert.isFalse(isOk) // second should fail

      isOk = await global.systems.cooldown.check({ sender: testUser2, message: '!test' })
      assert.isTrue(isOk)
    })
  })

  describe('command - global', async () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()

      global.games.gamble.enabled = true
      await variable.isEqual('global.games.gamble.enabled', true)
    })

    it('test', async () => {
      let [command, type, seconds, quiet] = ['!test', 'global', '60', true]
      global.systems.cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` })
      await message.isSent('cooldowns.cooldown-was-set', owner, { command: command, type: type, seconds: seconds, sender: owner.username })

      let item = await global.db.engine.findOne('systems.cooldown', { key: '!test' })
      assert.notEmpty(item)

      let isOk = await global.systems.cooldown.check({ sender: testUser, message: '!test' })
      assert.isTrue(isOk)

      isOk = await global.systems.cooldown.check({ sender: testUser, message: '!test' })
      assert.isFalse(isOk) // second should fail

      isOk = await global.systems.cooldown.check({ sender: testUser2, message: '!test' })
      assert.isFalse(isOk) // another user should fail as well
    })
  })

  describe('keyword - user', async () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()

      global.games.gamble.enabled = true
      await variable.isEqual('global.games.gamble.enabled', true)
    })

    it('test', async () => {
      global.systems.keywords.add({ sender: owner, parameters: 'me (!me)' })
      await message.isSent('keywords.keyword-was-added', owner, { keyword: 'me', sender: owner.username })

      let [command, type, seconds, quiet] = ['me', 'user', '60', true]
      global.systems.cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` })
      await message.isSent('cooldowns.cooldown-was-set', owner, { command: command, type: type, seconds: seconds, sender: owner.username })

      let item = await global.db.engine.findOne('systems.cooldown', { key: 'me' })
      assert.notEmpty(item)

      let isOk = await global.systems.cooldown.check({ sender: testUser, message: 'me' })
      assert.isTrue(isOk)

      isOk = await global.systems.cooldown.check({ sender: testUser, message: 'me' })
      assert.isFalse(isOk) // second should fail

      isOk = await global.systems.cooldown.check({ sender: testUser2, message: 'me' })
      assert.isTrue(isOk)
    })
  })

  describe('keyword - global', async () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()

      global.games.gamble.enabled = true
      await variable.isEqual('global.games.gamble.enabled', true)
    })

    it('test', async () => {
      global.systems.keywords.add({ sender: owner, parameters: 'me (!me)' })
      await message.isSent('keywords.keyword-was-added', owner, { keyword: 'me', sender: owner.username })

      let [command, type, seconds, quiet] = ['me', 'global', '60', true]
      global.systems.cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` })
      await message.isSent('cooldowns.cooldown-was-set', owner, { command: command, type: type, seconds: seconds, sender: owner.username })

      let item = await global.db.engine.findOne('systems.cooldown', { key: 'me' })
      assert.notEmpty(item)

      let isOk = await global.systems.cooldown.check({ sender: testUser, message: 'me' })
      assert.isTrue(isOk)

      isOk = await global.systems.cooldown.check({ sender: testUser, message: 'me' })
      assert.isFalse(isOk) // second should fail

      isOk = await global.systems.cooldown.check({ sender: testUser2, message: 'me' })
      assert.isFalse(isOk) // another user should fail as well
    })
  })
})

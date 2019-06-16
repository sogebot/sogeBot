/* global describe it before */
const {
  isMainThread
} = require('worker_threads');
if (!isMainThread) process.exit()


require('../../general.js')

const db = require('../../general.js').db
const variable = require('../../general.js').variable
const message = require('../../general.js').message
const assert = require('chai').assert

const tests = {
  'timeout': [
    'asdfstVTzgo3KrfNekGTjomK7nBjEX9B3Vw4qctminLjzfqbT8q6Cd23pVSuw0wuWPAJE9vaBDC4PIYkKCleX8yBXBiQMKwJWb8uonmbOzNgpuMpcF6vpF3mRc8bbonrfVHqbT00QpjPJHXOF88XrjgR8v0BQVlsX61lpT8vbqjZRlizoMa2bruKU3GtONgZhtJJQyRJEVo3OTiAgha2kC0PHUa8ZSRNCoTsDWc76BTfa2JntlTgIXmX2aXTDQEyBomkSQAof4APE0sfX9HvEROQqP9SSf09VK1weXNcsmMs'
  ],
  'ok': [
    'asdfstVTzgo3KrfNekGTjomK7nBjEX9B3Vw4qctminLjzfqbT8q6Cd23pVSuw0wuWPAJE9vaBDC4PIYkKCleX8yBXBiQMKwJWb8uonmbOzNgpuMpcF6vpF3mRc8bbonrfVHqbT00QpjPJHXOF88XrjgR8v0'
  ]
}

describe('systems/moderation - longMessage()', () => {
  describe('moderationLongMessage=false', async () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()
      global.systems.moderation.cLongMessageEnabled = false
      await variable.isEqual('global.systems.moderation.cLongMessageEnabled', false)
    })

    for (let test of tests.timeout) {
      it(`message '${test}' should not timeout`, async () => {
        assert.isTrue(await global.systems.moderation.longMessage({ sender: { username: 'testuser', badges: {} }, message: test }))
      })
    }

    for (let test of tests.ok) {
      it(`message '${test}' should not timeout`, async () => {
        assert.isTrue(await global.systems.moderation.longMessage({ sender: { username: 'testuser', badges: {} }, message: test }))
      })
    }
  })
  describe('moderationLongMessage=true', async () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()
      global.systems.moderation.cLongMessageEnabled = true
      await variable.isEqual('global.systems.moderation.cLongMessageEnabled', true)
    })

    for (let test of tests.timeout) {
      it(`message '${test}' should timeout`, async () => {
        assert.isFalse(await global.systems.moderation.longMessage({ sender: { username: 'testuser', badges: {} }, message: test }))
      })
    }

    for (let test of tests.ok) {
      it(`message '${test}' should not timeout`, async () => {
        assert.isTrue(await global.systems.moderation.longMessage({ sender: { username: 'testuser', badges: {} }, message: test }))
      })
    }
  })
})

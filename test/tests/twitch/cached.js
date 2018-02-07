/* global describe it before */

require('../../general.js')

const db = require('../../general.js').db
const tmi = require('../../general.js').tmi

const _ = require('lodash')
const assert = require('chai').assert

describe('lib/twitch - cached()', () => {
  before(async () => {
    await tmi.waitForConnection()
    global.commons.sendMessage.reset()
    await db.cleanup()
  })

  it('cached should not be in db', async () => {
    let users = await global.db.engine.find('cache.users')
    assert.lengthOf(users, 0, JSON.stringify(users))
  })

  it('await users() x-times at once', async () => {
    let toAwait = []
    for (let i = 0; i < 20; i++) {
      toAwait.push(global.twitch.cached({
        followers: ['Lorem', 'Ipsum'],
        hosts: ['Dolor', 'Sit'],
        subscribers: ['Amet']
      }))
    }
    await Promise.all(toAwait)
  })

  it('users should be only once in db', async () => {
    let users = await global.db.engine.find('cache.users')
    assert.lengthOf(users, 1, JSON.stringify(users))
  })
})

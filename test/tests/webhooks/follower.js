/* global describe it before */

const assert = require('chai').assert
require('../../general.js')

const db = require('../../general.js').db
const tmi = require('../../general.js').tmi

// users
const testuser = { username: 'testuser', id: 1 }

describe('libs/webhooks - follower()', () => {
  before(async () => {
    await tmi.waitForConnection()
    global.events.fire.reset()
    await db.cleanup()
  })

  it('testuser should not be in webhooks cache', async () => {
    assert.isFalse(global.webhooks.existsInCache('follow', 1))
  })

  it('add testuser (id:1) to db', async () => {
    await global.db.engine.insert('users', testuser)
  })

  it('testuser payload for follower() several times', async () => {
    for (let i = 0; i < 5; i++) {
      global.webhooks.follower({
        data: {
          from_id: 1,
          to_id: 2
        }
      })
    }
  })

  it('testuser should be in webhooks cache', async () => {
    assert.isTrue(global.webhooks.existsInCache('follow', 1))
  })

  it('follow event should be fired only once', async () => {
    assert.isTrue(global.events.fire.calledOnce)
  })
})

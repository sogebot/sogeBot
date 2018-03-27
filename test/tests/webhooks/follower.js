/* global describe it before */

const assert = require('chai').assert
require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const testuser = { username: 'testuser', id: 1 }

describe('libs/webhooks - follower()', () => {
  before(async () => {
    await db.cleanup()
    await message.prepare()
  })

  it('testuser should not be in webhooks cache', async () => {
    assert.isFalse(global.webhooks.existsInCache('follow', 1))
  })

  it('add testuser (id:1) to db', async () => {
    await global.db.engine.insert('users', testuser)
  })

  it('testuser payload for follower() several times', async () => {
    global.api.channelId = 190389471
    for (let i = 0; i < 5; i++) {
      await global.webhooks.follower({
        data: {
          from_id: 1,
          to_id: 190389471
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

  it('testuser payload for follower() several times for incorrect channel id', async () => {
    for (let i = 0; i < 5; i++) {
      await global.webhooks.follower({
        data: {
          from_id: 3,
          to_id: 2
        }
      })
    }
  })

  it('testuser should not be in webhooks cache', async () => {
    assert.isFalse(global.webhooks.existsInCache('follow', 3))
  })
})

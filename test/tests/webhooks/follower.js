/* global describe it before */

const assert = require('chai').assert
const _ = require('lodash')
require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const id = _.random(99999, false)
const channelId = String(_.random(9999999, false))
const testuser = { username: 'testuser', id }

describe('libs/webhooks - follower()', () => {
  before(async () => {
    await db.cleanup()
    await message.prepare()
    global.oauth.channelId = channelId
  })

  it('testuser should not be in webhooks cache', async () => {
    assert.isFalse(global.webhooks.existsInCache('follow', id))
  })

  it('add testuser (id:' + id + ') to db', async () => {
    await global.db.engine.insert('users', testuser)
  })

  it('follow event should not be called', async () => {
    assert.isFalse(global.events.fire.called)
  })

  it('testuser payload for follower() several times', async () => {
    for (let i = 0; i < 5; i++) {
      await global.webhooks.follower({
        data: {
          from_id: id,
          from_name: 'testuser',
          to_id: global.oauth.channelId,
          to_name: 'channeluser'
        }
      })
    }
  })

  it('testuser should be in webhooks cache', async () => {
    assert.isTrue(global.webhooks.existsInCache('follow', id))
  })

  it('follow event should be fired only once', async () => {
    assert.isTrue(global.events.fire.calledOnce)
  })

  it('testuser payload for follower() several times for incorrect channel id', async () => {
    for (let i = 0; i < 5; i++) {
      await global.webhooks.follower({
        data: {
          from_id: 3,
          from_name: 'testuser',
          to_id: 2,
          to_name: 'channeluser'
        }
      })
    }
  })

  it('testuser should not be in webhooks cache', async () => {
    assert.isFalse(global.webhooks.existsInCache('follow', 3))
  })
})

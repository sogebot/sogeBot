/* global describe it before */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

const moment = require('moment')
const assert = require('chai').assert

const testuser = { username: 'testuser' }
const testuser2 = { username: 'testuser2' }
const testuser3 = { username: 'testuser3' }

describe('lib/twitch - addUserInSubscriberCache()', () => {
  before(async () => {
    global.commons.sendMessage.reset()
    await db.cleanup()
  })

  it('add testuser to cache', async () => {
    await global.twitch.addUserInSubscriberCache(testuser.username)
  })

  it('add testuser2 to cache', async () => {
    await global.twitch.addUserInSubscriberCache(testuser2.username)
  })

  it('when.subscribed_at should not be empty', async () => {
    let when = await global.twitch.when()
    assert.isNumber(when.subscribed_at)
  })

  it('cached.subscribers should have 2 values', async () => {
    let cached = await global.twitch.cached()
    assert.isTrue(cached.subscribers.length === 2)
  })

  it('!subs should return testuser2', async () => {
    await global.twitch.subs(global.twitch, testuser)
    let when = await global.twitch.when()

    await message.isSent('subs', testuser, {
      lastSubAgo: moment(when.subscribed_at).fromNow(),
      lastSubUsername: testuser2.username,
      onlineSubCount: 0
    })
  })

  it('add testuser3 to cache', async () => {
    await global.twitch.addUserInSubscriberCache(testuser3.username)
  })

  it('when.subscribed_at should not be empty', async () => {
    let when = await global.twitch.when()
    assert.isNumber(when.subscribed_at)
  })

  it('cached.subscribers should have 3 values', async () => {
    let cached = await global.twitch.cached()
    assert.isTrue(cached.subscribers.length === 3)
  })

  it('!subs should return testuser3', async () => {
    await global.twitch.subs(global.twitch, testuser)
    let when = await global.twitch.when()

    await message.isSent('subs', testuser, {
      lastSubAgo: moment(when.subscribed_at).fromNow(),
      lastSubUsername: testuser3.username,
      onlineSubCount: 0
    })
  })
})

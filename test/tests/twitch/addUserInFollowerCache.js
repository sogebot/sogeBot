/* global describe it before */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

const moment = require('moment')
const assert = require('chai').assert

const testuser = { username: 'testuser' }
const testuser2 = { username: 'testuser2' }
const testuser3 = { username: 'testuser3' }

describe('lib/twitch - addUserInFollowerCache()', () => {
  before(async () => {
    global.commons.sendMessage.reset()
    await db.cleanup()
  })

  it('add testuser to cache', async () => {
    await global.twitch.addUserInFollowerCache(testuser.username)
  })

  it('add testuser2 to cache', async () => {
    await global.twitch.addUserInFollowerCache(testuser2.username)
  })

  it('when.followed_at should not be empty', async () => {
    let when = await global.twitch.when()
    assert.isNumber(when.followed_at)
  })

  it('cached.followers should have 2 values', async () => {
    let cached = await global.twitch.cached()
    assert.isTrue(cached.followers.length === 2)
  })

  it('!followers should return testuser2', async () => {
    await global.twitch.followers(global.twitch, testuser)
    let when = await global.twitch.when()

    await message.isSent('followers', testuser, {
      lastFollowAgo: moment(when.followed_at).fromNow(),
      lastFollowUsername: testuser2.username,
      onlineFollowersCount: 0
    })
  })

  it('add testuser3 to cache', async () => {
    await global.twitch.addUserInFollowerCache(testuser3.username)
  })

  it('when.followed_at should not be empty', async () => {
    let when = await global.twitch.when()
    assert.isNumber(when.followed_at)
  })

  it('cached.followers should have 3 values', async () => {
    let cached = await global.twitch.cached()
    assert.isTrue(cached.followers.length === 3)
  })

  it('!followers should return testuser3', async () => {
    await global.twitch.followers(global.twitch, testuser)
    let when = await global.twitch.when()

    await message.isSent('followers', testuser, {
      lastFollowAgo: moment(when.followed_at).fromNow(),
      lastFollowUsername: testuser3.username,
      onlineFollowersCount: 0
    })
  })
})

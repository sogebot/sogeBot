/* global describe it before, after */
const {
  isMainThread
} = require('worker_threads');
if (!isMainThread) process.exit()


require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const variable = require('../../general.js').variable

const sinon = require('sinon')
const axios = require('axios')
const assert = require('assert')

describe('API - getLatest100Followers()', () => {
  before(async () => {
    await db.cleanup()
    await message.prepare()

    global.api.timeouts['getLatest100Followers'].isPaused = true

    global.oauth.channelId = '12345'
    await variable.isEqual('global.oauth.channelId', '12345')
    global.oauth.botAccessToken = 'foobar'
    await variable.isEqual('global.oauth.botAccessToken', 'foobar')
    global.oauth.botUsername = '__bot_username__'
    await variable.isEqual('global.oauth.botUsername', '__bot_username__')
  })

  after(() => {
    global.api.timeouts['getLatest100Followers'].isPaused = false
    global.oauth.channelId = ''
    global.oauth.botAccessToken = ''
  })

  describe('Example data', () => {
    // we are using mock https://api.twitch.tv/helix/users/follows?to_id=12345&first=100

    it('should be properly parsed', async () => {
      const status = await global.api.getLatest100Followers(false)
      assert(status.state, 'getLatest100Followers() unexpectedly failed')
    })

    it('should be two follow events', async () => {
      assert(global.events.fire.callCount === 2)
    })

    it('follow events should have correct usernames', async () => {
      assert(global.events.fire.calledWith('follow', { username: 'testfollow' }))
      assert(global.events.fire.calledWith('follow', { username: 'testfollow2' }))
    })

    it('second call should be properly parsed', async () => {
      const status = await global.api.getLatest100Followers(false)
      assert(status.state, 'getLatest100Followers() unexpectedly failed')
    })

    it('should be two follow events, expecting no change', async () => {
      assert(global.events.fire.callCount === 2)
    })

    it('follow events should have correct usernames', async () => {
      assert(global.events.fire.calledWith('follow', { username: 'testfollow' }))
      assert(global.events.fire.calledWith('follow', { username: 'testfollow2' }))
    })
  })
})

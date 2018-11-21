/* global describe it before, after */
if (require('cluster').isWorker) process.exit()

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const variable = require('../../general.js').variable

const sinon = require('sinon')
const axios = require('axios')
const assert = require('assert')

const exampleResponse = {
  headers: {
    'ratelimit-remaining': 800,
    'ratelimit-reset': 0,
    'ratelimit-limit': 800
  },
  'status': 200,
  'data': {
    'total': 12345,
    'data': [
      {
        'from_id': '171003792',
        'from_name': 'IIIsutha067III',
        'to_id': '23161357',
        'to_name': 'LIRIK',
        'followed_at': '2017-08-22T22:55:24Z'
      },
      {
        'from_id': '113627897',
        'from_name': 'Birdman616',
        'to_id': '23161357',
        'to_name': 'LIRIK',
        'followed_at': '2017-08-22T22:55:04Z'
      },
      {
        'from_id': '111',
        'from_name': 'testfollow',
        'to_id': '23161357',
        'to_name': 'LIRIK',
        'followed_at': String(new Date())
      },
      {
        'from_id': '222',
        'from_name': 'testfollow2',
        'to_id': '23161357',
        'to_name': 'LIRIK',
        'followed_at': String(new Date())
      },
      {
        'from_id': '333',
        'from_name': '__bot_username__',
        'to_id': '23161357',
        'to_name': 'LIRIK',
        'followed_at': String(new Date())
      }
    ],
    'pagination': {
      'cursor': 'eyJiIjpudWxsLCJhIjoiMTUwMzQ0MTc3NjQyNDQyMjAwMCJ9'
    } }
}

describe('API - getLatest100Followers()', () => {
  before(async () => {
    await db.cleanup()
    await message.prepare()

    global.api.timeouts['getLatest100Followers'].isPaused = true

    global.oauth.channelId = '12345'
    await variable.isEqual('global.oauth.channelId', '12345')
    global.oauth.settings.bot.accessToken = 'foobar'
    await variable.isEqual('global.oauth.settings.bot.accessToken', 'foobar')
    global.oauth.settings.bot.username = '__bot_username__'
    await variable.isEqual('global.oauth.settings.bot.username', '__bot_username__')
  })

  after(() => {
    global.api.timeouts['getLatest100Followers'].isPaused = false
    global.oauth.channelId = ''
    global.oauth.settings.bot.accessToken = ''
  })

  describe('Example data', () => {
    before(() => {
      const resolved = new Promise((resolve) => resolve(exampleResponse))
      sinon.stub(axios, 'get').returns(resolved)
    })

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

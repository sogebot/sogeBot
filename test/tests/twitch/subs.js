/* global describe it before */

require('../../general.js')

const db = require('../../general.js').db
const time = require('../../general.js').time
const message = require('../../general.js').message

const moment = require('moment')

const testuser = { username: 'testuser' }
const testuser2 = { username: 'testuser2' }
const testuser3 = { username: 'testuser3' }

describe('lib/twitch - subs()', () => {
  before(async () => {
    await db.cleanup()
    await message.prepare()
  })

  it('add testuser to event', async () => {
    await time.waitMs(100)
    await global.overlays.eventlist.add({
      type: 'sub',
      username: 'testuser'
    })
  })

  it('add testuser2 to event', async () => {
    await time.waitMs(100)
    await global.overlays.eventlist.add({
      type: 'sub',
      username: 'testuser2'
    })
  })

  it('!subs should return testuser2', async () => {
    let fromDb = await global.db.engine.findOne('widgetsEventList', { 'username': 'testuser2', type: 'sub' })
    global.twitch.subs({ sender: testuser })
    await message.isSent('subs', testuser, {
      lastSubAgo: moment(fromDb.timestamp).fromNow(),
      lastSubUsername: testuser2.username,
      onlineSubCount: 0
    })
  })

  it('add testuser3 to events', async () => {
    await time.waitMs(100)
    await global.overlays.eventlist.add({
      type: 'sub',
      username: 'testuser3'
    })
  })

  it('!subs should return testuser3', async () => {
    let fromDb = await global.db.engine.findOne('widgetsEventList', { 'username': 'testuser3', type: 'sub' })
    global.twitch.subs({ sender: testuser })
    await message.isSent('subs', testuser, {
      lastSubAgo: moment(fromDb.timestamp).fromNow(),
      lastSubUsername: testuser3.username,
      onlineSubCount: 0
    })
  })
})

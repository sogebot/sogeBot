/* global describe it before */
const {
  isMainThread
} = require('worker_threads');
if (!isMainThread) process.exit()
const commons = require('../../../dest/commons');


require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const constants = require('../../../dest/constants')

const moment = require('moment-timezone')

// users
const owner = { username: 'soge__' }

describe('Top - !top subage', () => {
  before(async () => {
    await db.cleanup()
    await message.prepare()
  })

  it ('Add 10 users into db and last user will don\'t have any subage', async () => {
    for (let i = 0; i < 10; i++) {
      const id = String(Math.floor(Math.random() * 100000))
      await global.db.engine.insert('users', {
        id,
        username: 'user' + i,
        is: {
          subscriber: true,
          moderator: Math.floor(Math.random()) === 1,
          follower: Math.floor(Math.random()) === 1
        },
        time: {
          subscribed_at: Date.now() - (constants.HOUR * i)
        }
      })
    }
  })

  it ('Add user with long subage but not subscriber', async () => {
    const id = String(Math.floor(Math.random() * 100000))
    await global.db.engine.insert('users', {
      id,
      username: 'user11',
      is: {
        subscriber: false
      },
      time: {
        subscribed_at: Date.now() - (constants.HOUR * 24 * 30)
      }
    })
  })

  it('run !top subage and expect correct output', async () => {
    global.systems.top.subage({ sender: { username: commons.getOwner() } })
    const dates = []
    for (let i = 0; i < 10; i++) {
      dates.push(`${moment.utc(Date.now() - (constants.HOUR * i)).format('L')} (${moment.utc(Date.now() - (constants.HOUR * i)).fromNow()})`)
    }
    await message.isSentRaw(`Top 10 (subage): 1. @user9 - ${dates[9]}, 2. @user8 - ${dates[8]}, 3. @user7 - ${dates[7]}, 4. @user6 - ${dates[6]}, 5. @user5 - ${dates[5]}, 6. @user4 - ${dates[4]}, 7. @user3 - ${dates[3]}, 8. @user2 - ${dates[2]}, 9. @user1 - ${dates[1]}, 10. @user0 - ${dates[0]}`, owner)
  })
})

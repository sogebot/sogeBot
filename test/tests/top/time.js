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

// users
const owner = { username: 'soge__' }

describe('Top - !top time', () => {
  before(async () => {
    await db.cleanup()
    await message.prepare()
  })

  it ('Add 10 users into db and last user will don\'t have any time', async () => {
    for (let i = 0; i < 10; i++) {
      const id = String(Math.floor(Math.random() * 100000))
      await global.db.engine.insert('users', {
        id,
        username: 'user' + i
      })
      if (i != 0) {
        await global.db.engine.insert('users.watched', {
          id, watched: i * constants.HOUR
        })
      }
    }
  })

  it('run !top time and expect correct output', async () => {
    global.systems.top.time({ sender: { username: commons.getOwner() } })
    await message.isSentRaw('Top 10 (watch time): 1. @user9 - 9.0h, 2. @user8 - 8.0h, 3. @user7 - 7.0h, 4. @user6 - 6.0h, 5. @user5 - 5.0h, 6. @user4 - 4.0h, 7. @user3 - 3.0h, 8. @user2 - 2.0h, 9. @user1 - 1.0h', owner)
  })
})

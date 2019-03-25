/* global describe it before */
const {
  isMainThread
} = require('worker_threads');
if (!isMainThread) process.exit()
const commons = require('../../../dest/commons');


require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

describe('Top - !top points', () => {
  before(async () => {
    await db.cleanup()
    await message.prepare()
  })

  it ('Add 10 users into db and last user will don\'t have any points', async () => {
    for (let i = 0; i < 10; i++) {
      const id = String(Math.floor(Math.random() * 100000))
      await global.db.engine.insert('users', {
        id,
        username: 'user' + i
      })
      if (i != 0) {
        await global.db.engine.insert('users.points', {
          id, points: i * 15
        })
      }
    }
  })

  it('run !top points and expect correct output', async () => {
    global.systems.top.points({ sender: { username: commons.getOwner() } })
    await message.isSentRaw('Top 10 (points): 1. @user9 - 135 points, 2. @user8 - 120 points, 3. @user7 - 105 points, 4. @user6 - 90 points, 5. @user5 - 75 points, 6. @user4 - 60 points, 7. @user3 - 45 points, 8. @user2 - 30 points, 9. @user1 - 15 points', owner)
  })
})

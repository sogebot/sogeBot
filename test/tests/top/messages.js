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

describe('Top - !top messages', () => {
  before(async () => {
    await db.cleanup()
    await message.prepare()
  })

  it ('Add 10 users into db and last user will don\'t have any messages', async () => {
    for (let i = 0; i < 10; i++) {
      const id = String(Math.floor(Math.random() * 100000))
      await global.db.engine.insert('users', {
        id,
        username: 'user' + i
      })
      if (i != 0) {
        await global.db.engine.insert('users.messages', {
          id, messages: i
        })
      }
    }
  })

  it('run !top messages and expect correct output', async () => {
    global.systems.top.messages({ sender: { username: commons.getOwner() } })
    await message.isSentRaw('Top 10 (messages): 1. @user9 - 9, 2. @user8 - 8, 3. @user7 - 7, 4. @user6 - 6, 5. @user5 - 5, 6. @user4 - 4, 7. @user3 - 3, 8. @user2 - 2, 9. @user1 - 1', owner)
  })
})

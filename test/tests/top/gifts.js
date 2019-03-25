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

describe('Top - !top gifts', () => {
  before(async () => {
    await db.cleanup()
    await message.prepare()
  })

  it ('Add 10 users into db and last user will don\'t have any gifts', async () => {
    for (let i = 0; i < 10; i++) {
      const id = String(Math.floor(Math.random() * 100000))
      await global.db.engine.insert('users', {
        id,
        username: 'user' + i,
        custom: {
          subgiftCount: i * 100
        }
      })
    }
  })

  it('run !top gifts and expect correct output', async () => {
    global.systems.top.gifts({ sender: { username: commons.getOwner() } })
    await message.isSentRaw('Top 10 (subgifts): 1. @user9 - 900, 2. @user8 - 800, 3. @user7 - 700, 4. @user6 - 600, 5. @user5 - 500, 6. @user4 - 400, 7. @user3 - 300, 8. @user2 - 200, 9. @user1 - 100, 10. @user0 - 0', owner)
  })
})

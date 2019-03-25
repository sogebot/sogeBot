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

describe('Top - !top tips', () => {
  before(async () => {
    await db.cleanup()
    await message.prepare()
  })

  it ('Add 10 users into db and last user will don\'t have any tips', async () => {
    for (let i = 0; i < 10; i++) {
      const id = String(Math.floor(Math.random() * 100000))
      await global.db.engine.insert('users', {
        id,
        username: 'user' + i
      })
      if (i != 0) {
        await global.db.engine.insert('users.tips', {
          id, amount: i, currency: 'EUR', message: 'test'
        })
      }
    }
  })

  it('run !top tips and expect correct output', async () => {
    global.systems.top.tips({ sender: { username: commons.getOwner() } })
    await message.isSentRaw('Top 10 (tips): 1. @user9 - 9.00€, 2. @user8 - 8.00€, 3. @user7 - 7.00€, 4. @user6 - 6.00€, 5. @user5 - 5.00€, 6. @user4 - 4.00€, 7. @user3 - 3.00€, 8. @user2 - 2.00€, 9. @user1 - 1.00€', owner)
  })
})

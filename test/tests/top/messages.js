/* global describe it before */
const commons = require('../../../dest/commons');


require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/entity/user');

// users
const owner = { username: 'soge__' };

describe('Top - !top messages', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it ('Add 10 users into db and last user will don\'t have any messages', async () => {
    for (let i = 0; i < 10; i++) {
      if (i === 0) {
        continue;
      }
      let user = new User();
      user.userId = Math.floor(Math.random() * 100000);
      user.username = 'user' + i;
      user.messages = i;
      user = await getRepository(User).save(user);
    }
  });

  it('run !top messages and expect correct output', async () => {
    global.systems.top.messages({ sender: { username: commons.getOwner() } });
    await message.isSentRaw('Top 10 (messages): 1. @user9 - 9, 2. @user8 - 8, 3. @user7 - 7, 4. @user6 - 6, 5. @user5 - 5, 6. @user4 - 4, 7. @user3 - 3, 8. @user2 - 2, 9. @user1 - 1, 10. @user0 - 0', owner);
  });
});

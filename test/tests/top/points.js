/* global describe it before */
const commons = require('../../../dest/commons');


require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');

// users
const owner = { username: 'soge__' };

describe('Top - !top points', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it ('Add 10 users into db and last user will don\'t have any points', async () => {
    for (let i = 0; i < 10; i++) {
      let user = new User();
      user.userId = Math.floor(Math.random() * 100000);
      user.username = 'user' + i;
      user.points = i * 15;
      user = await getRepository(User).save(user);
    }
  });

  it('run !top points and expect correct output', async () => {
    global.systems.top.points({ sender: { username: commons.getOwner() } });
    await message.isSentRaw('Top 10 (points): 1. @user9 - 135 points, 2. @user8 - 120 points, 3. @user7 - 105 points, 4. @user6 - 90 points, 5. @user5 - 75 points, 6. @user4 - 60 points, 7. @user3 - 45 points, 8. @user2 - 30 points, 9. @user1 - 15 points, 10. @user0 - 0 points', owner);
  });

  it('add user1 to ignore list', async () => {
    global.tmi.ignoreAdd({ sender: owner, parameters: 'user0' });
    await message.isSent('ignore.user.is.added', owner, { username: 'user0' });
  });

  it('run !top points and expect correct output', async () => {
    global.systems.top.points({ sender: { username: commons.getOwner() } });
    await message.isSentRaw('Top 10 (points): 1. @user9 - 135 points, 2. @user8 - 120 points, 3. @user7 - 105 points, 4. @user6 - 90 points, 5. @user5 - 75 points, 6. @user4 - 60 points, 7. @user3 - 45 points, 8. @user2 - 30 points, 9. @user1 - 15 points', owner);
  });
});

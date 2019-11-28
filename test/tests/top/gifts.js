/* global describe it before */
const commons = require('../../../dest/commons');

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');

const top = (require('../../../dest/systems/top')).default;
const tmi = (require('../../../dest/tmi')).default;

// users
const owner = { username: 'soge__' };

describe('Top - !top gifts', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it ('Add 10 users into db and last user will don\'t have any gifts', async () => {
    for (let i = 0; i < 10; i++) {
      let user = new User();
      user.userId = Math.floor(Math.random() * 100000);
      user.username = 'user' + i;
      user.giftedSubscribes = i * 100;
      user = await getRepository(User).save(user);
    }
  });

  it('run !top gifts and expect correct output', async () => {
    top.gifts({ sender: { username: commons.getOwner() } });
    await message.isSentRaw('Top 10 (subgifts): 1. @user9 - 900, 2. @user8 - 800, 3. @user7 - 700, 4. @user6 - 600, 5. @user5 - 500, 6. @user4 - 400, 7. @user3 - 300, 8. @user2 - 200, 9. @user1 - 100, 10. @user0 - 0', owner);
  });

  it('add user1 to ignore list', async () => {
    tmi.ignoreAdd({ sender: owner, parameters: 'user0' });
    await message.isSent('ignore.user.is.added', owner, { username: 'user0' });
  });

  it('run !top gifts and expect correct output', async () => {
    top.gifts({ sender: { username: commons.getOwner() } });
    await message.isSentRaw('Top 10 (subgifts): 1. @user9 - 900, 2. @user8 - 800, 3. @user7 - 700, 4. @user6 - 600, 5. @user5 - 500, 6. @user4 - 400, 7. @user3 - 300, 8. @user2 - 200, 9. @user1 - 100', owner);
  });
});

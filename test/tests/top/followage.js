/* global describe it before */
const commons = require('../../../dest/commons');


require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const constants = require('../../../dest/constants');

const moment = require('moment-timezone');

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');

// users
const owner = { username: 'soge__' };

describe('Top - !top followage', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it ('Add 10 users into db and last user will don\'t have any followage', async () => {
    for (let i = 0; i < 10; i++) {
      const user = new User();
      user.userId = Math.floor(Math.random() * 100000);
      user.username = 'user' + i;
      user.isFollower = true;
      user.followedAt = Date.now() - (constants.HOUR * i);
      await getRepository(User).save(user);
    }
  });

  it ('Add user with long followage but not follower', async () => {
    const user = new User();
    user.userId = Math.floor(Math.random() * 100000);
    user.username = 'user11';
    user.isFollower = false;
    user.followedAt = Date.now() - (constants.HOUR * 24 * 30);
    await getRepository(User).save(user);
  });

  it('run !top followage and expect correct output', async () => {
    global.systems.top.followage({ sender: { username: commons.getOwner() } });
    const dates = [];
    for (let i = 0; i < 10; i++) {
      dates.push(`${moment.utc(Date.now() - (constants.HOUR * i)).format('L')} (${moment.utc(Date.now() - (constants.HOUR * i)).fromNow()})`);
    }
    await message.isSentRaw(`Top 10 (followage): 1. @user9 - ${dates[9]}, 2. @user8 - ${dates[8]}, 3. @user7 - ${dates[7]}, 4. @user6 - ${dates[6]}, 5. @user5 - ${dates[5]}, 6. @user4 - ${dates[4]}, 7. @user3 - ${dates[3]}, 8. @user2 - ${dates[2]}, 9. @user1 - ${dates[1]}, 10. @user0 - ${dates[0]}`, owner);
  });

  it('add user0 to ignore list', async () => {
    global.tmi.ignoreAdd({ sender: owner, parameters: 'user0' });
    await message.isSent('ignore.user.is.added', owner, { username: 'user0' });
  });

  it('run !top followage and expect correct output', async () => {
    global.systems.top.followage({ sender: { username: commons.getOwner() } });
    const dates = [];
    for (let i = 0; i < 10; i++) {
      dates.push(`${moment.utc(Date.now() - (constants.HOUR * i)).format('L')} (${moment.utc(Date.now() - (constants.HOUR * i)).fromNow()})`);
    }
    await message.isSentRaw(`Top 10 (followage): 1. @user9 - ${dates[9]}, 2. @user8 - ${dates[8]}, 3. @user7 - ${dates[7]}, 4. @user6 - ${dates[6]}, 5. @user5 - ${dates[5]}, 6. @user4 - ${dates[4]}, 7. @user3 - ${dates[3]}, 8. @user2 - ${dates[2]}, 9. @user1 - ${dates[1]}`, owner);
  });
});

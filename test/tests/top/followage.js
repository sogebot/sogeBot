/* global describe it before */
const commons = require('../../../dest/commons');


require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const constants = require('../../../dest/constants');

const top = (require('../../../dest/systems/top')).default;
const tmi = (require('../../../dest/tmi')).default;

const moment = require('moment-timezone');

const { prepare } = require('../../../dest/commons');
const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');
const assert = require('assert');

// users
const owner = { username: 'soge__' };

describe('Top - !top followage', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it ('Add 10 users into db and last user will don\'t have any followage', async () => {
    for (let i = 0; i < 10; i++) {
      await getRepository(User).save({
        userId: Math.floor(Math.random() * 100000),
        username: 'user' + i,
        isFollower: true,
        followedAt: Date.now() - (constants.HOUR * i),
      });
    }
  });

  it ('Add user with long followage but not follower', async () => {
    await getRepository(User).save({
      userId: Math.floor(Math.random() * 100000),
      username: 'user11',
      isFollower: false,
      followedAt: Date.now() - (constants.HOUR * 24 * 30),
    });
  });

  it('run !top followage and expect correct output', async () => {
    const r = await top.followage({ sender: { username: commons.getOwner() } });
    const dates = [];
    for (let i = 0; i < 10; i++) {
      dates.push(`${moment.utc(Date.now() - (constants.HOUR * i)).format('L')} (${moment.utc(Date.now() - (constants.HOUR * i)).fromNow()})`);
    }
    assert.strictEqual(r[0].response, `Top 10 (followage): 1. @user9 - ${dates[9]}, 2. @user8 - ${dates[8]}, 3. @user7 - ${dates[7]}, 4. @user6 - ${dates[6]}, 5. @user5 - ${dates[5]}, 6. @user4 - ${dates[4]}, 7. @user3 - ${dates[3]}, 8. @user2 - ${dates[2]}, 9. @user1 - ${dates[1]}, 10. @user0 - ${dates[0]}`, owner);
  });

  it('add user0 to ignore list', async () => {
    const r = await tmi.ignoreAdd({ sender: owner, parameters: 'user0' });
    assert.strictEqual(r[0].response, prepare('ignore.user.is.added' , { username: 'user0' }));
  });

  it('run !top followage and expect correct output', async () => {
    const r = await top.followage({ sender: { username: commons.getOwner() } });
    const dates = [];
    for (let i = 0; i < 10; i++) {
      dates.push(`${moment.utc(Date.now() - (constants.HOUR * i)).format('L')} (${moment.utc(Date.now() - (constants.HOUR * i)).fromNow()})`);
    }
    assert.strictEqual(r[0].response, `Top 10 (followage): 1. @user9 - ${dates[9]}, 2. @user8 - ${dates[8]}, 3. @user7 - ${dates[7]}, 4. @user6 - ${dates[6]}, 5. @user5 - ${dates[5]}, 6. @user4 - ${dates[4]}, 7. @user3 - ${dates[3]}, 8. @user2 - ${dates[2]}, 9. @user1 - ${dates[1]}`, owner);
  });
});

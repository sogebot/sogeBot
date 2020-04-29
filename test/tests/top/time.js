/* global describe it before */
const commons = require('../../../dest/commons');


require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const constants = require('../../../dest/constants');

const top = (require('../../../dest/systems/top')).default;
const tmi = (require('../../../dest/tmi')).default;

const { prepare } = require('../../../dest/commons');
const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');
const assert = require('assert');

// users
const owner = { username: 'soge__' };

describe('Top - !top time', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it ('Add 10 users into db and last user will don\'t have any time', async () => {
    for (let i = 0; i < 10; i++) {
      await getRepository(User).save({
        userId: Math.floor(Math.random() * 100000),
        username: 'user' + i,
        watchedTime: i * constants.HOUR,
      });
    }
  });

  it('run !top time and expect correct output', async () => {
    const r = await top.time({ sender: { username: commons.getOwner() } });
    assert.strictEqual(r[0].response, 'Top 10 (watch time): 1. @user9 - 9.0h, 2. @user8 - 8.0h, 3. @user7 - 7.0h, 4. @user6 - 6.0h, 5. @user5 - 5.0h, 6. @user4 - 4.0h, 7. @user3 - 3.0h, 8. @user2 - 2.0h, 9. @user1 - 1.0h, 10. @user0 - 0.0h', owner);
  });

  it('add user0 to ignore list', async () => {
    const r = await tmi.ignoreAdd({ sender: owner, parameters: 'user0' });
    assert.strictEqual(r[0].response, prepare('ignore.user.is.added' , { username: 'user0' }));
  });

  it('run !top time and expect correct output', async () => {
    const r = await top.time({ sender: { username: commons.getOwner() } });
    assert.strictEqual(r[0].response, 'Top 10 (watch time): 1. @user9 - 9.0h, 2. @user8 - 8.0h, 3. @user7 - 7.0h, 4. @user6 - 6.0h, 5. @user5 - 5.0h, 6. @user4 - 4.0h, 7. @user3 - 3.0h, 8. @user2 - 2.0h, 9. @user1 - 1.0h', owner);
  });
});

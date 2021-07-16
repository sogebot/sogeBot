/* global describe it before */
const assert = require('assert');

require('../../general.js');
const constants = require('@sogebot/ui-helpers/constants');
const { getRepository } = require('typeorm');

const { User } = require('../../../dest/database/entity/user');
const { getOwner } = require('../../../dest/helpers/commons/getOwner');
const { prepare } = require('../../../dest/helpers/commons/prepare');
const top = (require('../../../dest/systems/top')).default;
const tmi = (require('../../../dest/tmi')).default;
const db = require('../../general.js').db;
const message = require('../../general.js').message;

// users
const owner = { username: '__broadcaster__' };

describe('Top - !top time', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it ('Add 10 users into db and last user will don\'t have any time', async () => {
    for (let i = 0; i < 10; i++) {
      await getRepository(User).save({
        userId:      String(Math.floor(Math.random() * 100000)),
        username:    'user' + i,
        watchedTime: i * constants.HOUR,
      });
    }
  });

  it('run !top time and expect correct output', async () => {
    const r = await top.time({ sender: { username: getOwner() } });
    assert.strictEqual(r[0].response, 'Top 10 (watch time): 1. @user9 - 9.0 hr, 2. @user8 - 8.0 hr, 3. @user7 - 7.0 hr, 4. @user6 - 6.0 hr, 5. @user5 - 5.0 hr, 6. @user4 - 4.0 hr, 7. @user3 - 3.0 hr, 8. @user2 - 2.0 hr, 9. @user1 - 1.0 hr, 10. @user0 - 0.0 hr', owner);
  });

  it('add user0 to ignore list', async () => {
    const r = await tmi.ignoreAdd({ sender: owner, parameters: 'user0' });
    assert.strictEqual(r[0].response, prepare('ignore.user.is.added' , { username: 'user0' }));
  });

  it('run !top time and expect correct output', async () => {
    const r = await top.time({ sender: { username: getOwner() } });
    assert.strictEqual(r[0].response, 'Top 10 (watch time): 1. @user9 - 9.0 hr, 2. @user8 - 8.0 hr, 3. @user7 - 7.0 hr, 4. @user6 - 6.0 hr, 5. @user5 - 5.0 hr, 6. @user4 - 4.0 hr, 7. @user3 - 3.0 hr, 8. @user2 - 2.0 hr, 9. @user1 - 1.0 hr', owner);
  });
});

/* global describe it before */
const { getOwner } = require('../../../dest/helpers/commons/getOwner');

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const { User } = require('../../../dest/database/entity/user');

const { prepare } = require('../../../dest/helpers/commons/prepare');
const top = (require('../../../dest/systems/top')).default;
const assert = require('assert');
const { AppDataSource } = require('../../../dest/database');
const twitch = require('../../../dest/services/twitch.js').default;

// users
const owner = { userName: '__broadcaster__' };

describe('Top - !top points - @func3', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it ('Add 10 users into db and last user will don\'t have any points', async () => {
    for (let i = 0; i < 10; i++) {
      user = await AppDataSource.getRepository(User).save({
        userId: String(Math.floor(Math.random() * 100000)),
        userName: 'user' + i,
        points: i * 15,
      });
    }
  });

  it('run !top points and expect correct output', async () => {
    const r = await top.points({ sender: { userName: getOwner() } });
    assert.strictEqual(r[0].response, 'Top 10 (points): 1. @user9 - 135 points, 2. @user8 - 120 points, 3. @user7 - 105 points, 4. @user6 - 90 points, 5. @user5 - 75 points, 6. @user4 - 60 points, 7. @user3 - 45 points, 8. @user2 - 30 points, 9. @user1 - 15 points, 10. @user0 - 0 points', owner);
  });

  it('add user0 to ignore list', async () => {
    const r = await twitch.ignoreAdd({ sender: owner, parameters: 'user0' });
    assert.strictEqual(r[0].response, prepare('ignore.user.is.added' , { userName: 'user0' }));
  });

  it('run !top points and expect correct output', async () => {
    const r = await top.points({ sender: { userName: getOwner() } });
    assert.strictEqual(r[0].response, 'Top 10 (points): 1. @user9 - 135 points, 2. @user8 - 120 points, 3. @user7 - 105 points, 4. @user6 - 90 points, 5. @user5 - 75 points, 6. @user4 - 60 points, 7. @user3 - 45 points, 8. @user2 - 30 points, 9. @user1 - 15 points', owner);
  });
});

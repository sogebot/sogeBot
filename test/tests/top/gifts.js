/* global describe it before */
const assert = require('assert');

require('../../general.js');

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

describe('Top - !top gifts', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it ('Add 10 users into db and last user will don\'t have any gifts', async () => {
    for (let i = 0; i < 10; i++) {
      await getRepository(User).save({
        userId:           String(Math.floor(Math.random() * 100000)),
        username:         'user' + i,
        giftedSubscribes: i * 100,
      });
    }
  });

  it('run !top gifts and expect correct output', async () => {
    const r = await top.gifts({ sender: { username: getOwner() } });
    assert.strictEqual(r[0].response, 'Top 10 (subgifts): 1. @user9 - 900, 2. @user8 - 800, 3. @user7 - 700, 4. @user6 - 600, 5. @user5 - 500, 6. @user4 - 400, 7. @user3 - 300, 8. @user2 - 200, 9. @user1 - 100, 10. @user0 - 0', owner);
  });

  it('add user0 to ignore list', async () => {
    const r = await tmi.ignoreAdd({ sender: owner, parameters: 'user0' });
    assert.strictEqual(r[0].response, prepare('ignore.user.is.added' , { username: 'user0' }));
  });

  it('run !top gifts and expect correct output', async () => {
    const r = await top.gifts({ sender: { username: getOwner() } });
    assert.strictEqual(r[0].response, 'Top 10 (subgifts): 1. @user9 - 900, 2. @user8 - 800, 3. @user7 - 700, 4. @user6 - 600, 5. @user5 - 500, 6. @user4 - 400, 7. @user3 - 300, 8. @user2 - 200, 9. @user1 - 100', owner);
  });
});

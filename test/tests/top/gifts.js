/* global describe it before */
import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js';

import('../../general.js');

import { User } from '../../../dest/database/entity/user.js';
import { getOwner } from '../../../dest/helpers/commons/getOwner.js';
import { prepare } from '../../../dest/helpers/commons/prepare.js';
import top from '../../../dest/systems/top.js';
import { db } from '../../general.js';
import { message } from '../../general.js';
import twitch from '../../../dest/services/twitch.js';

// users
const owner = { userName: '__broadcaster__' };

describe('Top - !top gifts - @func3', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it ('Add 10 users into db and last user will don\'t have any gifts', async () => {
    for (let i = 0; i < 10; i++) {
      await AppDataSource.getRepository(User).save({
        userId:           String(Math.floor(Math.random() * 100000)),
        userName:         'user' + i,
        giftedSubscribes: i * 100,
      });
    }
  });

  it('run !top gifts and expect correct output', async () => {
    const r = await top.gifts({ sender: { userName: getOwner() } });
    assert.strictEqual(r[0].response, 'Top 10 (subgifts): 1. @user9 - 900, 2. @user8 - 800, 3. @user7 - 700, 4. @user6 - 600, 5. @user5 - 500, 6. @user4 - 400, 7. @user3 - 300, 8. @user2 - 200, 9. @user1 - 100, 10. @user0 - 0', owner);
  });

  it('add user0 to ignore list', async () => {
    const r = await twitch.ignoreAdd({ sender: owner, parameters: 'user0' });
    assert.strictEqual(r[0].response, prepare('ignore.user.is.added' , { userName: 'user0' }));
  });

  it('run !top gifts and expect correct output', async () => {
    const r = await top.gifts({ sender: { userName: getOwner() } });
    assert.strictEqual(r[0].response, 'Top 10 (subgifts): 1. @user9 - 900, 2. @user8 - 800, 3. @user7 - 700, 4. @user6 - 600, 5. @user5 - 500, 6. @user4 - 400, 7. @user3 - 300, 8. @user2 - 200, 9. @user1 - 100', owner);
  });
});

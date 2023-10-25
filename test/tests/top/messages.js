/* global describe it before */
import { getOwner } from '../../../dest/helpers/commons/getOwner.js';

import('../../general.js');

import { db } from '../../general.js';
import { message } from '../../general.js';

import top from '../../../dest/systems/top.js';

import { prepare } from '../../../dest/helpers/commons/prepare.js';
import { User } from '../../../dest/database/entity/user.js';
import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js'
import twitch from '../../../dest/services/twitch.js';

// users
const owner = { userName: '__broadcaster__' };

describe('Top - !top messages - @func2', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it ('Add 10 users into db and last user will don\'t have any messages', async () => {
    for (let i = 0; i < 10; i++) {
      await AppDataSource.getRepository(User).save({
        userId: String(Math.floor(Math.random() * 100000)),
        userName: 'user' + i,
        messages: i,
      });
    }
  });

  it('run !top messages and expect correct output', async () => {
    const r = await top.messages({ sender: { userName: getOwner() } });
    assert.strictEqual(r[0].response, 'Top 10 (messages): 1. @user9 - 9, 2. @user8 - 8, 3. @user7 - 7, 4. @user6 - 6, 5. @user5 - 5, 6. @user4 - 4, 7. @user3 - 3, 8. @user2 - 2, 9. @user1 - 1, 10. @user0 - 0', owner);
  });

  it('add user0 to ignore list', async () => {
    const r = await twitch.ignoreAdd({ sender: owner, parameters: 'user0' });
    assert.strictEqual(r[0].response, prepare('ignore.user.is.added' , { userName: 'user0' }));
  });

  it('run !top messages and expect correct output', async () => {
    const r = await top.messages({ sender: { userName: getOwner() } });
    assert.strictEqual(r[0].response, 'Top 10 (messages): 1. @user9 - 9, 2. @user8 - 8, 3. @user7 - 7, 4. @user6 - 6, 5. @user5 - 5, 6. @user4 - 4, 7. @user3 - 3, 8. @user2 - 2, 9. @user1 - 1', owner);
  });
});

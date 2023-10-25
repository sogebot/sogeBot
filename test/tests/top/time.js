/* global describe it before */
import assert from 'assert';

import('../../general.js');
import constants from '@sogebot/ui-helpers/constants.js';

import { User } from '../../../dest/database/entity/user.js';
import { getOwner } from '../../../dest/helpers/commons/getOwner.js';
import { prepare } from '../../../dest/helpers/commons/prepare.js';
import { AppDataSource } from '../../../dest/database.js';
import top from '../../../dest/systems/top.js';
import { db } from '../../general.js';
import { message } from '../../general.js';
import twitch from '../../../dest/services/twitch.js';

// users
const owner = { userName: '__broadcaster__' };

describe('Top - !top time - @func3', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it ('Add 10 users into db and last user will don\'t have any time', async () => {
    for (let i = 0; i < 10; i++) {
      await AppDataSource.getRepository(User).save({
        userId:      String(Math.floor(Math.random() * 100000)),
        userName:    'user' + i,
        watchedTime: i * constants.HOUR,
      });
    }
  });

  it('run !top time and expect correct output', async () => {
    const r = await top.time({ sender: { userName: getOwner() } });
    assert.strictEqual(r[0].response, 'Top 10 (watch time): 1. @user9 - 9.0 hr, 2. @user8 - 8.0 hr, 3. @user7 - 7.0 hr, 4. @user6 - 6.0 hr, 5. @user5 - 5.0 hr, 6. @user4 - 4.0 hr, 7. @user3 - 3.0 hr, 8. @user2 - 2.0 hr, 9. @user1 - 1.0 hr, 10. @user0 - 0.0 hr', owner);
  });

  it('add user0 to ignore list', async () => {
    const r = await twitch.ignoreAdd({ sender: owner, parameters: 'user0' });
    assert.strictEqual(r[0].response, prepare('ignore.user.is.added' , { userName: 'user0' }));
  });

  it('run !top time and expect correct output', async () => {
    const r = await top.time({ sender: { userName: getOwner() } });
    assert.strictEqual(r[0].response, 'Top 10 (watch time): 1. @user9 - 9.0 hr, 2. @user8 - 8.0 hr, 3. @user7 - 7.0 hr, 4. @user6 - 6.0 hr, 5. @user5 - 5.0 hr, 6. @user4 - 4.0 hr, 7. @user3 - 3.0 hr, 8. @user2 - 2.0 hr, 9. @user1 - 1.0 hr', owner);
  });
});

/* global describe it before */
import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js';

import('../../general.js');

const currency = (await import('../../../dest/currency.js')).default;
import twitch  from '../../../dest/services/twitch.js'
import { User, UserBit } from '../../../dest/database/entity/user.js';
import { getOwner } from '../../../dest/helpers/commons/getOwner.js';
import { prepare } from '../../../dest/helpers/commons/prepare.js';
import top from '../../../dest/systems/top.js';
import { db } from '../../general.js';
import { message } from '../../general.js';

// users
const owner = { userName: '__broadcaster__' };

describe('Top - !top bits - @func1', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it ('Add 10 users into db and last user will don\'t have any bits', async () => {
    for (let i = 0; i < 10; i++) {
      const userId = String(Math.floor(Math.random() * 100000));
      const bits = [];
      const user = { ...await AppDataSource.getRepository(User).save({ userId, userName: 'user' + i }) };

      if (i === 0) {
        continue;
      }

      for (let j = 0; j <= i; j++) {
        bits.push({
          amount:    j,
          cheeredAt: Date.now(),
          message:   '',
          userId,
        });
      }
      await AppDataSource.getRepository(UserBit).save(bits);
    }
  });

  it('run !top bits and expect correct output', async () => {
    const r = await top.bits({ sender: { userName: getOwner() } });
    assert.strictEqual(r[0].response, 'Top 10 (bits): 1. @user9 - 45, 2. @user8 - 36, 3. @user7 - 28, 4. @user6 - 21, 5. @user5 - 15, 6. @user4 - 10, 7. @user3 - 6, 8. @user2 - 3, 9. @user1 - 1');
  });

  it('add user1 to ignore list', async () => {
    const r = await twitch.ignoreAdd({ sender: owner, parameters: 'user1' });
    assert.strictEqual(r[0].response, prepare('ignore.user.is.added' , { userName: 'user1' }));
  });

  it('run !top bits and expect correct output', async () => {
    const r = await top.bits({ sender: { userName: getOwner() } });
    assert.strictEqual(r[0].response, 'Top 10 (bits): 1. @user9 - 45, 2. @user8 - 36, 3. @user7 - 28, 4. @user6 - 21, 5. @user5 - 15, 6. @user4 - 10, 7. @user3 - 6, 8. @user2 - 3');
  });
});

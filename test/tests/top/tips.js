/* global */
import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js';

import('../../general.js');

const currency = (await import('../../../dest/currency.js')).default;
import { User, UserTip } from '../../../dest/database/entity/user.js';
import { getOwner } from '../../../dest/helpers/commons/getOwner.js';
import { prepare } from '../../../dest/helpers/commons/prepare.js';
import rates from '../../../dest/helpers/currency/rates.js';
import twitch from '../../../dest/services/twitch.js';
import top from '../../../dest/systems/top.js';
import { db } from '../../general.js';
import { message } from '../../general.js';

// users
const owner = { userName: '__broadcaster__' };

describe('Top - !top tips - @func1', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it ('Add 10 users into db and last user will don\'t have any tips', async () => {
    for (let i = 0; i < 10; i++) {
      const userId = String(Math.floor(Math.random() * 100000));
      const tips = [];
      const user = { ...await AppDataSource.getRepository(User).save({ userId, userName: 'user' + i }) };

      if (i === 0) {
        continue;
      }

      for (let j = 0; j <= i; j++) {
        tips.push({
          amount:        j,
          sortAmount:    2*j,
          currency:      'EUR',
          message:       'test',
          timestamp:     Date.now(),
          exchangeRates: rates,
          userId,
        });
      }
      await AppDataSource.getRepository(UserTip).save(tips);
    }
  });

  it('Update change rates', async() => {
    await currency.recalculateSortAmount();
  });

  it('run !top tips and expect correct output', async () => {
    const r = await top.tips({ sender: { userName: getOwner() } });
    assert.strictEqual(r[0].response, 'Top 10 (tips): 1. @user9 - €45.00, 2. @user8 - €36.00, 3. @user7 - €28.00, 4. @user6 - €21.00, 5. @user5 - €15.00, 6. @user4 - €10.00, 7. @user3 - €6.00, 8. @user2 - €3.00, 9. @user1 - €1.00', owner);
  });

  it('add user1 to ignore list', async () => {
    const r = await twitch.ignoreAdd({ sender: owner, parameters: 'user1' });
    assert.strictEqual(r[0].response, prepare('ignore.user.is.added' , { userName: 'user1' }));
  });

  it('run !top tips and expect correct output', async () => {
    const r = await top.tips({ sender: { userName: getOwner() } });
    assert.strictEqual(r[0].response, 'Top 10 (tips): 1. @user9 - €45.00, 2. @user8 - €36.00, 3. @user7 - €28.00, 4. @user6 - €21.00, 5. @user5 - €15.00, 6. @user4 - €10.00, 7. @user3 - €6.00, 8. @user2 - €3.00', owner);
  });
});

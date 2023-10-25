/* global describe it before */

import assert from 'assert';

import _ from 'lodash-es';
import { AppDataSource } from '../../../dest/database.js';

import('../../general.js');

import { User } from '../../../dest/database/entity/user.js';
import points from '../../../dest/systems/points.js';
import { db } from '../../general.js';
import { message } from '../../general.js';

const user = { userName: 'oneuser', userId: String(_.random(999999, false)) };

describe('Points - set() - @func1', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  describe('Points should be correctly set, not added', () => {
    it('create user', async () => {
      await AppDataSource.getRepository(User).save({ userName: user.userName, userId: user.userId });
    });

    it('!points get should return 0', async () => {
      const r = await points.get({ sender: user, parameters: '' });
      assert.strictEqual(r[0].response, `@oneuser has currently 0 points. Your position is 1/1.`);
    });

    it('!points set should correctly set value 5', async () => {
      const r = await points.set({ sender: user, parameters: user.userName + ' 5' });
      assert.strictEqual(r[0].response, `@oneuser was set to 5 points`);
    });

    it('!points get should return 5', async () => {
      const r = await points.get({ sender: user, parameters: '' });
      assert.strictEqual(r[0].response, `@oneuser has currently 5 points. Your position is 1/1.`);
    });

    it('!points set should correctly set value 10', async () => {
      const r = await points.set({ sender: user, parameters: user.userName + ' 10' });
      assert.strictEqual(r[0].response, `@oneuser was set to 10 points`);
    });

    it('!points get should return 10', async () => {
      const r = await points.get({ sender: user, parameters: '' });
      assert.strictEqual(r[0].response, `@oneuser has currently 10 points. Your position is 1/1.`);
    });
  });
});

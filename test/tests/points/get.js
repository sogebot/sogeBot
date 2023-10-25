/* global describe it before */

import('../../general.js');

import assert from 'assert';

import _ from 'lodash-es';
import { AppDataSource } from '../../../dest/database.js';

import { User } from '../../../dest/database/entity/user.js';
import points from '../../../dest/systems/points.js';
import { db } from '../../general.js';
import { message } from '../../general.js';

const hugePointsUser = {
  userName: 'hugeuser', points: 99999999999999999999999999999999, userId: String(_.random(999999, false)),
};
const tinyPointsUser = {
  userName: 'tinyuser', points: 100, userId: String(_.random(999999, false)),
};

describe('Points - get() - @func1', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  describe('User with more than safe points should return safe points', () => {
    it('create user with huge amount of points', async () => {
      await AppDataSource.getRepository(User).save({
        userName: hugePointsUser.userName, userId: hugePointsUser.userId, points: hugePointsUser.points,
      });
    });

    it('points should be returned in safe points bounds', async () => {
      const r = await points.get({ sender: hugePointsUser, parameters: '' });
      assert.strictEqual(r[0].response, '@hugeuser has currently 9007199254740991 points. Your position is 1/1.');
    });
  });

  describe('User with less than safe points should return unchanged points', () => {
    it('create user with normal amount of points', async () => {
      await AppDataSource.getRepository(User).save({
        userName: tinyPointsUser.userName, userId: tinyPointsUser.userId, points: tinyPointsUser.points,
      });
    });

    it('points should be returned in safe points bounds', async () => {
      const r = await points.get({ sender: tinyPointsUser, parameters: '' });
      assert.strictEqual(r[0].response, '@tinyuser has currently 100 points. Your position is 2/2.');
    });
  });

  describe('Users should have correct order', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
    });

    for (let i = 1; i <= 10; i++) {
      it(`create user${i} with ${i*100} points`, async () => {
        await AppDataSource.getRepository(User).save({
          userName: `user${i}`, userId: String(i), points: i*100,
        });
      });
    }

    for (let i = 1; i <= 10; i++) {
      it(`user${i} should have correct order and position`, async () => {
        const r = await points.get({ sender: { userName: `user${i}`, userId: String(i) }, parameters: '' });
        assert.strictEqual(r[0].response, `@user${i} has currently ${i*100} points. Your position is ${11-i}/10.`);
      });
    }
  });
});

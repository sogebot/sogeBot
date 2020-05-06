/* global describe it before */

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const assert = require('assert');
const _ = require('lodash');

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');

const points = (require('../../../dest/systems/points')).default;

const hugePointsUser = { username: 'hugeuser', points: 99999999999999999999999999999999, userId: Number(_.random(999999, false)) };
const tinyPointsUser = { username: 'tinyuser', points: 100, userId: Number(_.random(999999, false)) };

describe('Points - get()', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  describe('User with more than safe points should return safe points', () => {
    it('create user with huge amount of points', async () => {
      await getRepository(User).save({ username: hugePointsUser.username, userId: hugePointsUser.userId, points: hugePointsUser.points });
    });

    it('points should be returned in safe points bounds', async () => {
      const r = await points.get({ sender: hugePointsUser, parameters: '' });
      assert.strictEqual(r[0].response, '@hugeuser has currently 9007199254740991 points. Your position is 1/1.');
    });
  });

  describe('User with less than safe points should return unchanged points', () => {
    it('create user with normal amount of points', async () => {
      await getRepository(User).save({ username: tinyPointsUser.username, userId: tinyPointsUser.userId, points: tinyPointsUser.points });
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
        await getRepository(User).save({ username: `user${i}`, userId: i, points: i*100 });
      });
    }

    for (let i = 1; i <= 10; i++) {
      it(`user${i} should have correct order and position`, async () => {
        const r = await points.get({ sender: { username: `user${i}`, userId: i }, parameters: '' });
        assert.strictEqual(r[0].response, `@user${i} has currently ${i*100} points. Your position is ${11-i}/10.`);
      });
    }
  });
});

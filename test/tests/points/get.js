/* global describe it before */

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
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
      await points.get({ sender: hugePointsUser, parameters: '' });
      await message.isSent('points.defaults.pointsResponse', { username: hugePointsUser.username }, {
        amount: Math.floor(Number.MAX_SAFE_INTEGER),
        username: hugePointsUser.username,
        pointsName: await points.getPointsName(Math.floor(Number.MAX_SAFE_INTEGER)),
        count: 1, order: 1,
      });
    });
  });

  describe('User with less than safe points should return unchanged points', () => {
    it('create user with normal amount of points', async () => {
      await getRepository(User).save({ username: tinyPointsUser.username, userId: tinyPointsUser.userId, points: tinyPointsUser.points });
    });

    it('points should be returned in safe points bounds', async () => {
      await points.get({ sender: tinyPointsUser, parameters: '' });
      await message.isSent('points.defaults.pointsResponse', { username: tinyPointsUser.username }, {
        amount: 100,
        username: tinyPointsUser.username,
        pointsName: await points.getPointsName(100),
        count: 2, order: 2,
      });
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
        await points.get({ sender: { username: `user${i}`, userId: i }, parameters: '' });
        await message.isSent('points.defaults.pointsResponse', { username: `user${i}` }, {
          amount: i * 100,
          username: `user${i}`,
          pointsName: await points.getPointsName(i * 100),
          count: 10, order: 10 - (i - 1),
        });
      });
    }
  });
});

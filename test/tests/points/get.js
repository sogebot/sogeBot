/* global describe it before */

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const _ = require('lodash');

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');

const hugePointsUser = { username: 'hugeuser', points: 99999999999999999999999999999999, userId: String(_.random(999999, false)) };
const tinyPointsUser = { username: 'tinyuser', points: 100, userId: String(_.random(999999, false)) };

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
      await global.systems.points.get({ sender: hugePointsUser, parameters: '' });
      await message.isSent('points.defaults.pointsResponse', { username: hugePointsUser.username }, {
        amount: Math.floor(Number.MAX_SAFE_INTEGER),
        username: hugePointsUser.username,
        pointsName: await global.systems.points.getPointsName(Math.floor(Number.MAX_SAFE_INTEGER)),
      });
    });
  });

  describe('User with less than safe points should return unchanged points', () => {
    it('create user with normal amount of points', async () => {
      await getRepository(User).save({ username: tinyPointsUser.username, userId: tinyPointsUser.userId, points: tinyPointsUser.points });
    });

    it('points should be returned in safe points bounds', async () => {
      await global.systems.points.get({ sender: tinyPointsUser, parameters: '' });
      await message.isSent('points.defaults.pointsResponse', { username: tinyPointsUser.username }, {
        amount: 100,
        username: tinyPointsUser.username,
        pointsName: await global.systems.points.getPointsName(100),
      });
    });
  });
});

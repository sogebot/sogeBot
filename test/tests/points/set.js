/* global describe it before */

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const _ = require('lodash');

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');

const points = (require('../../../dest/systems/points')).default;

const user = { username: 'oneuser', userId: Number(_.random(999999, false)) };

describe('Points - set()', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  describe('Points should be correctly set, not added', () => {
    it('create user', async () => {
      await getRepository(User).save({ username: user.username, userId: user.userId });
    });

    it('!points get should return 0', async () => {
      await points.get({ sender: user, parameters: '' });
      await message.isSent('points.defaults.pointsResponse', { username: user.username }, {
        order: 1, count: 1,
        amount: Math.floor(0),
        username: user.username,
        pointsName: await points.getPointsName(Math.floor(0)),
      });
    });

    it('!points set should correctly set value 5', async () => {
      await points.set({ sender: user, parameters: user.username + ' 5' });
      await message.isSent('points.success.set', { username: user.username }, {
        amount: Math.floor(5),
        username: user.username,
        pointsName: await points.getPointsName(Math.floor(5)),
      });
    });

    it('!points get should return 5', async () => {
      await points.get({ sender: user, parameters: '' });
      await message.isSent('points.defaults.pointsResponse', { username: user.username }, {
        order: 1, count: 1,
        amount: Math.floor(5),
        username: user.username,
        pointsName: await points.getPointsName(Math.floor(5)),
      });
    });

    it('!points set should correctly set value 10', async () => {
      await points.set({ sender: user, parameters: user.username + ' 10' });
      await message.isSent('points.success.set', { username: user.username }, {
        order: 1, count: 1,
        amount: Math.floor(10),
        username: user.username,
        pointsName: await points.getPointsName(Math.floor(10)),
      });
    });

    it('!points get should return 10', async () => {
      await points.get({ sender: user, parameters: '' });
      await message.isSent('points.defaults.pointsResponse', { username: user.username }, {
        order: 1, count: 1,
        amount: Math.floor(10),
        username: user.username,
        pointsName: await points.getPointsName(Math.floor(10)),
      });
    });
  });
});

/* global describe it before */

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const _ = require('lodash');

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');

const points = (require('../../../dest/systems/points')).default;

const owner = { userId: Math.floor(Math.random() * 100000), username: 'soge__' };
const user1 = { userId: Math.floor(Math.random() * 100000), username: 'user1', points: 100 };
const user2 = { userId: Math.floor(Math.random() * 100000), username: 'user2' };

describe('Points - all()', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();

    await getRepository(User).save(owner);
    await getRepository(User).save(user1);
    await getRepository(User).save(user2);
  });

  describe('Points should be correctly given', () => {
    it('!points get should return 0 for owner', async () => {
      await points.get({ sender: owner, parameters: '' });
      await message.isSent('points.defaults.pointsResponse', owner, {
        amount: Math.floor(0),
        username: owner.username,
        pointsName: await points.getPointsName(Math.floor(0)),
      });
    });

    it('!points get should return 100 for user1', async () => {
      await points.get({ sender: user1, parameters: '' });
      await message.isSent('points.defaults.pointsResponse', user1, {
        amount: Math.floor(100),
        username: user1.username,
        pointsName: await points.getPointsName(Math.floor(100)),
      });
    });

    it('!points get should return 0 for user2', async () => {
      await points.get({ sender: user2, parameters: '' });
      await message.isSent('points.defaults.pointsResponse', user2, {
        amount: Math.floor(0),
        username: user2.username,
        pointsName: await points.getPointsName(Math.floor(0)),
      });
    });

    it('!points all 100', async () => {
      await points.all({ sender: owner, parameters: '100' });
      await message.isSent('points.success.all.positive', { username: owner.username }, {
        amount: Math.floor(100),
        pointsName: await points.getPointsName(Math.floor(100)),
      });
    });

    it('!points get should return 100 for owner', async () => {
      await points.get({ sender: owner, parameters: '' });
      await message.isSent('points.defaults.pointsResponse', owner, {
        amount: Math.floor(100),
        username: owner.username,
        pointsName: await points.getPointsName(Math.floor(100)),
      });
    });

    it('!points get should return 200 for user1', async () => {
      await points.get({ sender: user1, parameters: '' });
      await message.isSent('points.defaults.pointsResponse', user1, {
        amount: Math.floor(100),
        username: user1.username,
        pointsName: await points.getPointsName(Math.floor(100)),
      });
    });

    it('!points get should return 100 for user2', async () => {
      await points.get({ sender: user2, parameters: '' });
      await message.isSent('points.defaults.pointsResponse', user2, {
        amount: Math.floor(100),
        username: user2.username,
        pointsName: await points.getPointsName(Math.floor(100)),
      });
    });

    it('!points all -150', async () => {
      await points.all({ sender: owner, parameters: '-150' });
      await message.isSent('points.success.all.negative', { username: owner.username }, {
        amount: Math.floor(-150),
        pointsName: await points.getPointsName(Math.floor(100)),
      });
    });

    it('!points get should return 0 for owner', async () => {
      await points.get({ sender: owner, parameters: '' });
      await message.isSent('points.defaults.pointsResponse', owner, {
        amount: Math.floor(0),
        username: owner.username,
        pointsName: await points.getPointsName(Math.floor(0)),
      });
    });

    it('!points get should return 50 for user1', async () => {
      await points.get({ sender: user1, parameters: '' });
      await message.isSent('points.defaults.pointsResponse', user1, {
        amount: Math.floor(50),
        username: user1.username,
        pointsName: await points.getPointsName(Math.floor(50)),
      });
    });

    it('!points get should return 0 for user2', async () => {
      await points.get({ sender: user2, parameters: '' });
      await message.isSent('points.defaults.pointsResponse', user2, {
        amount: Math.floor(0),
        username: user2.username,
        pointsName: await points.getPointsName(Math.floor(0)),
      });
    });
  });
});

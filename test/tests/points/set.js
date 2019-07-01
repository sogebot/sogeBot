/* global describe it before */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const _ = require('lodash')

const user = { username: 'oneuser', userId: String(_.random(999999, false)) }

describe('Points - set()', () => {
  before(async () => {
    await db.cleanup()
    await message.prepare()
  })

  describe('Points should be correctly set, not added', () => {
    it('create user', async () => {
      await global.db.engine.insert('users', { username: user.username, id: user.userId });
    });

    it('!points get should return 0', async () => {
      await global.systems.points.get({ sender: user, parameters: '' });
      await message.isSent('points.defaults.pointsResponse', { username: user.username }, {
        amount: Math.floor(0),
        username: user.username,
        pointsName: await global.systems.points.getPointsName(Math.floor(0))
      });
    });

    it('!points set should correctly set value 5', async () => {
      await global.systems.points.set({ sender: user, parameters: user.username + ' 5' });
      await message.isSent('points.success.set', { username: user.username }, {
        amount: Math.floor(5),
        username: user.username,
        pointsName: await global.systems.points.getPointsName(Math.floor(5))
      });
    });

    it('!points get should return 5', async () => {
      await global.systems.points.get({ sender: user, parameters: '' });
      await message.isSent('points.defaults.pointsResponse', { username: user.username }, {
        amount: Math.floor(5),
        username: user.username,
        pointsName: await global.systems.points.getPointsName(Math.floor(5))
      });
    });

    it('!points set should correctly set value 10', async () => {
      await global.systems.points.set({ sender: user, parameters: user.username + ' 10' });
      await message.isSent('points.success.set', { username: user.username }, {
        amount: Math.floor(10),
        username: user.username,
        pointsName: await global.systems.points.getPointsName(Math.floor(10))
      });
    });

    it('!points get should return 10', async () => {
      await global.systems.points.get({ sender: user, parameters: '' });
      await message.isSent('points.defaults.pointsResponse', { username: user.username }, {
        amount: Math.floor(10),
        username: user.username,
        pointsName: await global.systems.points.getPointsName(Math.floor(10))
      });
    });
  });
});

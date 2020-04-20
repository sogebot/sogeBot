/* global describe it before */

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const _ = require('lodash');
const assert = require('assert');

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
      const r = await points.get({ sender: user, parameters: '' });
      assert.strictEqual(r[0].response, `@oneuser has currently 0 points. Your position is 1/1.`);
    });

    it('!points set should correctly set value 5', async () => {
      const r = await points.set({ sender: user, parameters: user.username + ' 5' });
      assert.strictEqual(r[0].response, `@oneuser was set to 5 points`);
    });

    it('!points get should return 5', async () => {
      const r = await points.get({ sender: user, parameters: '' });
      assert.strictEqual(r[0].response, `@oneuser has currently 5 points. Your position is 1/1.`);
    });

    it('!points set should correctly set value 10', async () => {
      const r = await points.set({ sender: user, parameters: user.username + ' 10' });
      assert.strictEqual(r[0].response, `@oneuser was set to 10 points`);
    });

    it('!points get should return 10', async () => {
      const r = await points.get({ sender: user, parameters: '' });
      assert.strictEqual(r[0].response, `@oneuser has currently 10 points. Your position is 1/1.`);
    });
  });
});

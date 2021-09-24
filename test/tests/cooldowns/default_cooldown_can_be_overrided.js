/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it before */


require('../../general.js');

const { getRepository } = require('typeorm');
const { Cooldown, CooldownViewer } = require('../../../dest/database/entity/cooldown');
const { User } = require('../../../dest/database/entity/user');
const { Keyword } = require('../../../dest/database/entity/keyword');

const assert = require('assert');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const time = require('../../general.js').time;
const { defaultPermissions } = require('../../../dest/helpers/permissions/');

const cooldown = (require('../../../dest/systems/cooldown')).default;
const customcommands = (require('../../../dest/systems/customcommands')).default;
const gamble = (require('../../../dest/games/gamble')).default;

// users
const owner = { userId: String(Math.floor(Math.random() * 100000)), username: '__broadcaster__', badges: {} };
const usermod1 = { userId: String(Math.floor(Math.random() * 100000)), username: 'usermod1', badges: { moderator: 1 } };
const subuser1 = { userId: String(Math.floor(Math.random() * 100000)), username: 'subuser1', badges: { subscriber: 1 } };
const testUser = { userId: String(Math.floor(Math.random() * 100000)), username: 'test', badges: {} };
const testUser2 = { userId: String(Math.floor(Math.random() * 100000)), username: 'test2', badges: {} };


describe('Cooldowns - @func3 - default cooldown can be overrided', () => {
  describe('command - override', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();

      gamble.enabled = true;
      cooldown.__permission_based__defaultCooldownOfCommandsInSeconds[defaultPermissions.VIEWERS] = 5;

      await getRepository(User).save({ username: usermod1.username, userId: usermod1.userId, isModerator: true });
      await getRepository(User).save({ username: subuser1.username, userId: subuser1.userId, isSubscriber: true });
      await getRepository(User).save({ username: testUser.username, userId: testUser.userId });
      await getRepository(User).save({ username: testUser2.username, userId: testUser2.userId });
      await getRepository(User).save({ username: owner.username, userId: owner.userId, isSubscriber: true });

      await time.waitMs(5000);
    });

    after(async () => {
      gamble.enabled = false;
      cooldown.__permission_based__defaultCooldownOfCommandsInSeconds[defaultPermissions.VIEWERS] = 0;
      await time.waitMs(5000);
    });

    it('testuser should not be affected by cooldown', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: '!test 10' });
      assert(isOk);
    });

    it('testuser should be affected by cooldown second time', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: '!test 15' });
      assert(!isOk);
    });

    it('Override !test global 0 true', async () => {
      const r = await cooldown.main({ sender: owner, parameters: '!test global 0 true' });
      assert.strictEqual(r[0].response, '$sender, global cooldown for !test was set to 0s');
    });

    it('testuser should not be affected by cooldown', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: '!test 10' });
      assert(isOk);
    });
  });

  describe('keyword - override', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();

      gamble.enabled = true;
      cooldown.__permission_based__defaultCooldownOfKeywordsInSeconds[defaultPermissions.VIEWERS] = 5;

      await getRepository(User).save({ username: usermod1.username, userId: usermod1.userId, isModerator: true });
      await getRepository(User).save({ username: subuser1.username, userId: subuser1.userId, isSubscriber: true });
      await getRepository(User).save({ username: testUser.username, userId: testUser.userId });
      await getRepository(User).save({ username: testUser2.username, userId: testUser2.userId });
      await getRepository(User).save({ username: owner.username, userId: owner.userId, isSubscriber: true });

      await time.waitMs(5000);
    });

    after(async () => {
      gamble.enabled = false;
      cooldown.__permission_based__defaultCooldownOfKeywordsInSeconds[defaultPermissions.VIEWERS] = 0;
      await time.waitMs(5000);
    });

    it('Create me keyword', async () => {
      await getRepository(Keyword).save({
        keyword: 'me',
        response: '(!me)',
        enabled: true,
      });
    });

    it('testuser should not be affected by cooldown', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: 'me' });
      assert(isOk);
    });

    it('testuser should be affected by cooldown second time', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: 'me' });
      assert(!isOk);
    });

    it('Override me global 0 true', async () => {
      const r = await cooldown.main({ sender: owner, parameters: 'me global 0 true' });
      assert.strictEqual(r[0].response, '$sender, global cooldown for me was set to 0s');
    });

    it('testuser should not be affected by cooldown', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: 'me' });
      assert(isOk);
    });
  });
});

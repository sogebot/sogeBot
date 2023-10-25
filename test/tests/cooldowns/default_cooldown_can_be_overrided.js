
/* global describe it before */


import('../../general.js');

import { Cooldown } from '../../../dest/database/entity/cooldown.js';
import { User } from '../../../dest/database/entity/user.js';
import { Keyword } from '../../../dest/database/entity/keyword.js';

import assert from 'assert';

import { db } from '../../general.js';
import { message, time } from '../../general.js';
import { defaultPermissions } from '../../../dest/helpers/permissions/defaultPermissions.js';
import { AppDataSource } from '../../../dest/database.js';

import cooldown from '../../../dest/systems/cooldown.js'
import customcommands from '../../../dest/systems/customcommands.js';
import gamble from '../../../dest/games/gamble.js';

// users
const owner = { userId: String(Math.floor(Math.random() * 100000)), userName: '__broadcaster__', badges: {} };
const usermod1 = { userId: String(Math.floor(Math.random() * 100000)), userName: 'usermod1', badges: { moderator: 1 } };
const subuser1 = { userId: String(Math.floor(Math.random() * 100000)), userName: 'subuser1', badges: { subscriber: 1 } };
const testUser = { userId: String(Math.floor(Math.random() * 100000)), userName: 'test', badges: {} };
const testUser2 = { userId: String(Math.floor(Math.random() * 100000)), userName: 'test2', badges: {} };


describe('Cooldowns - @func3 - default cooldown can be overrided', () => {
  describe('command - override', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();

      gamble.enabled = true;
      cooldown.__permission_based__defaultCooldownOfCommandsInSeconds[defaultPermissions.VIEWERS] = 5;

      await AppDataSource.getRepository(User).save({ userName: usermod1.userName, userId: usermod1.userId, isModerator: true });
      await AppDataSource.getRepository(User).save({ userName: subuser1.userName, userId: subuser1.userId, isSubscriber: true });
      await AppDataSource.getRepository(User).save({ userName: testUser.userName, userId: testUser.userId });
      await AppDataSource.getRepository(User).save({ userName: testUser2.userName, userId: testUser2.userId });
      await AppDataSource.getRepository(User).save({ userName: owner.userName, userId: owner.userId, isSubscriber: true });

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

      await AppDataSource.getRepository(User).save({ userName: usermod1.userName, userId: usermod1.userId, isModerator: true });
      await AppDataSource.getRepository(User).save({ userName: subuser1.userName, userId: subuser1.userId, isSubscriber: true });
      await AppDataSource.getRepository(User).save({ userName: testUser.userName, userId: testUser.userId });
      await AppDataSource.getRepository(User).save({ userName: testUser2.userName, userId: testUser2.userId });
      await AppDataSource.getRepository(User).save({ userName: owner.userName, userId: owner.userId, isSubscriber: true });

      await time.waitMs(5000);
    });

    after(async () => {
      gamble.enabled = false;
      cooldown.__permission_based__defaultCooldownOfKeywordsInSeconds[defaultPermissions.VIEWERS] = 0;
      await time.waitMs(5000);
    });

    it('Create me keyword', async () => {
      await AppDataSource.getRepository(Keyword).save({
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

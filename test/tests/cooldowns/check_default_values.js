
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


describe('Cooldowns - @func3 - default check', () => {
  describe('command - default', async () => {
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

    it('wait 2 seconds', async () => {
      await time.waitMs(2000);
    });

    it('testuser2 should be affected by cooldown', async () => {
      const isOk = await cooldown.check({ sender: testUser2, message: '!test 25' });
      assert(!isOk);
    });

    it('subuser1 should NOT be affected by cooldown as it is different permGroup', async () => {
      const isOk = await cooldown.check({ sender: subuser1, message: '!test 25' });
      assert(isOk);
    });

    it('wait 4 seconds', async () => {
      await time.waitMs(4000);
    });

    it('testuser2 should not be affected by cooldown second time', async () => {
      const isOk = await cooldown.check({ sender: testUser2, message: '!test 15' });
      assert(isOk);
    });
  });

  describe('keyword - default', async () => {
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

    it('test', async () => {
      await AppDataSource.getRepository(Keyword).save({
        keyword: 'me',
        response: '(!me)',
        enabled: true,
      });

      let isOk = await cooldown.check({ sender: testUser, message: 'me' });
      assert(isOk);

      isOk = await cooldown.check({ sender: testUser, message: 'me' });
      assert(!isOk); // second should fail

      isOk = await cooldown.check({ sender: subuser1, message: 'me' });
      assert(isOk); // another perm group should not fail

      await time.waitMs(2000);

      isOk = await cooldown.check({ sender: testUser2, message: 'me' });
      assert(!isOk); // another user should fail as well

      await time.waitMs(4000);

      isOk = await cooldown.check({ sender: testUser2, message: 'me' });
      assert(isOk);

    });
  });
});

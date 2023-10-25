
/* global */

import('../../general.js');

import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js';

import { Cooldown } from '../../../dest/database/entity/cooldown.js';
import { Keyword } from '../../../dest/database/entity/keyword.js';
import { User } from '../../../dest/database/entity/user.js';
import gamble from '../../../dest/games/gamble.js';
import cooldown from '../../../dest/systems/cooldown.js'
import customcommands from '../../../dest/systems/customcommands.js';
import { db } from '../../general.js';
import { message } from '../../general.js';

// users
const owner = {
  userId: String(Math.floor(Math.random() * 100000)), userName: '__broadcaster__', badges: {},
};
const usermod1 = {
  userId: String(Math.floor(Math.random() * 100000)), userName: 'usermod1', badges: { moderator: 1 },
};
const subuser1 = {
  userId: String(Math.floor(Math.random() * 100000)), userName: 'subuser1', badges: { subscriber: 1 },
};
const testUser = {
  userId: String(Math.floor(Math.random() * 100000)), userName: 'test', badges: {},
};
const testUser2 = {
  userId: String(Math.floor(Math.random() * 100000)), userName: 'test2', badges: {},
};

describe('Cooldowns - @func3 - check()', () => {
  describe('#1969 - commands with special chars should not threadlock check', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();

      await AppDataSource.getRepository(User).save({
        userName: usermod1.userName, userId: usermod1.userId, isModerator: true,
      });
      await AppDataSource.getRepository(User).save({
        userName: subuser1.userName, userId: subuser1.userId, isSubscriber: true,
      });
      await AppDataSource.getRepository(User).save({ userName: testUser.userName, userId: testUser.userId });
      await AppDataSource.getRepository(User).save({ userName: testUser2.userName, userId: testUser2.userId });
      await AppDataSource.getRepository(User).save({
        userName: owner.userName, userId: owner.userId, isSubscriber: true,
      });

    });

    it('Command !_debug should pass', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: '!_debug' });
      assert(isOk);
    });

    it('Command !$debug should pass', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: '!$debug' });
      assert(isOk);
    });

    it('Command `!_debug test` should pass', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: '!_debug test' });
      assert(isOk);
    });

    it('Command `!$debug test` should pass', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: '!$debug test' });
      assert(isOk);
    });

    it('Command `!_debug te$st` should pass', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: '!_debug te$st' });
      assert(isOk);
    });

    it('Command `!$debug te$st` should pass', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: '!$debug te$st' });
      assert(isOk);
    });
  });

  describe('#1938 - !cmd with param (*)', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();

      await AppDataSource.getRepository(User).save({
        userName: usermod1.userName, userId: usermod1.userId, isModerator: true,
      });
      await AppDataSource.getRepository(User).save({
        userName: subuser1.userName, userId: subuser1.userId, isSubscriber: true,
      });
      await AppDataSource.getRepository(User).save({ userName: testUser.userName, userId: testUser.userId });
      await AppDataSource.getRepository(User).save({ userName: testUser2.userName, userId: testUser2.userId });
      await AppDataSource.getRepository(User).save({
        userName: owner.userName, userId: owner.userId, isSubscriber: true,
      });
    });

    it('create command', async () => {
      const r = await customcommands.add({ sender: owner, parameters: '-c !cmd -r $param' });
      assert.strictEqual(r[0].response, '$sender, command !cmd was added');
    });

    it('Add !cmd to cooldown', async () => {
      const c = new Cooldown();
      c.name =                 '!cmd';
      c.miliseconds =          60000;
      c.type =                 'global';
      c.timestamp =            new Date(0).toISOString();
      c.isErrorMsgQuiet =      true;
      c.isEnabled =            true;
      c.isOwnerAffected =      true;
      c.isModeratorAffected =  true;
      c.isSubscriberAffected = true;
      await c.save();
    });

    it('First user should PASS', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: '!cmd (*)' });
      assert(isOk);
    });

    it('Second user should FAIL', async () => {
      const isOk = await cooldown.check({ sender: testUser2, message: '!cmd (*)' });
      assert(!isOk);
    });
  });

  describe('#1658 - cooldown not working on not full cooldown object KonCha', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();

      gamble.enabled = true;

      await AppDataSource.getRepository(User).save({
        userName: usermod1.userName, userId: usermod1.userId, isModerator: true,
      });
      await AppDataSource.getRepository(User).save({
        userName: subuser1.userName, userId: subuser1.userId, isSubscriber: true,
      });
      await AppDataSource.getRepository(User).save({ userName: testUser.userName, userId: testUser.userId });
      await AppDataSource.getRepository(User).save({ userName: testUser2.userName, userId: testUser2.userId });
      await AppDataSource.getRepository(User).save({
        userName: owner.userName, userId: owner.userId, isSubscriber: true,
      });
    });

    after(() => {
      gamble.enabled = false;
    });

    it('Add global KonCha to cooldown', async () => {
      const c = new Cooldown();
      c.name =                  'KonCha';
      c.miliseconds =           60000;
      c.type =                  'global';
      c.timestamp =             new Date(0).toISOString();
      c.isErrorMsgQuiet =       true;
      c.isEnabled =             true;
      c.isOwnerAffected =       true;
      c.isModeratorAffected =   true;
      c.isSubscriberAffected =  true;
      await c.save();
    });

    it('Add koncha to keywords', async () => {
      await AppDataSource.getRepository(Keyword).save({
        keyword:  'koncha',
        response: '$sender KonCha',
        enabled:  true,
      });
    });

    it('First user should PASS', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: 'KonCha' });
      assert(isOk);
    });

    for (const user of [testUser, testUser2, owner, usermod1, subuser1]) {
      it('Other users should FAIL', async () => {
        const isOk = await cooldown.check({ sender: user, message: 'koncha' });
        assert(!isOk);
      });
    }
  });

  describe('#1658 - cooldown not working on !followage', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();

      gamble.enabled = true;

      await AppDataSource.getRepository(User).save({
        userName: usermod1.userName, userId: usermod1.userId, isModerator: true,
      });
      await AppDataSource.getRepository(User).save({
        userName: subuser1.userName, userId: subuser1.userId, isSubscriber: true,
      });
      await AppDataSource.getRepository(User).save({ userName: testUser.userName, userId: testUser.userId });
      await AppDataSource.getRepository(User).save({ userName: testUser2.userName, userId: testUser2.userId });
      await AppDataSource.getRepository(User).save({
        userName: owner.userName, userId: owner.userId, isSubscriber: true,
      });
    });

    after(() => {
      gamble.enabled = false;
    });

    it('Add global !followage to cooldown', async () => {
      const c = new Cooldown();
      c.name =                 '!followage';
      c.miliseconds =          30000;
      c.type =                 'global';
      c.timestamp =            new Date(1544713598872).toISOString();
      c.isErrorMsgQuiet =      true;
      c.isEnabled =            true;
      c.isOwnerAffected =      false;
      c.isModeratorAffected =  false;
      c.isSubscriberAffected = true;
      await c.save();
    });

    it('First user should PASS', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: '!followage' });
      assert(isOk);
    });

    it('Owner user should PASS', async () => {
      const isOk = await cooldown.check({ sender: owner, message: '!followage' });
      assert(isOk);
    });

    it('Moderator user should PASS', async () => {
      const isOk = await cooldown.check({ sender: usermod1, message: '!followage' });
      assert(isOk);
    });

    for (const user of [testUser, testUser2, subuser1]) {
      it('Other users should FAIL', async () => {
        const isOk = await cooldown.check({ sender: user, message: '!followage' });
        assert(!isOk);
      });
    }
  });

  describe('#3209 - cooldown not working on gamble changed command to !фортуна', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();

      gamble.enabled = true;
      gamble.setCommand('!gamble', '!фортуна');

      const c = new Cooldown();
      c.name =                 '!фортуна';
      c.miliseconds =          200000;
      c.type =                 'user';
      c.timestamp =            new Date(1569490204420).toISOString();
      c.isErrorMsgQuiet =      false;
      c.isEnabled =            true;
      c.isOwnerAffected =      true;
      c.isModeratorAffected =  true;
      c.isSubscriberAffected = true;
      await c.save();

      await AppDataSource.getRepository(User).save({
        userName: usermod1.userName, userId: usermod1.userId, isModerator: true,
      });
      await AppDataSource.getRepository(User).save({
        userName: subuser1.userName, userId: subuser1.userId, isSubscriber: true,
      });
      await AppDataSource.getRepository(User).save({ userName: testUser.userName, userId: testUser.userId });
      await AppDataSource.getRepository(User).save({ userName: testUser2.userName, userId: testUser2.userId });
      await AppDataSource.getRepository(User).save({
        userName: owner.userName, userId: owner.userId, isSubscriber: true,
      });
    });

    after(async () => {
      gamble.setCommand('!gamble', '!gamble');
      gamble.enabled = false;
    });

    it('testuser should not be affected by cooldown', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: '!фортуна 10' });
      assert(isOk);
    });

    it('testuser should be affected by cooldown second time', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: '!фортуна 15' });
      assert(!isOk); // second should fail
    });

    it('testuser2 should not be affected by cooldown', async () => {
      const isOk = await cooldown.check({ sender: testUser2, message: '!фортуна 20' });
      assert(isOk);
    });

    it('testuser2 should be affected by cooldown second time', async () => {
      const isOk = await cooldown.check({ sender: testUser2, message: '!фортуна 25' });
      assert(!isOk); // second should fail
    });

    it('owner should be affected by cooldown', async () => {
      const isOk = await cooldown.check({ sender: owner, message: '!фортуна 20' });
      assert(isOk);
    });

    it('owner should be affected by cooldown second time', async () => {
      const isOk = await cooldown.check({ sender: owner, message: '!фортуна 25' });
      assert(!isOk);
    });

    it('owner should be affected by cooldown second time', async () => {
      const isOk = await cooldown.check({ sender: owner, message: '!фортуна 25' });
      assert(!isOk);
    });

    it('testuser should be affected by cooldown third time', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: '!фортуна 15' });
      assert(!isOk);
    });
  });

  describe('#3209 - cooldown not working on gamble changed command to !play', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();

      gamble.enabled = true;
      gamble.setCommand('!gamble', '!play');
      await AppDataSource.getRepository(Cooldown).update({}, { isOwnerAffected: false });

      await AppDataSource.getRepository(User).save({
        userName: usermod1.userName, userId: usermod1.userId, isModerator: true,
      });
      await AppDataSource.getRepository(User).save({
        userName: subuser1.userName, userId: subuser1.userId, isSubscriber: true,
      });
      await AppDataSource.getRepository(User).save({ userName: testUser.userName, userId: testUser.userId });
      await AppDataSource.getRepository(User).save({ userName: testUser2.userName, userId: testUser2.userId });
      await AppDataSource.getRepository(User).save({
        userName: owner.userName, userId: owner.userId, isSubscriber: true,
      });
    });

    after(async () => {
      gamble.setCommand('!gamble', '!gamble');
      gamble.enabled = false;
    });

    it('create cooldown on !play [user 300]', async () => {
      const [command, type, seconds, quiet] = ['!play', 'user', '300', true];
      const r = await cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
      assert.strictEqual(r[0].response, '$sender, user cooldown for !play was set to 300s');
    });

    it('check if cooldown is created', async () => {
      const item = await AppDataSource.getRepository(Cooldown).findOne({ where: { name: '!play' } });
      assert(item.length !== 0);
    });

    it('testuser should not be affected by cooldown', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: '!play 10' });
      assert(isOk);
    });

    it('testuser should be affected by cooldown second time', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: '!play 15' });
      assert(!isOk); // second should fail
    });

    it('testuser2 should not be affected by cooldown', async () => {
      const isOk = await cooldown.check({ sender: testUser2, message: '!play 20' });
      assert(isOk);
    });

    it('testuser2 should be affected by cooldown second time', async () => {
      const isOk = await cooldown.check({ sender: testUser2, message: '!play 25' });
      assert(!isOk); // second should fail
    });

    it('owner should not be affected by cooldown', async () => {
      const isOk = await cooldown.check({ sender: owner, message: '!play 20' });
      assert(isOk);
    });

    it('owner should not be affected by cooldown second time', async () => {
      const isOk = await cooldown.check({ sender: owner, message: '!play 25' });
      assert(isOk);
    });

    it('owner should not be affected by cooldown second time', async () => {
      const isOk = await cooldown.check({ sender: owner, message: '!play 25' });
      assert(isOk);
    });
  });

  describe('#3209 - global cooldown not working on gamble changed command to !play', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();

      gamble.enabled = true;
      gamble.setCommand('!gamble', '!play');
      // owners should not be persecuted
      await AppDataSource.getRepository(Cooldown).update({}, { isOwnerAffected: false });

      await AppDataSource.getRepository(User).save({
        userName: usermod1.userName, userId: usermod1.userId, isModerator: true,
      });
      await AppDataSource.getRepository(User).save({
        userName: subuser1.userName, userId: subuser1.userId, isSubscriber: true,
      });
      await AppDataSource.getRepository(User).save({ userName: testUser.userName, userId: testUser.userId });
      await AppDataSource.getRepository(User).save({ userName: testUser2.userName, userId: testUser2.userId });
      await AppDataSource.getRepository(User).save({
        userName: owner.userName, userId: owner.userId, isSubscriber: true,
      });
    });

    after(async () => {
      gamble.setCommand('!gamble', '!gamble');
      gamble.enabled = false;
    });

    it('create cooldown on !play [global 300]', async () => {
      const [command, type, seconds, quiet] = ['!play', 'global', '300', true];
      const r = await cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
      assert.strictEqual(r[0].response, '$sender, global cooldown for !play was set to 300s');
    });

    it('check if cooldown is created', async () => {
      const item = await AppDataSource.getRepository(Cooldown).findOne({ where: { name: '!play' } });
      assert(item.length !== 0);
    });

    it('testuser should not be affected by cooldown', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: '!play 10' });
      assert(isOk);
    });

    it('testuser should be affected by cooldown second time', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: '!play 15' });
      assert(!isOk); // second should fail
    });

    it('testuser2 should be affected by cooldown second time', async () => {
      const isOk = await cooldown.check({ sender: testUser2, message: '!play 25' });
      assert(!isOk); // third should fail
    });

    it('owner should not be affected by cooldown second time', async () => {
      const isOk = await cooldown.check({ sender: owner, message: '!play 25' });
      assert(isOk);
    });
  });

  describe('#1352 - command in a sentence', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();

      gamble.enabled = true;

      await AppDataSource.getRepository(User).save({
        userName: usermod1.userName, userId: usermod1.userId, isModerator: true,
      });
      await AppDataSource.getRepository(User).save({
        userName: subuser1.userName, userId: subuser1.userId, isSubscriber: true,
      });
      await AppDataSource.getRepository(User).save({ userName: testUser.userName, userId: testUser.userId });
      await AppDataSource.getRepository(User).save({ userName: testUser2.userName, userId: testUser2.userId });
      await AppDataSource.getRepository(User).save({
        userName: owner.userName, userId: owner.userId, isSubscriber: true,
      });
    });

    after(() => {
      gamble.enabled = false;
    });

    it('test', async () => {
      const [command, type, seconds, quiet] = ['!test', 'user', '60', true];
      const r = await cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
      assert.strictEqual(r[0].response, '$sender, user cooldown for !test was set to 60s');

      const item = await AppDataSource.getRepository(Cooldown).findOne({ where: { name: '!test' } });
      assert(item.length !== 0);

      let isOk = await cooldown.check({ sender: testUser, message: 'Lorem Ipsum !test' });
      assert(isOk);

      isOk = await cooldown.check({ sender: testUser, message: 'Lorem Ipsum !test' });
      assert(isOk); // second should fail
    });
  });

  describe('command with subcommand - user', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();

      gamble.enabled = true;
      gamble.setCommand('!gamble', '!test me');

      await AppDataSource.getRepository(User).save({
        userName: usermod1.userName, userId: usermod1.userId, isModerator: true,
      });
      await AppDataSource.getRepository(User).save({
        userName: subuser1.userName, userId: subuser1.userId, isSubscriber: true,
      });
      await AppDataSource.getRepository(User).save({ userName: testUser.userName, userId: testUser.userId });
      await AppDataSource.getRepository(User).save({ userName: testUser2.userName, userId: testUser2.userId });
      await AppDataSource.getRepository(User).save({
        userName: owner.userName, userId: owner.userId, isSubscriber: true,
      });
    });

    after(async () => {
      gamble.setCommand('!gamble', '!gamble');
      gamble.enabled = false;
    });

    it('create cooldown on !test me [user 60]', async () => {
      const [command, type, seconds, quiet] = ['\'!test me\'', 'user', '60', true];
      const r = await cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
      assert.strictEqual(r[0].response, '$sender, user cooldown for !test me was set to 60s');
    });

    it('check if cooldown is created', async () => {
      const item = await AppDataSource.getRepository(Cooldown).findOne({ where: { name: '!test me' } });
      assert(item.length !== 0);
    });

    it('testuser with `!test me` should not be affected by cooldown', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: '!test me 10' });
      assert(isOk);
    });

    it('testuser with `!test me` should be affected by cooldown second time', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: '!test me 11' });
      assert(!isOk); // second should fail
    });

    it('testuser2 with `!test me` should not be affected by cooldown', async () => {
      const isOk = await cooldown.check({ sender: testUser2, message: '!test me 12' });
      assert(isOk);
    });

    it('testuser2 with `!test me` should be affected by cooldown second time', async () => {
      const isOk = await cooldown.check({ sender: testUser2, message: '!test me 13' });
      assert(!isOk); // second should fail
    });

    it('testuser with `!test` should not be affected by cooldown', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: '!test' });
      assert(isOk);
    });

    it('testuser with `!test` should not be affected by cooldown second time', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: '!test' });
      assert(isOk);
    });

    it('testuser2 with `!test` should not be affected by cooldown', async () => {
      const isOk = await cooldown.check({ sender: testUser2, message: '!test' });
      assert(isOk);
    });

    it('testuser2 with `!test` should not be affected by cooldown second time', async () => {
      const isOk = await cooldown.check({ sender: testUser2, message: '!test' });
      assert(isOk);
    });
  });

  describe('command - user', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();

      gamble.enabled = true;

      await AppDataSource.getRepository(User).save({
        userName: usermod1.userName, userId: usermod1.userId, isModerator: true,
      });
      await AppDataSource.getRepository(User).save({
        userName: subuser1.userName, userId: subuser1.userId, isSubscriber: true,
      });
      await AppDataSource.getRepository(User).save({ userName: testUser.userName, userId: testUser.userId });
      await AppDataSource.getRepository(User).save({ userName: testUser2.userName, userId: testUser2.userId });
      await AppDataSource.getRepository(User).save({
        userName: owner.userName, userId: owner.userId, isSubscriber: true,
      });
    });

    after(() => {
      gamble.enabled = false;
    });

    it('create cooldown on !test [user 60]', async () => {
      const [command, type, seconds, quiet] = ['!test', 'user', '60', true];
      const r = await cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
      assert.strictEqual(r[0].response, '$sender, user cooldown for !test was set to 60s');
    });

    it('check if cooldown is created', async () => {
      const item = await AppDataSource.getRepository(Cooldown).findOne({ where: { name: '!test' } });
      assert(item.length !== 0);
    });

    it('testuser should not be affected by cooldown', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: '!test 10' });
      assert(isOk);
    });

    it('testuser should be affected by cooldown second time', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: '!test 15' });
      assert(!isOk); // second should fail
    });

    it('testuser2 should not be affected by cooldown', async () => {
      const isOk = await cooldown.check({ sender: testUser2, message: '!test 25' });
      assert(isOk);
    });

    it('testuser2 should be affected by cooldown second time', async () => {
      const isOk = await cooldown.check({ sender: testUser2, message: '!test 15' });
      assert(!isOk); // second should fail
    });
  });

  describe('command - global', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();

      gamble.enabled = true;

      await AppDataSource.getRepository(User).save({
        userName: usermod1.userName, userId: usermod1.userId, isModerator: true,
      });
      await AppDataSource.getRepository(User).save({
        userName: subuser1.userName, userId: subuser1.userId, isSubscriber: true,
      });
      await AppDataSource.getRepository(User).save({ userName: testUser.userName, userId: testUser.userId });
      await AppDataSource.getRepository(User).save({ userName: testUser2.userName, userId: testUser2.userId });
      await AppDataSource.getRepository(User).save({
        userName: owner.userName, userId: owner.userId, isSubscriber: true,
      });
    });

    after(() => {
      gamble.enabled = false;
    });

    it('create cooldown on !test [global 60]', async () => {
      const [command, type, seconds, quiet] = ['!test', 'global', '60', true];
      const r = await cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
      assert.strictEqual(r[0].response, '$sender, global cooldown for !test was set to 60s');
    });

    it('check if cooldown is created', async () => {
      const item = await AppDataSource.getRepository(Cooldown).findOne({ where: { name: '!test' } });
      assert(item.length !== 0);
    });

    it('testuser should not be affected by cooldown', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: '!test 10' });
      assert(isOk);
    });

    it('testuser should be affected by cooldown second time', async () => {
      const isOk = await cooldown.check({ sender: testUser, message: '!test 15' });
      assert(!isOk);
    });

    it('testuser2 should be affected by cooldown', async () => {
      const isOk = await cooldown.check({ sender: testUser2, message: '!test 15' });
      assert(!isOk);
    });
  });

  describe('keyword - user', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();

      gamble.enabled = true;

      await AppDataSource.getRepository(User).save({
        userName: usermod1.userName, userId: usermod1.userId, isModerator: true,
      });
      await AppDataSource.getRepository(User).save({
        userName: subuser1.userName, userId: subuser1.userId, isSubscriber: true,
      });
      await AppDataSource.getRepository(User).save({ userName: testUser.userName, userId: testUser.userId });
      await AppDataSource.getRepository(User).save({ userName: testUser2.userName, userId: testUser2.userId });
      await AppDataSource.getRepository(User).save({
        userName: owner.userName, userId: owner.userId, isSubscriber: true,
      });
    });

    after(() => {
      gamble.enabled = false;
    });

    it('test', async () => {
      await AppDataSource.getRepository(Keyword).save({
        keyword:  'me',
        response: '(!me)',
        enabled:  true,
      });

      const [command, type, seconds, quiet] = ['me', 'user', '60', true];
      const r = await cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
      assert.strictEqual(r[0].response, '$sender, user cooldown for me was set to 60s');

      const item = await AppDataSource.getRepository(Cooldown).findOne({ where: { name: 'me' } });
      assert(typeof item !== 'undefined');

      let isOk = await cooldown.check({ sender: testUser, message: 'me' });
      assert(isOk);

      isOk = await cooldown.check({ sender: testUser, message: 'me' });
      assert(!isOk); // second should fail

      isOk = await cooldown.check({ sender: testUser2, message: 'me' });
      assert(isOk);
    });
  });

  describe('keyword - global', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();

      gamble.enabled = true;

      await AppDataSource.getRepository(User).save({
        userName: usermod1.userName, userId: usermod1.userId, isModerator: true,
      });
      await AppDataSource.getRepository(User).save({
        userName: subuser1.userName, userId: subuser1.userId, isSubscriber: true,
      });
      await AppDataSource.getRepository(User).save({ userName: testUser.userName, userId: testUser.userId });
      await AppDataSource.getRepository(User).save({ userName: testUser2.userName, userId: testUser2.userId });
      await AppDataSource.getRepository(User).save({
        userName: owner.userName, userId: owner.userId, isSubscriber: true,
      });
    });

    after(() => {
      gamble.enabled = false;
    });

    it('test', async () => {
      await AppDataSource.getRepository(Keyword).save({
        keyword:  'me',
        response: '(!me)',
        enabled:  true,
      });

      const [command, type, seconds, quiet] = ['me', 'global', '60', true];
      const r = await cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
      assert.strictEqual(r[0].response, '$sender, global cooldown for me was set to 60s');

      const item = await AppDataSource.getRepository(Cooldown).findOne({ where: { name: 'me' } });
      assert(typeof item !== 'undefined');

      let isOk = await cooldown.check({ sender: testUser, message: 'me' });
      assert(isOk);

      isOk = await cooldown.check({ sender: testUser, message: 'me' });
      assert(!isOk); // second should fail

      isOk = await cooldown.check({ sender: testUser2, message: 'me' });
      assert(!isOk); // another user should fail as well
    });
  });
});

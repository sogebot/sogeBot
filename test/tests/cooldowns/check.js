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

const cooldown = (require('../../../dest/systems/cooldown')).default;
const customcommands = (require('../../../dest/systems/customcommands')).default;
const gamble = (require('../../../dest/games/gamble')).default;

// users
const owner = { userId: Math.floor(Math.random() * 100000), username: 'soge__', badges: {} };
const usermod1 = { userId: Math.floor(Math.random() * 100000), username: 'usermod1', badges: { moderator: 1 } };
const subuser1 = { userId: Math.floor(Math.random() * 100000), username: 'subuser1', badges: { subscriber: 1 } };
const testUser = { userId: Math.floor(Math.random() * 100000), username: 'test', badges: {} };
const testUser2 = { userId: Math.floor(Math.random() * 100000), username: 'test2', badges: {} };


describe('Cooldowns - check()', () => {
  describe('#1969 - commands with special chars should not threadlock check', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();

      await getRepository(User).save({ username: usermod1.username, userId: usermod1.userId, isModerator: true });
      await getRepository(User).save({ username: subuser1.username, userId: subuser1.userId, isSubscriber: true });
      await getRepository(User).save({ username: testUser.username, userId: testUser.userId });
      await getRepository(User).save({ username: testUser2.username, userId: testUser2.userId });
      await getRepository(User).save({ username: owner.username, userId: owner.userId, isSubscriber: true });

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

      await getRepository(User).save({ username: usermod1.username, userId: usermod1.userId, isModerator: true });
      await getRepository(User).save({ username: subuser1.username, userId: subuser1.userId, isSubscriber: true });
      await getRepository(User).save({ username: testUser.username, userId: testUser.userId });
      await getRepository(User).save({ username: testUser2.username, userId: testUser2.userId });
      await getRepository(User).save({ username: owner.username, userId: owner.userId, isSubscriber: true });
    });

    it('create command', async () => {
      const r = await customcommands.add({ sender: owner, parameters: '-c !cmd -r $param' });
      assert.strictEqual(r[0].response, '$sender, command !cmd was added');
    });

    it('Add !cmd to cooldown', async () => {
      await getRepository(Cooldown).save({
        name: '!cmd',
        miliseconds: 60000,
        type: 'global',
        timestamp: 0,
        lastTimestamp: 0,
        isErrorMsgQuiet: true,
        isEnabled: true,
        isOwnerAffected: true,
        isModeratorAffected: true,
        isSubscriberAffected: true,
        isFollowerAffected: true,
      });
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

      await getRepository(User).save({ username: usermod1.username, userId: usermod1.userId, isModerator: true });
      await getRepository(User).save({ username: subuser1.username, userId: subuser1.userId, isSubscriber: true });
      await getRepository(User).save({ username: testUser.username, userId: testUser.userId });
      await getRepository(User).save({ username: testUser2.username, userId: testUser2.userId });
      await getRepository(User).save({ username: owner.username, userId: owner.userId, isSubscriber: true });
    });

    after(() => {
      gamble.enabled = false;
    });

    it('Add global KonCha to cooldown', async () => {
      await getRepository(Cooldown).save({
        name: 'KonCha',
        miliseconds: 60000,
        type: 'global',
        timestamp: 0,
        lastTimestamp: 0,
        isErrorMsgQuiet: true,
        isEnabled: true,
        isOwnerAffected: true,
        isModeratorAffected: true,
        isSubscriberAffected: true,
        isFollowerAffected: true,
      });
    });

    it('Add koncha to keywords', async () => {
      await getRepository(Keyword).save({
        keyword: 'koncha',
        response: '$sender KonCha',
        enabled: true,
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

      await getRepository(User).save({ username: usermod1.username, userId: usermod1.userId, isModerator: true });
      await getRepository(User).save({ username: subuser1.username, userId: subuser1.userId, isSubscriber: true });
      await getRepository(User).save({ username: testUser.username, userId: testUser.userId });
      await getRepository(User).save({ username: testUser2.username, userId: testUser2.userId });
      await getRepository(User).save({ username: owner.username, userId: owner.userId, isSubscriber: true });
    });

    after(() => {
      gamble.enabled = false;
    });

    it('Add global !followage to cooldown', async () => {
      await getRepository(Cooldown).save({
        name: '!followage',
        miliseconds: 30000,
        type: 'global',
        timestamp: 1544713598872,
        lastTimestamp: 0,
        isErrorMsgQuiet: true,
        isEnabled: true,
        isOwnerAffected: false,
        isModeratorAffected: false,
        isSubscriberAffected: true,
        isFollowerAffected: true,
      });
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
      const c = await getRepository(Cooldown).save({
        name: '!фортуна',
        miliseconds: 200000,
        type: 'user',
        timestamp: 1569490204420,
        lastTimestamp: 0,
        isErrorMsgQuiet: false,
        isEnabled: true,
        isOwnerAffected: true,
        isModeratorAffected: true,
        isSubscriberAffected: true,
        isFollowerAffected: true,
      });
      await getRepository(CooldownViewer).insert({
        ...c, userId: testUser.userId, timestamp: 10000, lastTimestamp: 0,
      });

      await getRepository(User).save({ username: usermod1.username, userId: usermod1.userId, isModerator: true });
      await getRepository(User).save({ username: subuser1.username, userId: subuser1.userId, isSubscriber: true });
      await getRepository(User).save({ username: testUser.username, userId: testUser.userId });
      await getRepository(User).save({ username: testUser2.username, userId: testUser2.userId });
      await getRepository(User).save({ username: owner.username, userId: owner.userId, isSubscriber: true });
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
      await getRepository(Cooldown).update({}, { isOwnerAffected: false });

      await getRepository(User).save({ username: usermod1.username, userId: usermod1.userId, isModerator: true });
      await getRepository(User).save({ username: subuser1.username, userId: subuser1.userId, isSubscriber: true });
      await getRepository(User).save({ username: testUser.username, userId: testUser.userId });
      await getRepository(User).save({ username: testUser2.username, userId: testUser2.userId });
      await getRepository(User).save({ username: owner.username, userId: owner.userId, isSubscriber: true });
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
      const item = await getRepository(Cooldown).findOne({ where: { name: '!play' } });
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
      await getRepository(Cooldown).update({}, { isOwnerAffected: false });

      await getRepository(User).save({ username: usermod1.username, userId: usermod1.userId, isModerator: true });
      await getRepository(User).save({ username: subuser1.username, userId: subuser1.userId, isSubscriber: true });
      await getRepository(User).save({ username: testUser.username, userId: testUser.userId });
      await getRepository(User).save({ username: testUser2.username, userId: testUser2.userId });
      await getRepository(User).save({ username: owner.username, userId: owner.userId, isSubscriber: true });
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
      const item = await getRepository(Cooldown).findOne({ where: { name: '!play' } });
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

  describe('#1406 - cooldown not working on gamble', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();

      gamble.enabled = true;

      await getRepository(User).save({ username: usermod1.username, userId: usermod1.userId, isModerator: true });
      await getRepository(User).save({ username: subuser1.username, userId: subuser1.userId, isSubscriber: true });
      await getRepository(User).save({ username: testUser.username, userId: testUser.userId });
      await getRepository(User).save({ username: testUser2.username, userId: testUser2.userId });
      await getRepository(User).save({ username: owner.username, userId: owner.userId, isSubscriber: true });
    });

    after(() => {
      gamble.enabled = false;
    });

    it('test', async () => {
      const [command, type, seconds, quiet] = ['!gamble', 'user', '300', true];
      const r = await cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
      assert.strictEqual(r[0].response, '$sender, user cooldown for !gamble was set to 300s');

      const item = await getRepository(Cooldown).findOne({ where: { name: '!gamble' } });
      assert(item.length !== 0);

      let isOk = await cooldown.check({ sender: testUser, message: '!gamble 10' });
      assert(isOk);

      isOk = await cooldown.check({ sender: testUser, message: '!gamble 15' });
      assert(!isOk); // second should fail

      isOk = await cooldown.check({ sender: testUser2, message: '!gamble 20' });
      assert(isOk);

      isOk = await cooldown.check({ sender: testUser2, message: '!gamble 25' });
      assert(!isOk); // second should fail
    });
  });

  describe('#1352 - command in a sentence', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();

      gamble.enabled = true;

      await getRepository(User).save({ username: usermod1.username, userId: usermod1.userId, isModerator: true });
      await getRepository(User).save({ username: subuser1.username, userId: subuser1.userId, isSubscriber: true });
      await getRepository(User).save({ username: testUser.username, userId: testUser.userId });
      await getRepository(User).save({ username: testUser2.username, userId: testUser2.userId });
      await getRepository(User).save({ username: owner.username, userId: owner.userId, isSubscriber: true });
    });

    after(() => {
      gamble.enabled = false;
    });

    it('test', async () => {
      const [command, type, seconds, quiet] = ['!test', 'user', '60', true];
      const r = await cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
      assert.strictEqual(r[0].response, '$sender, user cooldown for !test was set to 60s');

      const item = await getRepository(Cooldown).findOne({ where: { name: '!test' } });
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

      await getRepository(User).save({ username: usermod1.username, userId: usermod1.userId, isModerator: true });
      await getRepository(User).save({ username: subuser1.username, userId: subuser1.userId, isSubscriber: true });
      await getRepository(User).save({ username: testUser.username, userId: testUser.userId });
      await getRepository(User).save({ username: testUser2.username, userId: testUser2.userId });
      await getRepository(User).save({ username: owner.username, userId: owner.userId, isSubscriber: true });
    });

    after(async () => {
      gamble.setCommand('!gamble', '!gamble');
      gamble.enabled = false;
    });

    it('create cooldown on !test me [user 60]', async () => {
      const [command, type, seconds, quiet] = ['!test me', 'user', '60', true];
      const r = await cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
      assert.strictEqual(r[0].response, '$sender, user cooldown for !test me was set to 60s');
    });

    it('check if cooldown is created', async () => {
      const item = await getRepository(Cooldown).findOne({ where: { name: '!test me' } });
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

      await getRepository(User).save({ username: usermod1.username, userId: usermod1.userId, isModerator: true });
      await getRepository(User).save({ username: subuser1.username, userId: subuser1.userId, isSubscriber: true });
      await getRepository(User).save({ username: testUser.username, userId: testUser.userId });
      await getRepository(User).save({ username: testUser2.username, userId: testUser2.userId });
      await getRepository(User).save({ username: owner.username, userId: owner.userId, isSubscriber: true });
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
      const item = await getRepository(Cooldown).findOne({ where: { name: '!test' } });
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

      await getRepository(User).save({ username: usermod1.username, userId: usermod1.userId, isModerator: true });
      await getRepository(User).save({ username: subuser1.username, userId: subuser1.userId, isSubscriber: true });
      await getRepository(User).save({ username: testUser.username, userId: testUser.userId });
      await getRepository(User).save({ username: testUser2.username, userId: testUser2.userId });
      await getRepository(User).save({ username: owner.username, userId: owner.userId, isSubscriber: true });
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
      const item = await getRepository(Cooldown).findOne({ where: { name: '!test' } });
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

      await getRepository(User).save({ username: usermod1.username, userId: usermod1.userId, isModerator: true });
      await getRepository(User).save({ username: subuser1.username, userId: subuser1.userId, isSubscriber: true });
      await getRepository(User).save({ username: testUser.username, userId: testUser.userId });
      await getRepository(User).save({ username: testUser2.username, userId: testUser2.userId });
      await getRepository(User).save({ username: owner.username, userId: owner.userId, isSubscriber: true });
    });

    after(() => {
      gamble.enabled = false;
    });

    it('test', async () => {
      await getRepository(Keyword).save({
        keyword: 'me',
        response: '(!me)',
        enabled: true,
      });

      const [command, type, seconds, quiet] = ['me', 'user', '60', true];
      const r = await cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
      assert.strictEqual(r[0].response, '$sender, user cooldown for me was set to 60s');

      const item = await getRepository(Cooldown).findOne({ where: { name: 'me' } });
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

      await getRepository(User).save({ username: usermod1.username, userId: usermod1.userId, isModerator: true });
      await getRepository(User).save({ username: subuser1.username, userId: subuser1.userId, isSubscriber: true });
      await getRepository(User).save({ username: testUser.username, userId: testUser.userId });
      await getRepository(User).save({ username: testUser2.username, userId: testUser2.userId });
      await getRepository(User).save({ username: owner.username, userId: owner.userId, isSubscriber: true });
    });

    after(() => {
      gamble.enabled = false;
    });

    it('test', async () => {
      await getRepository(Keyword).save({
        keyword: 'me',
        response: '(!me)',
        enabled: true,
      });

      const [command, type, seconds, quiet] = ['me', 'global', '60', true];
      const r = await cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
      assert.strictEqual(r[0].response, '$sender, global cooldown for me was set to 60s');

      const item = await getRepository(Cooldown).findOne({ where: { name: 'me' } });
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

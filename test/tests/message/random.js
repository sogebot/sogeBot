/* global describe it beforeEach */
require('../../general.js');

const db = require('../../general.js').db;
const msg = require('../../general.js').message;
const Message = require('../../../dest/message').default;
const assert = require('assert');

const owner = { username: 'soge__' };

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/entity/user');

async function setUsersOnline(users) {
  await getRepository(User).update({}, { isOnline: false });
  for (const username of users) {
    await getRepository(User).update({ username }, { isOnline: false });
  }
}

describe('Message - random filter', () => {
  describe('(random.online.viewer) should exclude ignored user', () => {
    before(async () => {
      await db.cleanup();
      await msg.prepare();
      global.tmi.ignoreRm({ sender: owner, parameters: 'ignoreduser' });
      await msg.isSent('ignore.user.is.removed', owner, { username: 'ignoreduser' });
    });

    it('add user ignoreduser to ignore list', async () => {
      global.tmi.ignoreAdd({ sender: owner, parameters: 'ignoreduser' });
      await msg.isSent('ignore.user.is.added', owner, { username: 'ignoreduser' });
    });

    it('From 200 randoms ignoreduser shouldn\'t be picked', async () => {
      for (let i = 0; i < 200; i++) {
        await setUsersOnline(['ignoreduser', 'user1']);
        const message = await new Message('(random.online.viewer)').parse({ sender: { username: 'soge__' }});
        assert.notEqual(message, 'ignoreduser');
      }
    });
  });

  describe('(random.online.follower) should exclude ignored user', () => {
    before(async () => {
      await db.cleanup();
      await msg.prepare();
      global.tmi.ignoreRm({ sender: owner, parameters: 'ignoreduser' });
      await msg.isSent('ignore.user.is.removed', owner, { username: 'ignoreduser' });
    });
    it('add user ignoreduser to ignore list', async () => {
      global.tmi.ignoreAdd({ sender: owner, parameters: 'ignoreduser' });
      await msg.isSent('ignore.user.is.added', owner, { username: 'ignoreduser' });
    });

    const users = ['ignoreduser', 'user1'];
    for (const username of users) {
      it('add user ' + username + ' to users list', async () => {
        await getRepository(User).save({ userId: Math.random(), username, isFollower: true });
      });
    }

    it('From 200 randoms ignoreduser shouldn\'t be picked', async () => {
      for (let i = 0; i < 200; i++) {
        await setUsersOnline(['ignoreduser', 'user1']);
        const message = await new Message('(random.online.follower)').parse({ sender: { username: 'soge__' }});
        assert.notEqual(message, 'ignoreduser');
      }
    });
  });

  describe('(random.online.subscriber) should exclude ignored user', () => {
    before(async () => {
      await db.cleanup();
      await msg.prepare();
      global.tmi.ignoreRm({ sender: owner, parameters: 'ignoreduser' });
      await msg.isSent('ignore.user.is.removed', owner, { username: 'ignoreduser' });
    });
    it('add user ignoreduser to ignore list', async () => {
      global.tmi.ignoreAdd({ sender: owner, parameters: 'ignoreduser' });
      await msg.isSent('ignore.user.is.added', owner, { username: 'ignoreduser' });
    });

    const users = ['ignoreduser', 'user1'];
    for (const username of users) {
      it('add user ' + username + ' to users list', async () => {
        await getRepository(User).save({ userIid: Math.random(), username, isSubscriber: true });
      });
    }

    it('From 200 randoms ignoreduser shouldn\'t be picked', async () => {
      for (let i = 0; i < 200; i++) {
        await setUsersOnline(['ignoreduser', 'user1']);
        const message = await new Message('(random.online.subscriber)').parse({ sender: { username: 'soge__' }});
        assert.notEqual(message, 'ignoreduser');
      }
    });
  });

  describe('(random.viewer) should exclude ignored user', () => {
    before(async () => {
      await db.cleanup();
      await msg.prepare();
      global.tmi.ignoreRm({ sender: owner, parameters: 'ignoreduser' });
      await msg.isSent('ignore.user.is.removed', owner, { username: 'ignoreduser' });
    });

    it('add user ignoreduser to ignore list', async () => {
      global.tmi.ignoreAdd({ sender: owner, parameters: 'ignoreduser' });
      await msg.isSent('ignore.user.is.added', owner, { username: 'ignoreduser' });
    });

    const users = ['ignoreduser', 'user1'];
    for (const username of users) {
      it('add user ' + username + ' to users list', async () => {
        await getRepository(User).save({ userId: Math.random(), username });
      });
    }

    it('From 200 randoms ignoreduser shouldn\'t be picked', async () => {
      for (let i = 0; i < 200; i++) {
        const message = await new Message('(random.viewer)').parse({ sender: { username: 'soge__' }});
        assert.notEqual(message, 'ignoreduser');
      }
    });
  });

  describe('(random.follower) should exclude ignored user', () => {
    before(async () => {
      await db.cleanup();
      await msg.prepare();
      global.tmi.ignoreRm({ sender: owner, parameters: 'ignoreduser' });
      await msg.isSent('ignore.user.is.removed', owner, { username: 'ignoreduser' });
    });
    it('add user ignoreduser to ignore list', async () => {
      global.tmi.ignoreAdd({ sender: owner, parameters: 'ignoreduser' });
      await msg.isSent('ignore.user.is.added', owner, { username: 'ignoreduser' });
    });

    const users = ['ignoreduser', 'user1'];
    for (const username of users) {
      it('add user ' + username + ' to users list', async () => {
        await getRepository(User).save({ userId: Math.random(), username, isFollower: true });
      });
    }

    it('From 200 randoms ignoreduser shouldn\'t be picked', async () => {
      for (let i = 0; i < 200; i++) {
        const message = await new Message('(random.follower)').parse({ sender: { username: 'soge__' }});
        assert.notEqual(message, 'ignoreduser');
      }
    });
  });

  describe('(random.subscriber) should exclude ignored user', () => {
    before(async () => {
      await db.cleanup();
      await msg.prepare();
      global.tmi.ignoreRm({ sender: owner, parameters: 'ignoreduser' });
      await msg.isSent('ignore.user.is.removed', owner, { username: 'ignoreduser' });
    });
    it('add user ignoreduser to ignore list', async () => {
      global.tmi.ignoreAdd({ sender: owner, parameters: 'ignoreduser' });
      await msg.isSent('ignore.user.is.added', owner, { username: 'ignoreduser' });
    });

    const users = ['ignoreduser', 'user1'];
    for (const username of users) {
      it('add user ' + username + ' to users list', async () => {
        await getRepository(User).save({ userIid: Math.random(), username, isSubscriber: true });
      });
    }

    it('From 200 randoms ignoreduser shouldn\'t be picked', async () => {
      for (let i = 0; i < 200; i++) {
        const message = await new Message('(random.subscriber)').parse({ sender: { username: 'soge__' }});
        assert.notEqual(message, 'ignoreduser');
      }
    });
  });
});

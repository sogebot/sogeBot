/* global describe it beforeEach */
require('../../general.js');

const db = require('../../general.js').db;
const msg = require('../../general.js').message;
const Message = require('../../../dest/message');
const assert = require('assert');

const owner = { username: 'soge__' };

async function setUsersOnline(users) {
  await global.db.engine.remove('users.online', {});
  for (const username of users) {
    await global.db.engine.update('users.online', { username }, { username });
  }
}

describe('Message - random filter', () => {
  describe('(random.online.viewer) should exclude ignored user', () => {
    before(async () => {
      await db.cleanup();
      await msg.prepare();
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
    });
    it('add user ignoreduser to ignore list', async () => {
      global.tmi.ignoreAdd({ sender: owner, parameters: 'ignoreduser' });
      await msg.isSent('ignore.user.is.added', owner, { username: 'ignoreduser' });
    });

    const users = ['ignoreduser', 'user1'];
    for (const username of users) {
      it('add user ' + username + ' to users list', async () => {
        await global.db.engine.insert('users', { id: Math.random(), username, is: { follower: true } });
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
    });
    it('add user ignoreduser to ignore list', async () => {
      global.tmi.ignoreAdd({ sender: owner, parameters: 'ignoreduser' });
      await msg.isSent('ignore.user.is.added', owner, { username: 'ignoreduser' });
    });

    const users = ['ignoreduser', 'user1'];
    for (const username of users) {
      it('add user ' + username + ' to users list', async () => {
        await global.db.engine.insert('users', { id: Math.random(), username, is: { subscriber: true } });
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
    });

    it('add user ignoreduser to ignore list', async () => {
      global.tmi.ignoreAdd({ sender: owner, parameters: 'ignoreduser' });
      await msg.isSent('ignore.user.is.added', owner, { username: 'ignoreduser' });
    });

    const users = ['ignoreduser', 'user1'];
    for (const username of users) {
      it('add user ' + username + ' to users list', async () => {
        await global.db.engine.insert('users', { id: Math.random(), username });
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
    });
    it('add user ignoreduser to ignore list', async () => {
      global.tmi.ignoreAdd({ sender: owner, parameters: 'ignoreduser' });
      await msg.isSent('ignore.user.is.added', owner, { username: 'ignoreduser' });
    });

    const users = ['ignoreduser', 'user1'];
    for (const username of users) {
      it('add user ' + username + ' to users list', async () => {
        await global.db.engine.insert('users', { id: Math.random(), username, is: { follower: true } });
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
    });
    it('add user ignoreduser to ignore list', async () => {
      global.tmi.ignoreAdd({ sender: owner, parameters: 'ignoreduser' });
      await msg.isSent('ignore.user.is.added', owner, { username: 'ignoreduser' });
    });

    const users = ['ignoreduser', 'user1'];
    for (const username of users) {
      it('add user ' + username + ' to users list', async () => {
        await global.db.engine.insert('users', { id: Math.random(), username, is: { subscriber: true } });
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

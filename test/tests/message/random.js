/* global describe it */
require('../../general.js');

const db = require('../../general.js').db;
const msg = require('../../general.js').message;
const Message = require('../../../dest/message').default;
const assert = require('assert');
const { prepare } = require('../../../dest/commons');

const owner = { userId: Math.floor(Math.random() * 100000), username: 'soge__' };
const ignoredUser = { userId: Math.floor(Math.random() * 100000), username: 'ignoreduser' };
const user = { userId: Math.floor(Math.random() * 100000), username: 'user1' };

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');

const tmi = (require('../../../dest/tmi')).default;

async function setUsersOnline(users) {
  await getRepository(User).update({}, { isOnline: false });
  for (const username of users) {
    await getRepository(User).update({ username }, { isOnline: true });
  }
}

describe('Message - random filter', () => {
  describe('(random.online.viewer) should exclude ignored user', () => {
    before(async () => {
      await db.cleanup();
      await msg.prepare();

      await getRepository(User).save(owner);
      await getRepository(User).save(ignoredUser);
      await getRepository(User).save(user);

      const r = await tmi.ignoreRm({ sender: owner, parameters: 'ignoreduser' });
      assert.strictEqual(r[0].response, prepare('ignore.user.is.removed', { username: 'ignoreduser' }));
    });

    it('add user ignoreduser to ignore list', async () => {
      const r = await tmi.ignoreAdd({ sender: owner, parameters: 'ignoreduser' });
      assert.strictEqual(r[0].response, prepare('ignore.user.is.added', { username: 'ignoreduser' }));
    });

    it('From 100 randoms ignoreduser shouldn\'t be picked', async () => {
      for (let i = 0; i < 100; i++) {
        await setUsersOnline(['ignoreduser', 'user1']);
        const message = await new Message('(random.online.viewer)').parse({ sender: owner });
        assert.notEqual(message, 'ignoreduser');
      }
    });
  });

  describe('(random.online.follower) should exclude ignored user', () => {
    before(async () => {
      await db.cleanup();
      await msg.prepare();

      await getRepository(User).save(owner);
      await getRepository(User).save(ignoredUser);
      await getRepository(User).save(user);

      const r = await tmi.ignoreRm({ sender: owner, parameters: 'ignoreduser' });
      assert.strictEqual(r[0].response, prepare('ignore.user.is.removed', { username: 'ignoreduser' }));
    });
    it('add user ignoreduser to ignore list', async () => {
      const r = await tmi.ignoreAdd({ sender: owner, parameters: 'ignoreduser' });
      assert.strictEqual(r[0].response, prepare('ignore.user.is.added', { username: 'ignoreduser' }));
    });

    const users = ['ignoreduser', 'user1'];
    for (const username of users) {
      it('add user ' + username + ' to users list', async () => {
        await getRepository(User).save({ userId: Math.floor(Math.random() * 100000), username, isFollower: true });
      });
    }

    it('From 100 randoms ignoreduser shouldn\'t be picked', async () => {
      for (let i = 0; i < 100; i++) {
        await setUsersOnline(['ignoreduser', 'user1']);
        const message = await new Message('(random.online.follower)').parse({ sender: owner});
        assert.notEqual(message, 'ignoreduser');
      }
    });
  });

  describe('(random.online.subscriber) should exclude ignored user', () => {
    before(async () => {
      await db.cleanup();
      await msg.prepare();

      await getRepository(User).save(owner);
      await getRepository(User).save(ignoredUser);
      await getRepository(User).save(user);

      const r = await tmi.ignoreRm({ sender: owner, parameters: 'ignoreduser' });
      assert.strictEqual(r[0].response, prepare('ignore.user.is.removed', { username: 'ignoreduser' }));
    });
    it('add user ignoreduser to ignore list', async () => {
      const r = await tmi.ignoreAdd({ sender: owner, parameters: 'ignoreduser' });
      assert.strictEqual(r[0].response, prepare('ignore.user.is.added', { username: 'ignoreduser' }));
    });

    const users = ['ignoreduser', 'user1'];
    for (const username of users) {
      it('add user ' + username + ' to users list', async () => {
        await getRepository(User).save({ userId: Math.floor(Math.random() * 100000), username, isSubscriber: true });
      });
    }

    it('From 100 randoms ignoreduser shouldn\'t be picked', async () => {
      for (let i = 0; i < 100; i++) {
        await setUsersOnline(['ignoreduser', 'user1']);
        const message = await new Message('(random.online.subscriber)').parse({ sender: owner});
        assert.notEqual(message, 'ignoreduser');
      }
    });
  });

  describe('(random.viewer) should exclude ignored user', () => {
    before(async () => {
      await db.cleanup();
      await msg.prepare();

      await getRepository(User).save(owner);
      await getRepository(User).save(ignoredUser);
      await getRepository(User).save(user);

      const r = await tmi.ignoreRm({ sender: owner, parameters: 'ignoreduser' });
      assert.strictEqual(r[0].response, prepare('ignore.user.is.removed', { username: 'ignoreduser' }));
    });

    it('add user ignoreduser to ignore list', async () => {
      const r = await tmi.ignoreAdd({ sender: owner, parameters: 'ignoreduser' });
      assert.strictEqual(r[0].response, prepare('ignore.user.is.added', { username: 'ignoreduser' }));
    });

    const users = ['ignoreduser', 'user1'];
    for (const username of users) {
      it('add user ' + username + ' to users list', async () => {
        await getRepository(User).save({ userId: Math.floor(Math.random() * 100000), username });
      });
    }

    it('From 100 randoms ignoreduser shouldn\'t be picked', async () => {
      for (let i = 0; i < 100; i++) {
        const message = await new Message('(random.viewer)').parse({ sender: owner});
        assert.notEqual(message, 'ignoreduser');
      }
    });
  });

  describe('(random.follower) should exclude ignored user', () => {
    before(async () => {
      await db.cleanup();
      await msg.prepare();

      await getRepository(User).save(owner);
      await getRepository(User).save(ignoredUser);
      await getRepository(User).save(user);

      const r = await tmi.ignoreRm({ sender: owner, parameters: 'ignoreduser' });
      assert.strictEqual(r[0].response, prepare('ignore.user.is.removed', { username: 'ignoreduser' }));
    });
    it('add user ignoreduser to ignore list', async () => {
      const r = await tmi.ignoreAdd({ sender: owner, parameters: 'ignoreduser' });
      assert.strictEqual(r[0].response, prepare('ignore.user.is.added', { username: 'ignoreduser' }));
    });

    const users = ['ignoreduser', 'user1'];
    for (const username of users) {
      it('add user ' + username + ' to users list', async () => {
        await getRepository(User).save({ userId: Math.floor(Math.random() * 100000), username, isFollower: true });
      });
    }

    it('From 100 randoms ignoreduser shouldn\'t be picked', async () => {
      for (let i = 0; i < 100; i++) {
        const message = await new Message('(random.follower)').parse({ sender: owner});
        assert.notEqual(message, 'ignoreduser');
      }
    });
  });

  describe('(random.subscriber) should exclude ignored user', () => {
    before(async () => {
      await db.cleanup();
      await msg.prepare();

      await getRepository(User).save(owner);
      await getRepository(User).save(ignoredUser);
      await getRepository(User).save(user);

      const r = await tmi.ignoreRm({ sender: owner, parameters: 'ignoreduser' });
      assert.strictEqual(r[0].response, prepare('ignore.user.is.removed', { username: 'ignoreduser' }));
    });
    it('add user ignoreduser to ignore list', async () => {
      const r = await tmi.ignoreAdd({ sender: owner, parameters: 'ignoreduser' });
      assert.strictEqual(r[0].response, prepare('ignore.user.is.added', { username: 'ignoreduser' }));
    });

    const users = ['ignoreduser', 'user1'];
    for (const username of users) {
      it('add user ' + username + ' to users list', async () => {
        await getRepository(User).save({ userId: Math.floor(Math.random() * 100000), username, isSubscriber: true });
      });
    }

    it('From 100 randoms ignoreduser shouldn\'t be picked', async () => {
      for (let i = 0; i < 100; i++) {
        const message = await new Message('(random.subscriber)').parse({ sender: owner});
        assert.notEqual(message, 'ignoreduser');
      }
    });
  });
});

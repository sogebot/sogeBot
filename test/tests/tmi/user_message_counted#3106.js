/* global describe it before */

const assert = require('chai').assert;
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');
const { Settings } = require('../../../dest/database/entity/settings');

const tmi = (require('../../../dest/tmi')).default;
const api = (require('../../../dest/api')).default;

// users
const owner = { username: 'soge__' };
const testuser1 = { username: 'testuser1', userId: '1' };
const testuser2 = { username: 'testuser2', userId: '2' };

const commons = require('../../../dest/commons');
const { VariableWatcher } = require('../../../dest/watchers');

describe('TMI - User should have counted messages - https://github.com/sogehige/sogeBot/issues/3106', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();

    tmi.globalIgnoreListExclude = [];
    tmi.ignorelist = [];

    await getRepository(User).save(testuser1);
    await getRepository(User).save(testuser2);
  });

  it ('Set stream as online', async () => {
    api.isStreamOnline = true;
  });

  it ('Send 10 messages as testuser1', async () => {
    for (let i = 0; i < 10; i++) {
      await tmi.message({
        message: {
          tags: testuser1,
          message: 'a',
        }
      })
    }
  })

  it ('Send 5 messages as testuser2', async () => {
    for (let i = 0; i < 5; i++) {
      await tmi.message({
        message: {
          tags: testuser2,
          message: 'a',
        }
      })
    }
  })

  it ('Set stream as offline', async () => {
    api.isStreamOnline = false;
  });

  it ('Send 10 messages as testuser1', async () => {
    for (let i = 0; i < 10; i++) {
      await tmi.message({
        message: {
          tags: testuser1,
          message: 'a',
        }
      })
    }
  })

  it ('Send 5 messages as testuser2', async () => {
    for (let i = 0; i < 5; i++) {
      await tmi.message({
        message: {
          tags: testuser2,
          message: 'a',
        }
      })
    }
  })

  it ('testuser1 should have 10 messages', async () => {
    const user = await getRepository(User).findOne({ userId: testuser1.userId })
    assert.isTrue(user.messages === 10, `Expected 10 messages, got ${user.messages} messages`);
  });

  it ('testuser2 should have 5 messages', async () => {
    const user = await getRepository(User).findOne({ userId: testuser2.userId })
    assert.isTrue(user.messages === 5, `Expected 5 messages, got ${user.messages} messages`);
  });
});

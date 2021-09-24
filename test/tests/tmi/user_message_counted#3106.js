/* global */

const assert = require('assert');

const { getRepository } = require('typeorm');

require('../../general.js');

const commons = require('../../../dest/commons');
const { Settings } = require('../../../dest/database/entity/settings');
const { User } = require('../../../dest/database/entity/user');
const isStreamOnline = (require('../../../dest/helpers/api/isStreamOnline')).isStreamOnline;
const changelog = (require('../../../dest/helpers/user/changelog'));
// eslint-disable-next-line import/order
const tmi = require('../../../dest/tmi').default;

// users
const owner = { username: '__broadcaster__' };
const testuser1 = { username: 'testuser1', userId: '1' };
const testuser2 = { username: 'testuser2', userId: '2' };

const { VariableWatcher } = require('../../../dest/watchers');
const message = require('../../general.js').message;
const db = require('../../general.js').db;

describe('TMI - User should have counted messages - https://github.com/sogehige/sogeBot/issues/3106 - @func3', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();

    tmi.globalIgnoreListExclude = [];
    tmi.ignorelist = [];

    await getRepository(User).save(testuser1);
    await getRepository(User).save(testuser2);
  });

  it ('Set stream as online', async () => {
    isStreamOnline.value = true;
  });

  it ('Send 10 messages as testuser1', async () => {
    for (let i = 0; i < 10; i++) {
      await tmi.message({
        message: {
          tags:    testuser1,
          message: 'a',
        },
      });
    }
  });

  it ('Send 5 messages as testuser2', async () => {
    for (let i = 0; i < 5; i++) {
      await tmi.message({
        message: {
          tags:    testuser2,
          message: 'a',
        },
      });
    }
  });

  it ('Set stream as offline', async () => {
    isStreamOnline.value = false;
  });

  it ('Send 10 messages as testuser1', async () => {
    for (let i = 0; i < 10; i++) {
      await tmi.message({
        message: {
          tags:    testuser1,
          message: 'a',
        },
      });
    }
  });

  it ('Send 5 messages as testuser2', async () => {
    for (let i = 0; i < 5; i++) {
      await tmi.message({
        message: {
          tags:    testuser2,
          message: 'a',
        },
      });
    }
  });

  it ('testuser1 should have 20 messages', async () => {
    await changelog.flush();
    const user = await getRepository(User).findOne({ userId: testuser1.userId });
    assert(user.messages === 20, `Expected 20 messages, got ${user.messages} messages`);
  });

  it ('testuser2 should have 10 messages', async () => {
    await changelog.flush();
    const user = await getRepository(User).findOne({ userId: testuser2.userId });
    assert(user.messages === 10, `Expected 10 messages, got ${user.messages} messages`);
  });
});

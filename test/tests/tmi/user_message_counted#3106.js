/* global */

import assert from 'assert';

import('../../general.js');

import * as commons from '../../../dest/commons.js'
import { AppDataSource } from '../../../dest/database.js';
import { Settings } from '../../../dest/database/entity/settings.js';
import { User } from '../../../dest/database/entity/user.js';
import { isStreamOnline } from '../../../dest/helpers/api/isStreamOnline.js'
import * as changelog from '../../../dest/helpers/user/changelog.js';
import twitch from '../../../dest/services/twitch.js';
// users
const owner = { userName: '__broadcaster__' };
const testuser1 = {
  userName: 'testuser1', userId: '1',
};
const testuser2 = {
  userName: 'testuser2', userId: '2',
};

import { VariableWatcher } from '../../../dest/watchers.js';
import { message } from '../../general.js';
import { db } from '../../general.js';

import TMI from '../../../dest/services/twitch/chat.js';
const tmi = new TMI();

describe('TMI - User should have counted messages - https://github.com/sogehige/sogeBot/issues/3106 - @func3', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();

    twitch.globalIgnoreListExclude = [];
    twitch.ignorelist = [];

    await AppDataSource.getRepository(User).save(testuser1);
    await AppDataSource.getRepository(User).save(testuser2);
  });

  it ('Set stream as online', async () => {
    isStreamOnline.value = true;
  });

  it ('Send 10 messages as testuser1', async () => {
    for (let i = 0; i < 10; i++) {
      await tmi.message({ userstate: testuser1, message: 'a' });
    }
  });

  it ('Send 5 messages as testuser2', async () => {
    for (let i = 0; i < 5; i++) {
      await tmi.message({ userstate: testuser2, message: 'a' });
    }
  });

  it ('Set stream as offline', async () => {
    isStreamOnline.value = false;
  });

  it ('Send 10 messages as testuser1', async () => {
    for (let i = 0; i < 10; i++) {
      await tmi.message({ userstate: testuser1, message: 'a' });
    }
  });

  it ('Send 5 messages as testuser2', async () => {
    for (let i = 0; i < 5; i++) {
      await tmi.message({ userstate: testuser2, message: 'a' });
    }
  });

  it ('testuser1 should have 20 messages', async () => {
    await changelog.flush();
    const user = await AppDataSource.getRepository(User).findOneBy({ userId: testuser1.userId });
    assert(user.messages === 20, `Expected 20 messages, got ${user.messages} messages`);
  });

  it ('testuser2 should have 10 messages', async () => {
    await changelog.flush();
    const user = await AppDataSource.getRepository(User).findOneBy({ userId: testuser2.userId });
    assert(user.messages === 10, `Expected 10 messages, got ${user.messages} messages`);
  });
});

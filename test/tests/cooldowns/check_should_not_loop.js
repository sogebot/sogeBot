
/* global describe it before */


import('../../general.js');

import { Cooldown } from '../../../dest/database/entity/cooldown.js';
import { User } from '../../../dest/database/entity/user.js';
import { Keyword } from '../../../dest/database/entity/keyword.js';

import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js';

import { db } from '../../general.js';
import { message } from '../../general.js';

import cooldown from '../../../dest/systems/cooldown.js'

// users
const owner = { userId: String(Math.floor(Math.random() * 100000)), userName: '__broadcaster__', badges: {} };
const testUser = { userId: String(Math.floor(Math.random() * 100000)), userName: 'test', badges: {} };


describe('cooldown - @func3 check should not endlessly loop', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();

    await AppDataSource.getRepository(User).save({ userName: owner.userName, userId: owner.userId, isSubscriber: true });

  });

  it('Command `!someCommand hello` should pass', async () => {
    const isOk = await cooldown.check({ sender: testUser, message: '!someCommand hello' });
    assert(isOk);
  });
});

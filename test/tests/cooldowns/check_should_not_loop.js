/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it before */


import('../../general.js');

const { Cooldown, CooldownViewer } = require('../../../dest/database/entity/cooldown');
import { User } from '../../../dest/database/entity/user.js';
const { Keyword } = require('../../../dest/database/entity/keyword');

import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js';

import { db } from '../../general.js';
import { message } from '../../general.js';

const cooldown = (require('../../../dest/systems/cooldown')).default;

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

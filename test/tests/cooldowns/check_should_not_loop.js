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

// users
const owner = { userId: Math.floor(Math.random() * 100000), username: 'soge__', badges: {} };
const testUser = { userId: Math.floor(Math.random() * 100000), username: 'test', badges: {} };


describe('cooldown check should not endlessly loop', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();

    await getRepository(User).save({ username: owner.username, userId: owner.userId, isSubscriber: true });

  });

  it('Command `!someCommand hello` should pass', async () => {
    const isOk = await cooldown.check({ sender: testUser, message: '!someCommand hello' });
    assert(isOk);
  });
});

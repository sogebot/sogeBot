/* global describe it beforeEach */
require('../../general.js');

const assert = require('assert');
const _ = require('lodash');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');

const cooldown = (require('../../../dest/systems/cooldown')).default;

// users
const owner = { userId: Math.floor(Math.random() * 100000), badges: {}, username: 'soge__' };
const follower = { badges: {}, username: 'follower', userId: Number(_.random(999999, false)), isFollower: true };
const commonUser = { badges: {}, username: 'user1', userId: Number(_.random(999999, false)) };
const commonUser2 = { badges: {}, username: 'user2', userId: Number(_.random(999999, false)) };

describe('Cooldowns - toggleFollowers()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();
    await getRepository(User).save(follower);
    await getRepository(User).save(commonUser);
    await getRepository(User).save(commonUser2);
  });

  it('incorrect toggle', async () => {
    const [command, type, seconds, quiet] = ['!me', 'user', '60', true];
    const r = await cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
    const r2 = await cooldown.toggleFollowers({ sender: owner, parameters: command });

    assert.strictEqual(r[0].response, '$sender, user cooldown for !me was set to 60s');
    assert.strictEqual(r2[0].response, 'Sorry, $sender, but this command is not correct, use !cooldown [keyword|!command] [global|user] [seconds] [true/false]');
  });

  it('correct toggle - follower user', async () => {
    const [command, type, seconds, quiet] = ['!me', 'user', '60', true];
    const r = await cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
    const r2 = await cooldown.toggleFollowers({ sender: owner, parameters: `${command} ${type}` });

    assert.strictEqual(r[0].response, '$sender, user cooldown for !me was set to 60s');
    assert.strictEqual(r2[0].response, '$sender, cooldown for !me was disabled for followers');

    let isOk = await cooldown.check({ sender: follower, message: '!me' });
    assert(isOk);
    isOk = await cooldown.check({ sender: follower, message: '!me' });
    assert(isOk);

    const r3 = await cooldown.toggleFollowers({ sender: owner, parameters: `${command} ${type}` });
    assert.strictEqual(r3[0].response, '$sender, cooldown for !me was enabled for followers');

    isOk = await cooldown.check({ sender: follower, message: '!me' });
    assert(isOk);
    isOk = await cooldown.check({ sender: follower, message: '!me' });
    assert(!isOk);
  });

  it('correct toggle - common user', async () => {
    const [command, type, seconds, quiet] = ['!me', 'user', '60', true];
    const r = await cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
    assert.strictEqual(r[0].response, '$sender, user cooldown for !me was set to 60s');

    let isOk = await cooldown.check({ sender: commonUser, message: '!me' });
    assert(isOk);
    isOk = await cooldown.check({ sender: commonUser, message: '!me' });
    assert(!isOk);

    const r2 = await cooldown.toggleFollowers({ sender: owner, parameters: `${command} ${type}` });
    assert.strictEqual(r2[0].response, '$sender, cooldown for !me was disabled for followers');

    isOk = await cooldown.check({ sender: commonUser, message: '!me' });
    assert(!isOk);
    isOk = await cooldown.check({ sender: commonUser, message: '!me' });
    assert(!isOk);
  });

  it('correct toggle - common user2', async () => {
    const [command, type, seconds, quiet] = ['!me', 'user', '60', true];
    const r = await cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
    assert.strictEqual(r[0].response, '$sender, user cooldown for !me was set to 60s');

    let isOk = await cooldown.check({ sender: commonUser2, message: '!me' });
    assert(isOk);
    isOk = await cooldown.check({ sender: commonUser2, message: '!me' });
    assert(!isOk);

    const r2 = await cooldown.toggleFollowers({ sender: owner, parameters: `${command} ${type}` });
    assert.strictEqual(r2[0].response, '$sender, cooldown for !me was disabled for followers');

    isOk = await cooldown.check({ sender: commonUser2, message: '!me' });
    assert(!isOk);
    isOk = await cooldown.check({ sender: commonUser2, message: '!me' });
    assert(!isOk);
  });
});

/* global describe it beforeEach */
require('../../general.js');

const assert = require('chai').assert;
const _ = require('lodash');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/entity/user');

// users
const owner = { userId: Math.floor(Math.random() * 100000), badges: {}, username: 'soge__' };
const follower = { badges: {}, username: 'follower', userId: String(_.random(999999, false)), isFollower: true };
const commonUser = { badges: {}, username: 'user1', userId: String(_.random(999999, false)) };
const commonUser2 = { badges: {}, username: 'user2', userId: String(_.random(999999, false)) };

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
    global.systems.cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: command, type: type, seconds: seconds, sender: owner.username });

    global.systems.cooldown.toggleFollowers({ sender: owner, parameters: command });
    await message.isSent('cooldowns.cooldown-parse-failed', owner, { sender: owner.username });
  });

  it('correct toggle - follower user', async () => {
    const [command, type, seconds, quiet] = ['!me', 'user', '60', true];
    global.systems.cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: command, type: type, seconds: seconds, sender: owner.username });

    global.systems.cooldown.toggleFollowers({ sender: owner, parameters: `${command} ${type}` });
    await message.isSent('cooldowns.cooldown-was-disabled-for-followers', owner, { command: command, sender: owner.username });

    let isOk = await global.systems.cooldown.check({ sender: follower, message: '!me' });
    assert.isTrue(isOk);
    isOk = await global.systems.cooldown.check({ sender: follower, message: '!me' });
    assert.isTrue(isOk);

    global.systems.cooldown.toggleFollowers({ sender: owner, parameters: `${command} ${type}` });
    await message.isSent('cooldowns.cooldown-was-enabled-for-followers', owner, { command: command, sender: owner.username });

    isOk = await global.systems.cooldown.check({ sender: follower, message: '!me' });
    assert.isTrue(isOk);
    isOk = await global.systems.cooldown.check({ sender: follower, message: '!me' });
    assert.isFalse(isOk);
  });

  it('correct toggle - common user', async () => {
    const [command, type, seconds, quiet] = ['!me', 'user', '60', true];
    global.systems.cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: command, type: type, seconds: seconds, sender: owner.username });

    let isOk = await global.systems.cooldown.check({ sender: commonUser, message: '!me' });
    assert.isTrue(isOk);
    isOk = await global.systems.cooldown.check({ sender: commonUser, message: '!me' });
    assert.isFalse(isOk);

    global.systems.cooldown.toggleFollowers({ sender: owner, parameters: `${command} ${type}` });
    await message.isSent('cooldowns.cooldown-was-disabled-for-followers', owner, { command: command, sender: owner.username });

    isOk = await global.systems.cooldown.check({ sender: commonUser, message: '!me' });
    assert.isFalse(isOk);
    isOk = await global.systems.cooldown.check({ sender: commonUser, message: '!me' });
    assert.isFalse(isOk);
  });

  it('correct toggle - common user2', async () => {
    const [command, type, seconds, quiet] = ['!me', 'user', '60', true];
    global.systems.cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: command, type: type, seconds: seconds, sender: owner.username });

    let isOk = await global.systems.cooldown.check({ sender: commonUser2, message: '!me' });
    assert.isTrue(isOk);
    isOk = await global.systems.cooldown.check({ sender: commonUser2, message: '!me' });
    assert.isFalse(isOk);

    global.systems.cooldown.toggleFollowers({ sender: owner, parameters: `${command} ${type}` });
    await message.isSent('cooldowns.cooldown-was-disabled-for-followers', owner, { command: command, sender: owner.username });

    isOk = await global.systems.cooldown.check({ sender: commonUser2, message: '!me' });
    assert.isFalse(isOk);
    isOk = await global.systems.cooldown.check({ sender: commonUser2, message: '!me' });
    assert.isFalse(isOk);
  });
});

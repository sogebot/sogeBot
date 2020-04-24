/* global describe it beforeEach */
require('../../general.js');

const assert = require('assert');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const cooldown = (require('../../../dest/systems/cooldown')).default;

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');

// users
const owner = { userId: Math.floor(Math.random() * 100000), badges: {}, username: 'soge__' };
const subscriber = { userId: Math.floor(Math.random() * 100000), badges: { subscriber: 1 }, username: 'sub1'};

describe('Cooldowns - toggleSubscribers()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();

    await getRepository(User).save({ username: owner.username, userId: owner.userId });
    await getRepository(User).save({ username: subscriber.username, userId: subscriber.userId, isSubscriber: true });
  });

  it('incorrect toggle', async () => {
    const [command, type, seconds, quiet] = ['!me', 'user', '60', true];
    cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: command, type: type, seconds: seconds, sender: owner.username });

    cooldown.toggleSubscribers({ sender: owner, parameters: command });
    await message.isSent('cooldowns.cooldown-parse-failed', owner, { sender: owner.username });
  });

  it('correct toggle', async () => {
    const [command, type, seconds, quiet] = ['!me', 'user', '60', true];
    cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: command, type: type, seconds: seconds, sender: owner.username });

    cooldown.toggleSubscribers({ sender: owner, parameters: `${command} ${type}` });
    await message.isSent('cooldowns.cooldown-was-disabled-for-subscribers', owner, { command: command, sender: owner.username });

    let isOk = await cooldown.check({ sender: subscriber, message: '!me' });
    assert(isOk);
    isOk = await cooldown.check({ sender: subscriber, message: '!me' });
    assert(isOk);

    cooldown.toggleSubscribers({ sender: owner, parameters: `${command} ${type}` });
    await message.isSent('cooldowns.cooldown-was-enabled-for-subscribers', owner, { command: command, sender: owner.username });

    isOk = await cooldown.check({ sender: subscriber, message: '!me' });
    assert(isOk);
    isOk = await cooldown.check({ sender: subscriber, message: '!me' });
    assert(!isOk);
  });
});

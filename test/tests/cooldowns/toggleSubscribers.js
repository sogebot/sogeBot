/* global describe it beforeEach */
require('../../general.js');

const assert = require('assert');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const cooldown = (require('../../../dest/systems/cooldown')).default;

// users
const owner = { userId: Math.floor(Math.random() * 100000), badges: {}, username: 'soge__' };
const subscriber = { userId: Math.floor(Math.random() * 100000), badges: { subscriber: 1 }, username: 'sub1'};

describe('Cooldowns - toggleSubscribers()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();
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

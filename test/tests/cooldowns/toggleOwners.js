/* global describe it beforeEach */
require('../../general.js');

const assert = require('chai').assert;

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const cooldown = (require('../../../dest/systems/cooldown')).default;

// users
const owner = { userId: Math.floor(Math.random() * 100000), username: 'soge__', badges: {} };

describe('Cooldowns - toggleOwners()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('incorrect toggle', async () => {
    const [command, type, seconds, quiet] = ['!me', 'user', '60', true];
    cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: command, type: type, seconds: seconds, sender: owner.username });

    cooldown.toggleOwners({ sender: owner, parameters: command });
    await message.isSent('cooldowns.cooldown-parse-failed', owner, { sender: owner.username });
  });

  it('correct toggle', async () => {
    const [command, type, seconds, quiet] = ['!me', 'user', '60', true];
    cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
    await message.isSent('cooldowns.cooldown-was-set', owner, { command: command, type: type, seconds: seconds, sender: owner.username });

    cooldown.toggleOwners({ sender: owner, parameters: `${command} ${type}` });
    await message.isSent('cooldowns.cooldown-was-enabled-for-owners', owner, { command: command, sender: owner.username });
    let isOk = await cooldown.check({ sender: owner, message: '!me' });
    assert.isTrue(isOk);
    isOk = await cooldown.check({ sender: owner, message: '!me' });
    assert.isFalse(isOk);

    cooldown.toggleOwners({ sender: owner, parameters: `${command} ${type}` });
    await message.isSent('cooldowns.cooldown-was-disabled-for-owners', owner, { command: command, sender: owner.username });
  });
});

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
    const r = await cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
    const r2 = await cooldown.toggleSubscribers({ sender: owner, parameters: command });

    assert.strictEqual(r[0].response, '$sender, user cooldown for !me was set to 60s');
    assert.strictEqual(r2[0].response, 'Sorry, $sender, but this command is not correct, use !cooldown [keyword|!command] [global|user] [seconds] [true/false]');
  });

  it('correct toggle', async () => {
    const [command, type, seconds, quiet] = ['!me', 'user', '60', true];
    const r = await cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
    assert.strictEqual(r[0].response, '$sender, user cooldown for !me was set to 60s');

    const r2 = await cooldown.toggleSubscribers({ sender: owner, parameters: `${command} ${type}` });
    assert.strictEqual(r2[0].response, '$sender, cooldown for !me was disabled for subscribers');

    let isOk = await cooldown.check({ sender: subscriber, message: '!me' });
    assert(isOk);
    isOk = await cooldown.check({ sender: subscriber, message: '!me' });
    assert(isOk);

    const r3 = await cooldown.toggleSubscribers({ sender: owner, parameters: `${command} ${type}` });
    assert.strictEqual(r3[0].response, '$sender, cooldown for !me was enabled for subscribers');

    isOk = await cooldown.check({ sender: subscriber, message: '!me' });
    assert(isOk);
    isOk = await cooldown.check({ sender: subscriber, message: '!me' });
    assert(!isOk);
  });
});

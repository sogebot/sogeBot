/* global describe it beforeEach */
require('../../general.js');

const assert = require('assert');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const cooldown = (require('../../../dest/systems/cooldown')).default;

// users
const owner = { userId: String(Math.floor(Math.random() * 100000)), badges: {}, username: '__broadcaster__' };
const testUser = { userId: String(Math.floor(Math.random() * 100000)), badges: {}, username: 'test' };

describe('Cooldowns - toggleEnabled()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('incorrect toggle', async () => {
    const [command, type, seconds, quiet] = ['!me', 'user', '60', true];
    const r = await cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
    const r2 = await cooldown.toggleEnabled({ sender: owner, parameters: command });

    assert.strictEqual(r[0].response, '$sender, user cooldown for !me was set to 60s');
    assert.strictEqual(r2[0].response, 'Usage => http://sogehige.github.io/sogeBot/#/_master/systems/cooldowns');
  });

  it('correct toggle', async () => {
    const [command, type, seconds, quiet] = ['!me', 'user', '60', true];
    const r = await cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
    const r2 = await cooldown.toggleEnabled({ sender: owner, parameters: `${command} ${type}` });

    assert.strictEqual(r[0].response, '$sender, user cooldown for !me was set to 60s');
    assert.strictEqual(r2[0].response, '$sender, cooldown for !me was disabled');

    let isOk = await cooldown.check({ sender: testUser, message: '!me' });
    assert(isOk);
    isOk = await cooldown.check({ sender: testUser, message: '!me' });
    assert(isOk);

    const r3 = await cooldown.toggleEnabled({ sender: owner, parameters: `${command} ${type}` });
    assert.strictEqual(r3[0].response, '$sender, cooldown for !me was enabled');
  });
});

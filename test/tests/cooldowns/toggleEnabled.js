/* global  */

import assert from 'assert';

import cooldown from '../../../dest/systems/cooldown.js'
import { db } from '../../general.js';
import { message, url } from '../../general.js';

import('../../general.js');

// users
const owner = {
  userId: String(Math.floor(Math.random() * 100000)), badges: {}, userName: '__broadcaster__',
};
const testUser = {
  userId: String(Math.floor(Math.random() * 100000)), badges: {}, userName: 'test',
};

describe('Cooldowns - toggleEnabled() - @func3', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('incorrect toggle', async () => {
    const [command, type, seconds, quiet] = ['!me', 'user', '60', true];
    const r = await cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
    const r2 = await cooldown.toggleEnabled({ sender: owner, parameters: command });

    assert.strictEqual(r[0].response, '$sender, user cooldown for !me was set to 60s');
    assert.strictEqual(r2[0].response, 'Usage => ' + url + '/systems/cooldowns');
  });

  it('correct toggle - command', async () => {
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

  it('correct toggle - group', async () => {
    const [command, type, seconds, quiet] = ['g:voice', 'user', '60', true];
    const r = await cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
    const r2 = await cooldown.toggleEnabled({ sender: owner, parameters: `${command} ${type}` });

    assert.strictEqual(r[0].response, '$sender, user cooldown for g:voice was set to 60s');
    assert.strictEqual(r2[0].response, '$sender, cooldown for g:voice was disabled');

    let isOk = await cooldown.check({ sender: testUser, message: 'g:voice' });
    assert(isOk);
    isOk = await cooldown.check({ sender: testUser, message: 'g:voice' });
    assert(isOk);

    const r3 = await cooldown.toggleEnabled({ sender: owner, parameters: `${command} ${type}` });
    assert.strictEqual(r3[0].response, '$sender, cooldown for g:voice was enabled');
  });

  it('correct toggle - keyword', async () => {
    const [command, type, seconds, quiet] = ['KEKW', 'user', '60', true];
    const r = await cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });

    const r2 = await cooldown.toggleEnabled({ sender: owner, parameters: `${command} ${type}` });

    assert.strictEqual(r[0].response, '$sender, user cooldown for KEKW was set to 60s');
    assert.strictEqual(r2[0].response, '$sender, cooldown for KEKW was disabled');

    let isOk = await cooldown.check({ sender: testUser, message: 'KEKW' });
    assert(isOk);
    isOk = await cooldown.check({ sender: testUser, message: 'KEKW' });
    assert(isOk);

    const r3 = await cooldown.toggleEnabled({ sender: owner, parameters: `${command} ${type}` });
    assert.strictEqual(r3[0].response, '$sender, cooldown for KEKW was enabled');
  });
});

/* global describe it beforeEach */
import('../../general.js');

import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js';

import { db } from '../../general.js';
import { message, url } from '../../general.js';

import cooldown from '../../../dest/systems/cooldown.js'

import { User } from '../../../dest/database/entity/user.js';

// users
const owner = { userId: String(Math.floor(Math.random() * 100000)), badges: {}, userName: '__broadcaster__' };
const mod = { userId: String(Math.floor(Math.random() * 100000)), badges: {}, userName: 'mod' };

describe('Cooldowns - toggleModerators() - @func3', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();

    await AppDataSource.getRepository(User).save({ userName: owner.userName, userId: owner.userId });
    await AppDataSource.getRepository(User).save({ userName: mod.userName, userId: mod.userId, isModerator: true });
  });

  it('incorrect toggle', async () => {
    const [command, type, seconds, quiet] = ['!me', 'user', '60', true];
    const r = await cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
    const r2 = await cooldown.toggleModerators({ sender: owner, parameters: command });

    assert.strictEqual(r[0].response, '$sender, user cooldown for !me was set to 60s');
    assert.strictEqual(r2[0].response, 'Usage => ' + url + '/systems/cooldowns');
  });

  it('correct toggle', async () => {
    const [command, type, seconds, quiet] = ['!me', 'user', '60', true];
    const r = await cooldown.main({ sender: owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
    assert.strictEqual(r[0].response, '$sender, user cooldown for !me was set to 60s');

    const r2 = await cooldown.toggleModerators({ sender: owner, parameters: `${command} ${type}` });
    assert.strictEqual(r2[0].response, '$sender, cooldown for !me was enabled for moderators');

    let isOk = await cooldown.check({ sender: mod, message: '!me' });
    assert(isOk);
    isOk = await cooldown.check({ sender: mod, message: '!me' });
    assert(!isOk);

    const r3 = await cooldown.toggleModerators({ sender: owner, parameters: `${command} ${type}` });
    assert.strictEqual(r3[0].response, '$sender, cooldown for !me was disabled for moderators');
  });
});

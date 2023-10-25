/* global describe it beforeEach */
import('../../general.js');

import { db } from '../../general.js';
import { message } from '../../general.js';

import assert from 'assert';

import customcommands from '../../../dest/systems/customcommands.js';

// users
const owner = { userName: '__broadcaster__' };

describe('Custom Commands - @func1 - list()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('empty list', async () => {
    const r = await customcommands.list({ sender: owner, parameters: '' });
    assert.strictEqual(r[0].response, '$sender, list of commands is empty');
  });

  it('populated list', async () => {
    const r = await customcommands.add({ sender: owner, parameters: '-p casters -c !a -r me' });
    assert.strictEqual(r[0].response, '$sender, command !a was added');

    const r2 = await customcommands.add({ sender: owner, parameters: '-p moderators -s true -c !a -r me2' });
    assert.strictEqual(r2[0].response, '$sender, command !a was added');

    const r3 = await customcommands.add({ sender: owner, parameters: '-c !b -r me' });
    assert.strictEqual(r3[0].response, '$sender, command !b was added');

    const r4 = await customcommands.list({ sender: owner, parameters: '' });
    assert.strictEqual(r4[0].response, '$sender, list of commands: !a, !b');

    const r5 = await customcommands.list({ sender: owner, parameters: '!a' });
    assert.strictEqual(r5[0].response, '!a#1 (Casters) v| me');
    assert.strictEqual(r5[1].response, '!a#2 (Moderators) _| me2');
  });
});

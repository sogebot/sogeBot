/* global describe it */
import('../../general.js');

import { db } from '../../general.js';
import { message } from '../../general.js';
import assert from 'assert';

import keywords from '../../../dest/systems/keywords.js';

import { Keyword } from '../../../dest/database/entity/keyword.js';
import { User } from '../../../dest/database/entity/user.js';

// users
const owner = { userName: '__broadcaster__', userId: String(Math.floor(Math.random() * 100000)) };

describe('Keywords - list() - @func2', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('empty list', async () => {
    const r = await keywords.list({ sender: owner, parameters: '' });
    assert.strictEqual(r[0].response, '$sender, list of keywords is empty');
  });

  it('populated list', async () => {
    const r = await keywords.add({ sender: owner, parameters: '-p casters -k aaa -r me' });
    assert.strictEqual(r[0].response, `$sender, keyword aaa (${r[0].id}) was added`);

    const r2 = await keywords.add({ sender: owner, parameters: '-p moderators -s true -k aaa -r me2' });
    assert.strictEqual(r2[0].response, `$sender, keyword aaa (${r2[0].id}) was added`);

    const r3 = await keywords.add({ sender: owner, parameters: '-k bbb -r me' });
    assert.strictEqual(r3[0].response, `$sender, keyword bbb (${r3[0].id}) was added`);

    const r4 = await keywords.list({ sender: owner, parameters: '' });
    assert.strictEqual(r4[0].response, '$sender, list of keywords: aaa, bbb');

    const r5 = await keywords.list({ sender: owner, parameters: 'aaa' });
    assert.strictEqual(r5[0].response, 'aaa#1 (Casters) v| me');
    assert.strictEqual(r5[1].response, 'aaa#2 (Moderators) _| me2');

    const r6 = await keywords.list({ sender: owner, parameters: 'asdsad' });
    assert.strictEqual(r6[0].response, '$sender, asdsad have no responses or doesn\'t exists');
  });
});

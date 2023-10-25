/* global describe it beforeEach */
import('../../general.js');

import { db } from '../../general.js';
import { message } from '../../general.js';
import alias from '../../../dest/systems/alias.js';
import assert from 'assert';
import { prepare } from '../../../dest/helpers/commons/prepare.js';

// users
const owner = { userName: '__broadcaster__' };

describe('Alias - @func1 - list()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('empty list', async () => {
    const r = await alias.list({ sender: owner, parameters: '' });
    assert.strictEqual(r[0].response, prepare('alias.list-is-empty'));
  });

  it('populated list', async () => {
    const r = await alias.add({ sender: owner, parameters: '-a !a -c !me' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: '!a', command: '!me' }));

    const r2 = await alias.add({ sender: owner, parameters: '-a !b -c !me' });
    assert.strictEqual(r2[0].response, prepare('alias.alias-was-added', { alias: '!b', command: '!me' }));

    const r3 = await alias.list({ sender: owner, parameters: '' });
    assert.strictEqual(r3[0].response, prepare('alias.list-is-not-empty', { list: '!a, !b' }));
  });
});

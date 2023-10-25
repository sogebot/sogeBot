/* global describe it beforeEach */
import('../../general.js');

import { db } from '../../general.js';
import { message } from '../../general.js';
import alias from '../../../dest/systems/alias.js';
import assert from 'assert';
import { prepare } from '../../../dest/helpers/commons/prepare.js';

// users
const owner = { userName: '__broadcaster__' };

describe('Alias - @func1 - toggleVisibility()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('', async () => {
    const r = await alias.toggleVisibility({ sender: owner, parameters: '' });
    assert.strictEqual(r[0].response, prepare('alias.alias-parse-failed'));
  });

  it('!unknown', async () => {
    const r = await alias.toggleVisibility({ sender: owner, parameters: '!unknown' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-not-found', { alias: '!unknown' }));
  });

  it('!a', async () => {
    const r = await alias.add({ sender: owner, parameters: '-a !a -c !uptime' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: '!a', command: '!uptime' }));

    const r2 = await alias.toggleVisibility({ sender: owner, parameters: '!a' });
    assert.strictEqual(r2[0].response, prepare('alias.alias-was-concealed', { alias: '!a' }));

    const r3 = await alias.toggleVisibility({ sender: owner, parameters: '!a' });
    assert.strictEqual(r3[0].response, prepare('alias.alias-was-exposed', { alias: '!a' }));
  });

  it('!a with spaces', async () => {
    const r = await alias.add({ sender: owner, parameters: '-a !a with spaces -c !uptime' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: '!a with spaces', command: '!uptime' }));

    const r2 = await alias.toggleVisibility({ sender: owner, parameters: '!a with spaces' });
    assert.strictEqual(r2[0].response, prepare('alias.alias-was-concealed', { alias: '!a with spaces' }));

    const r3 = await alias.toggleVisibility({ sender: owner, parameters: '!a with spaces' });
    assert.strictEqual(r3[0].response, prepare('alias.alias-was-exposed', { alias: '!a with spaces' }));
  });

  it('!한국어', async () => {
    const r = await alias.add({ sender: owner, parameters: '-a !한국어 -c !uptime' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: '!한국어', command: '!uptime' }));

    const r2 = await alias.toggleVisibility({ sender: owner, parameters: '!한국어' });
    assert.strictEqual(r2[0].response, prepare('alias.alias-was-concealed', { alias: '!한국어' }));

    const r3 = await alias.toggleVisibility({ sender: owner, parameters: '!한국어' });
    assert.strictEqual(r3[0].response, prepare('alias.alias-was-exposed', { alias: '!한국어' }));
  });

  it('!русский', async () => {
    const r = await alias.add({ sender: owner, parameters: '-a !русский -c !uptime' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: '!русский', command: '!uptime' }));

    const r2 = await alias.toggleVisibility({ sender: owner, parameters: '!русский' });
    assert.strictEqual(r2[0].response, prepare('alias.alias-was-concealed', { alias: '!русский' }));

    const r3 = await alias.toggleVisibility({ sender: owner, parameters: '!русский' });
    assert.strictEqual(r3[0].response, prepare('alias.alias-was-exposed', { alias: '!русский' }));
  });
});

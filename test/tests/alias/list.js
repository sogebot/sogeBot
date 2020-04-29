/* global describe it beforeEach */
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const alias = (require('../../../dest/systems/alias')).default;
const assert = require('assert');
const { prepare } = (require('../../../dest/commons'));

// users
const owner = { username: 'soge__' };

describe('Alias - list()', () => {
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

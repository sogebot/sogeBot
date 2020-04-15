/* global describe it beforeEach */
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const alias = (require('../../../dest/systems/alias')).default;
const assert = require('assert');
const { prepare } = (require('../../../dest/commons'));

// users
const owner = { username: 'soge__' };

describe('Alias - remove()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('', async () => {
    const r = await alias.remove({ sender: owner, parameters: '' });
    assert.strictEqual(r[0].response, prepare('alias.alias-parse-failed'));
  });

  it('!alias', async () => {
    const r = await alias.remove({ sender: owner, parameters: '!alias' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-not-found', { alias: '!alias' }));
  });

  it('alias', async () => {
    const r = await alias.remove({ sender: owner, parameters: 'alias' });
    assert.strictEqual(r[0].response, prepare('alias.alias-parse-failed'));
  });

  it('!a', async () => {
    const r = await alias.add({ sender: owner, parameters: '-a !a -c !me' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: '!a', command: '!me' }));

    const r2 = await alias.remove({ sender: owner, parameters: '!a' });
    assert.strictEqual(r2[0].response, prepare('alias.alias-was-removed', { alias: '!a' }));
  });

  it('!a with spaces', async () => {
    const r = await alias.add({ sender: owner, parameters: '-a !a with spaces -c !me' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: '!a with spaces', command: '!me' }));

    const r2 = await alias.remove({ sender: owner, parameters: '!a with spaces' });
    assert.strictEqual(r2[0].response, prepare('alias.alias-was-removed', { alias: '!a with spaces' }));
  });

  it('!한국어', async () => {
    const r = await alias.add({ sender: owner, parameters: '-a !한국어 -c !me' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: '!한국어', command: '!me' }));

    const r2 = await alias.remove({ sender: owner, parameters: '!한국어' });
    assert.strictEqual(r2[0].response, prepare('alias.alias-was-removed', { alias: '!한국어' }));
  });

  it('!русский', async () => {
    const r = await alias.add({ sender: owner, parameters: '-a !русский -c !me' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: '!русский', command: '!me' }));

    const r2 = await alias.remove({ sender: owner, parameters: '!русский' });
    assert.strictEqual(r2[0].response, prepare('alias.alias-was-removed', { alias: '!русский' }));
  });

  it('2x - !a !me', async () => {
    const r = await alias.add({ sender: owner, parameters: '-a !a -c !me' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: '!a', command: '!me' }));

    const r2 = await alias.remove({ sender: owner, parameters: '!a' });
    assert.strictEqual(r2[0].response, prepare('alias.alias-was-removed', { alias: '!a' }));

    const r3 = await alias.remove({ sender: owner, parameters: '!a' });
    assert.strictEqual(r3[0].response, prepare('alias.alias-was-not-found', { alias: '!a' }));
  });
});

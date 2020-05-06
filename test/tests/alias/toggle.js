/* global describe it beforeEach */
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const alias = (require('../../../dest/systems/alias')).default;
const assert = require('assert');
const { prepare } = (require('../../../dest/commons'));

// users
const owner = { username: 'soge__' };

describe('Alias - toggle()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('', async () => {
    const r = await alias.toggle({ sender: owner, parameters: '' });
    assert.strictEqual(r[0].response, prepare('alias.alias-parse-failed'));
  });

  it('!unknown', async () => {
    const r = await alias.toggle({ sender: owner, parameters: '!unknown' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-not-found', { alias: '!unknown' }));
  });

  it('!a', async () => {
    const r = await alias.add({ sender: owner, parameters: '-a !a -c !uptime' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: '!a', command: '!uptime' }));

    const r2 = await alias.toggle({ sender: owner, parameters: '!a' });
    assert.strictEqual(r2[0].response, prepare('alias.alias-was-disabled', { alias: '!a' }));

    const r3 = await alias.toggle({ sender: owner, parameters: '!a' });
    assert.strictEqual(r3[0].response, prepare('alias.alias-was-enabled', { alias: '!a' }));
  });

  it('!a with spaces', async () => {
    const r = await alias.add({ sender: owner, parameters: '-a !a with spaces -c !uptime' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: '!a with spaces', command: '!uptime' }));

    const r2 = await alias.toggle({ sender: owner, parameters: '!a with spaces' });
    assert.strictEqual(r2[0].response, prepare('alias.alias-was-disabled', { alias: '!a with spaces' }));

    const r3 = await alias.toggle({ sender: owner, parameters: '!a with spaces' });
    assert.strictEqual(r3[0].response, prepare('alias.alias-was-enabled', { alias: '!a with spaces' }));
  });

  it('!한국어', async () => {
    const r = await alias.add({ sender: owner, parameters: '-a !한국어 -c !uptime' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: '!한국어', command: '!uptime' }));

    const r2 = await alias.toggle({ sender: owner, parameters: '!한국어' });
    assert.strictEqual(r2[0].response, prepare('alias.alias-was-disabled', { alias: '!한국어' }));

    const r3 = await alias.toggle({ sender: owner, parameters: '!한국어' });
    assert.strictEqual(r3[0].response, prepare('alias.alias-was-enabled', { alias: '!한국어' }));
  });

  it('!русский', async () => {
    const r = await alias.add({ sender: owner, parameters: '-a !русский -c !uptime' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: '!русский', command: '!uptime' }));

    const r2 = await alias.toggle({ sender: owner, parameters: '!русский' });
    assert.strictEqual(r2[0].response, prepare('alias.alias-was-disabled', { alias: '!русский' }));

    const r3 = await alias.toggle({ sender: owner, parameters: '!русский' });
    assert.strictEqual(r3[0].response, prepare('alias.alias-was-enabled', { alias: '!русский' }));
  });
});

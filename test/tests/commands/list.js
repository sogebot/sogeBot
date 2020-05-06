/* global describe it beforeEach */
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const assert = require('assert');

const customcommands = (require('../../../dest/systems/customcommands')).default;

// users
const owner = { username: 'soge__' };

describe('Custom Commands - list()', () => {
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

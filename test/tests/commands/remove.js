/* global describe it beforeEach */
require('../../general.js');
const assert = require('assert');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const customcommands = (require('../../../dest/systems/customcommands')).default;

// users
const owner = { username: 'soge__' };

describe('Custom Commands - remove()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('', async () => {
    const r = await customcommands.remove({ sender: owner, parameters: '' });
    assert.strictEqual(r[0].response, 'Sorry, $sender, but this command is not correct, use !commands');
  });

  it('!alias', async () => {
    const r = await customcommands.remove({ sender: owner, parameters: '!alias' });
    assert.strictEqual(r[0].response, '$sender, command !alias was not found in database');
  });

  it('alias', async () => {
    const r = await customcommands.remove({ sender: owner, parameters: 'alias' });
    assert.strictEqual(r[0].response, 'Sorry, $sender, but this command is not correct, use !commands');
  });

  it('!a', async () => {
    const r = await customcommands.add({ sender: owner, parameters: '-c !a -r !me' });
    assert.strictEqual(r[0].response, '$sender, command !a was added');

    const r2 = await customcommands.remove({ sender: owner, parameters: '!a' });
    assert.strictEqual(r2[0].response, '$sender, command !a was removed');
  });

  it('!한글', async () => {
    const r = await customcommands.add({ sender: owner, parameters: '-c !한글 -r !me' });
    assert.strictEqual(r[0].response, '$sender, command !한글 was added');

    const r2 = await customcommands.remove({ sender: owner, parameters: '!한글' });
    assert.strictEqual(r2[0].response, '$sender, command !한글 was removed');
  });

  it('!русский', async () => {
    const r = await customcommands.add({ sender: owner, parameters: '-c !русский -r !me' });
    assert.strictEqual(r[0].response, '$sender, command !русский was added');

    const r2 = await customcommands.remove({ sender: owner, parameters: '!русский' });
    assert.strictEqual(r2[0].response, '$sender, command !русский was removed');
  });

  it('2x - !a !me', async () => {
    const r = await customcommands.add({ sender: owner, parameters: '-c !a -r !me' });
    assert.strictEqual(r[0].response, '$sender, command !a was added');

    const r2 = await customcommands.remove({ sender: owner, parameters: '!a' });
    assert.strictEqual(r2[0].response, '$sender, command !a was removed');

    const r3 = await customcommands.remove({ sender: owner, parameters: '!a' });
    assert.strictEqual(r3[0].response, '$sender, command !a was not found in database');
  });
});

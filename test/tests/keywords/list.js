/* global describe it */
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const assert = require('assert');

const keywords = (require('../../../dest/systems/keywords')).default;

const { Keyword } = require('../../../dest/database/entity/keyword');
const { User } = require('../../../dest/database/entity/user');

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
    const r = await keywords.add({ sender: owner, parameters: '-p casters -k a -r me' });
    assert.strictEqual(r[0].response, `$sender, keyword a (${r[0].id}) was added`);

    const r2 = await keywords.add({ sender: owner, parameters: '-p moderators -s true -k a -r me2' });
    assert.strictEqual(r2[0].response, `$sender, keyword a (${r2[0].id}) was added`);

    const r3 = await keywords.add({ sender: owner, parameters: '-k b -r me' });
    assert.strictEqual(r3[0].response, `$sender, keyword b (${r3[0].id}) was added`);

    const r4 = await keywords.list({ sender: owner, parameters: '' });
    assert.strictEqual(r4[0].response, '$sender, list of keywords: a, b');

    const r5 = await keywords.list({ sender: owner, parameters: 'a' });
    assert.strictEqual(r5[0].response, 'a#1 (Casters) v| me');
    assert.strictEqual(r5[1].response, 'a#2 (Moderators) _| me2');

    const r6 = await keywords.list({ sender: owner, parameters: 'asdsad' });
    assert.strictEqual(r6[0].response, '$sender, asdsad have no responses or doesn\'t exists');
  });
});

/* global describe it beforeEach */
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const user = require('../../general.js').user;
const alias = (require('../../../dest/systems/alias')).default;
const assert = require('assert');
const { prepare } = (require('../../../dest/commons'));

// users
const owner = { username: 'soge__' };

describe('Alias - #3680 - alias should override command permission', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('create alias !test for command !alert (caster only)', async () => {
    const r = await alias.add({ sender: owner, parameters: '-a !test -c !alert type=video' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: '!test', command: '!alert type=video' }));
  });

  it('call alias with regular viewer', async () => {
    await alias.run({ sender: user.viewer, message: '!test' });
    await message.debug('alias.process', []);
  });
});

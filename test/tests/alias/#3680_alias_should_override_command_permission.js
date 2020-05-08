/* global describe it */
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const user = require('../../general.js').user;
const alias = (require('../../../dest/systems/alias')).default;
const assert = require('assert');
const { prepare } = (require('../../../dest/commons'));
const Parser = require('../../../dest/parser').default;

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

  it('call !alert directly with regular viewer should send permission error', async () => {
    const parse = new Parser({ sender: user.owner, message: '!alert type=video', skip: false, quiet: false });
    const r = await parse.process();
    assert.strictEqual(r[0].response, 'You don\'t have enough permissions for \'!alert type=video\'');
  });

  it('call alias with regular viewer should process it correctly', async () => {
    await alias.run({ sender: user.viewer, message: '!test' });
    await message.debug('alias.process', '!alert type=video');
    await message.debug('alerts.emit', 'type=video');
  });
});

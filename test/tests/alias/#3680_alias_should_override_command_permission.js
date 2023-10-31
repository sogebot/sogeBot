import('../../general.js');

import assert from 'assert';

import { prepare } from '../../../dest/helpers/commons/prepare.js';
import { Parser } from '../../../dest/parser.js';
import alias from '../../../dest/systems/alias.js';
import { db, message, user } from '../../general.js';

// users
const owner = { userName: '__broadcaster__' };

describe('Alias - @func1 - #3680 - alias should override command permission', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('create alias !test for command !queue open (caster only)', async () => {
    const r = await alias.add({ sender: owner, parameters: '-a !test -c !queue open' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: '!test', command: '!queue open' }));
  });

  it('call !queue open directly with regular viewer should send permission error', async () => {
    const parse = new Parser({ sender: user.viewer, message: '!queue open', skip: false, quiet: false });
    const r = await parse.process();
    assert.strictEqual(r[0].response, 'You don\'t have enough permissions for \'!queue open\'');
  });

  it('call alias with regular viewer should process it correctly', async () => {
    await alias.run({ sender: user.viewer, message: '!test' });
    await message.debug('alias.process', '!queue open');
  });
});

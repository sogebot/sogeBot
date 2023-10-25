require('../../general.js');

import assert from 'assert';

const { prepare } = (require('../../../dest/helpers/commons/prepare'));
const Parser = require('../../../dest/parser').default;
const alias = (require('../../../dest/systems/alias')).default;
import { db } from '../../general.js';
import { message } from '../../general.js';
const user = require('../../general.js').user;

// users
const owner = { userName: '__broadcaster__' };

describe('Alias - @func1 - #3680 - alias should override command permission', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('create alias !test for command !media (caster only)', async () => {
    const r = await alias.add({ sender: owner, parameters: '-a !test -c !media type=video' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: '!test', command: '!media type=video' }));
  });

  it('call !media directly with regular viewer should send permission error', async () => {
    const parse = new Parser({ sender: user.viewer, message: '!media type=video', skip: false, quiet: false });
    const r = await parse.process();
    assert.strictEqual(r[0].response, 'You don\'t have enough permissions for \'!media type=video\'');
  });

  it('call alias with regular viewer should process it correctly', async () => {
    await alias.run({ sender: user.viewer, message: '!test' });
    await message.debug('alias.process', '!media type=video');
    await message.debug('alerts.emit', 'type=video');
  });
});

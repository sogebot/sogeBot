import('../../general.js');

import { db, message, user } from '../../general.js';

import assert from 'assert';

import customcommands from '../../../dest/systems/customcommands.js';
import { Parser } from '../../../dest/parser.js';

describe('Message - https://discordapp.com/channels/317348946144002050/619437014001123338/708371785157967873 - permission of command with (!#) should be ignored - @func3', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await customcommands.add({ sender: user.owner, parameters: '-c !test -r (!queue open)' });
  });

  it('call !queue open directly with regular viewer should send permission error', async () => {
    const parse = new Parser({ sender: user.viewer, message: '!queue open', skip: false, quiet: false });
    const r = await parse.process();
    assert.strictEqual(r[0].response, 'You don\'t have enough permissions for \'!queue open\'');
  });

  it('!test should properly trigger !queue open', async () => {
    await customcommands.run({ sender: user.viewer, message: '!test' });
    await message.debug('message.process', '!queue open');
  });
});

describe('Message - https://discordapp.com/channels/317348946144002050/619437014001123338/708371785157967873 - permission of command with (!!#) should be ignored - @func3', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await customcommands.add({ sender: user.owner, parameters: '-c !test -r (!!queue open)' });
  });

  it('call !queue open directly with regular viewer should send permission error', async () => {
    const parse = new Parser({ sender: user.viewer, message: '!queue open', skip: false, quiet: false });
    const r = await parse.process();
    assert.strictEqual(r[0].response, 'You don\'t have enough permissions for \'!queue open\'');
  });

  it('!test should properly trigger !queue open', async () => {
    await customcommands.run({ sender: user.viewer, message: '!test' });
    await message.debug('message.process', '!queue open');
  });
});

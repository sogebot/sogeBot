require('../../general.js');

import { db } from '../../general.js';
import { message } from '../../general.js';
const user = require('../../general.js').user;

import assert from 'assert';

const customcommands = (require('../../../dest/systems/customcommands')).default;
const Parser = require('../../../dest/parser').default;

describe('Message - https://discordapp.com/channels/317348946144002050/619437014001123338/708371785157967873 - permission of command with (!#) should be ignored - @func3', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await customcommands.add({ sender: user.owner, parameters: '-c !test -r (!media type=video)' });
  });

  it('call !media directly with regular viewer should send permission error', async () => {
    const parse = new Parser({ sender: user.viewer, message: '!media type=video', skip: false, quiet: false });
    const r = await parse.process();
    assert.strictEqual(r[0].response, 'You don\'t have enough permissions for \'!media type=video\'');
  });

  it('!test should properly trigger !media', async () => {
    await customcommands.run({ sender: user.viewer, message: '!test' });
    await message.debug('message.process', '!media type=video');
    await message.debug('alerts.emit', 'type=video');
  });
});

describe('Message - https://discordapp.com/channels/317348946144002050/619437014001123338/708371785157967873 - permission of command with (!!#) should be ignored - @func3', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await customcommands.add({ sender: user.owner, parameters: '-c !test -r (!!media type=video2)' });
  });

  it('call !media directly with regular viewer should send permission error', async () => {
    const parse = new Parser({ sender: user.viewer, message: '!media type=video2', skip: false, quiet: false });
    const r = await parse.process();
    assert.strictEqual(r[0].response, 'You don\'t have enough permissions for \'!media type=video2\'');
  });

  it('!test should properly trigger !media', async () => {
    await customcommands.run({ sender: user.viewer, message: '!test' });
    await message.debug('message.process', '!media type=video2');
    await message.debug('alerts.emit', 'type=video2');
  });
});

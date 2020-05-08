require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const user = require('../../general.js').user;

const assert = require('assert');

const customcommands = (require('../../../dest/systems/customcommands')).default;
const Parser = require('../../../dest/parser').default;

describe('Message - https://discordapp.com/channels/317348946144002050/619437014001123338/708371785157967873 - permission of command with (!#) should be ignored', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await customcommands.add({ sender: user.owner, parameters: '-c !test -r (!alert type=video)' });
  });

  it('call !alert directly with regular viewer should send permission error', async () => {
    const parse = new Parser({ sender: user.owner, message: '!alert type=video', skip: false, quiet: false });
    const r = await parse.process();
    assert.strictEqual(r[0].response, 'You don\'t have enough permissions for \'!alert type=video\'');
  });

  it('!test should properly trigger !alert', async () => {
    await customcommands.run({ sender: user.viewer, message: '!test' });
    await message.debug('message.process', '!alert type=video');
    await message.debug('alerts.emit', 'type=video');
  });
});

describe('Message - https://discordapp.com/channels/317348946144002050/619437014001123338/708371785157967873 - permission of command with (!!#) should be ignored', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await customcommands.add({ sender: user.owner, parameters: '-c !test -r (!!alert type=video2)' });
  });

  it('call !alert directly with regular viewer should send permission error', async () => {
    const parse = new Parser({ sender: user.owner, message: '!alert type=video2', skip: false, quiet: false });
    const r = await parse.process();
    assert.strictEqual(r[0].response, 'You don\'t have enough permissions for \'!alert type=video2\'');
  });

  it('!test should properly trigger !alert', async () => {
    await customcommands.run({ sender: user.viewer, message: '!test' });
    await message.debug('message.process', '!alert type=video2');
    await message.debug('alerts.emit', 'type=video2');
  });
});

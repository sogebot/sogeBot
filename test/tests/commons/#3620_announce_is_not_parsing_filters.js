/* eslint-disable @typescript-eslint/no-var-requires */
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const alias = (require('../../../dest/systems/alias')).default;
const customcommands = (require('../../../dest/systems/customcommands')).default;
const { announce } = require('../../../dest/commons');

// users
const owner = { username: 'soge__' };

describe('Commons - #3620 - announce is not parsing message filters', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await alias.add({ sender: owner, parameters: '-a !testAlias -c !me' });
    await customcommands.add({ sender: owner, parameters: '-c !testCmd -r Lorem Ipsum' });
  });

  it('Timer should trigger announce() with proper response with filters', async () => {
    announce('Prikazy bota: !klip, !me, !heist, (list.!command), (list.!alias)');
    await message.isSentRaw('Prikazy bota: !klip, !me, !heist, !testCmd, !testAlias', 'bot', 20000);

  });
});

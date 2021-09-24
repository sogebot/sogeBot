/* eslint-disable @typescript-eslint/no-var-requires */
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const alias = (require('../../../dest/systems/alias')).default;
const customcommands = (require('../../../dest/systems/customcommands')).default;
const { announce } = require('../../../dest/helpers/commons/announce');

// users
const owner = { username: '__broadcaster__' };

describe('Commons - @func2 - #3620 - announce is not parsing message filters', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await alias.add({ sender: owner, parameters: '-a !testAlias -c !me' });
    await customcommands.add({ sender: owner, parameters: '-c !testCmd -r Lorem Ipsum' });
  });

  it('Announce() should have propery parsed filters', async () => {
    announce('Prikazy bota: !klip, !me, !heist, (list.!command), (list.!alias)', 'general');
    await message.isSentRaw('Prikazy bota: !klip, !me, !heist, !testCmd, !testAlias', 'bot', 20000);

  });
});

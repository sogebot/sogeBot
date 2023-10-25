
import('../../general.js');

import { db } from '../../general.js';
import { message } from '../../general.js';

import alias from '../../../dest/systems/alias.js';
import customcommands from '../../../dest/systems/customcommands.js';
import { announce } from '../../../dest/helpers/commons/announce.js';

// users
const owner = { userName: '__broadcaster__' };

describe('Commons - @func2 - #3620 - announce is not parsing message filters', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await alias.add({ sender: owner, parameters: '-a !testAlias -c !me' });
    await customcommands.add({ sender: owner, parameters: '-c !testCmd -r Lorem Ipsum' });
  });

  it('Announce() should have propery parsed filters', async () => {
    announce('Prikazy bota: !klip, !me, !heist, (list.!command), (list.!alias)', 'general');
    await message.isSentRaw('Prikazy bota: !klip, !me, !heist, !testCmd, !testAlias', '__bot__', 20000);

  });
});

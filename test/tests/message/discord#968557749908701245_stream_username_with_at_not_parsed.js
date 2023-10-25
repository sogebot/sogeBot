import assert from 'assert';

import('../../general.js');

import { db, message, user } from '../../general.js';

describe('Message - https://discord.com/channels/317348946144002050/317349069024395264/968557749908701245 - stream response filter should be able to parse user with at - @func3', () => {
  before(async () => {
    const customcommands = (await import('../../../dest/systems/customcommands.js')).default;

    await db.cleanup();
    await message.prepare();
    await customcommands.add({ sender: user.owner, parameters: '-c !test -r (stream|$param|link) (stream|$touser|link)' });
  });

  it('!test should properly parse @user', async () => {
    const customcommands = (await import('../../../dest/systems/customcommands.js')).default;

    await customcommands.run({ sender: user.viewer, message: '!test @user' });
    await message.debug('sendMessage.message', 'twitch.tv/user twitch.tv/user');
  });
});
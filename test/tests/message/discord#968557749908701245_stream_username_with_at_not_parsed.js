const assert = require('assert');

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const user = require('../../general.js').user;

describe('Message - https://discord.com/channels/317348946144002050/317349069024395264/968557749908701245 - stream response filter should be able to parse user with at - @func3', () => {
  before(async () => {
    const customcommands = (require('../../../dest/systems/customcommands')).default;

    await db.cleanup();
    await message.prepare();
    await customcommands.add({ sender: user.owner, parameters: '-c !test -r (stream|$param|link) (stream|$touser|link)' });
  });

  it('!test should properly parse @user', async () => {
    const customcommands = (require('../../../dest/systems/customcommands')).default;

    await customcommands.run({ sender: user.viewer, message: '!test @user' });
    await message.debug('sendMessage.message', 'twitch.tv/user twitch.tv/user');
  });
});
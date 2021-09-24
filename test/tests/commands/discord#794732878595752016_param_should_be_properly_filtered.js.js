/* global describe it beforeEach */
require('../../general.js');

const db = require('../../general.js').db;
const time = require('../../general.js').time;
const assert = require('assert');
const message = require('../../general.js').message;
const user = require('../../general.js').user;

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');
const { Commands } = require('../../../dest/database/entity/commands');

const customcommands = (require('../../../dest/systems/customcommands')).default;
const { defaultPermissions } = (require('../../../dest/helpers/permissions/'));

describe('Custom Commands - @func1 - https://discord.com/channels/317348946144002050/317349069024395264/794732878595752016 - Custom command $param filter should be properly evaluated', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();

    const command = await getRepository(Commands).save({
      command: '!test',
      enabled: true,
      visible: true,
      responses: [
        {
          order: 0,
          response: '1',
          permission: defaultPermissions.VIEWERS,
          stopIfExecuted: true,
          filter: '$param === "1"'
        },
        {
          order: 1,
          response: '2',
          permission: defaultPermissions.VIEWERS,
          stopIfExecuted: true,
          filter: '$param === "2"'
        }
      ]
    })
  });

  it('Run custom command !test 1', async () => {
    await message.prepare();
    await customcommands.run({ sender: user.owner, message: '!test 1', parameters: '1' });
  });

  it('Expect response 1', async() => {
    await message.isSentRaw('1', user.owner);
    await message.isNotSentRaw('2', user.owner);
  });

  it('Run custom command !test 2', async () => {
    await message.prepare();
    await customcommands.run({ sender: user.owner, message: '!test 2', parameters: '2' });
  });

  it('Expect response 2', async() => {
    await message.isSentRaw('2', user.owner);
    await message.isNotSentRaw('1', user.owner);
  });
});

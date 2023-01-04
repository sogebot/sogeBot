require('../../general.js');

const assert = require('assert');

const { User } = require('../../../dest/database/entity/user');
const { Commands } = require('../../../dest/database/entity/commands');

const db = require('../../general.js').db;
const time = require('../../general.js').time;
const message = require('../../general.js').message;
const user = require('../../general.js').user;

const customcommands = (require('../../../dest/systems/customcommands')).default;
const { defaultPermissions } = (require('../../../dest/helpers/permissions/defaultPermissions'));

describe('Custom Commands - @func1 - https://discord.com/channels/317348946144002050/317349069024395264/794732878595752016 - Custom command $param filter should be properly evaluated', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();

    const command = new Commands();
    command.id =        '2584b3c1-d2da-4fae-bf9a-95048724acdc';
    command.command =   '!test';
    command.enabled =   true;
    command.visible =   true;
    command.group =     'permGroup2';
    command.responses = [{
      stopIfExecuted: false,
      response:       '1',
      filter:         '$param === "1"',
      order:          1,
      permission:     defaultPermissions.MODERATORS,
    }, {
      stopIfExecuted: false,
      response:       '2',
      filter:         '$param === "2"',
      order:          1,
      permission:     defaultPermissions.VIEWERS,
    }];
    await command.save();
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

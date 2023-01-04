const _ = require('lodash');
const { v4: uuidv4 } = require('uuid');
const { AppDataSource } = require('../../../dest/database.js');

require('../../general.js');

const { Commands, CommandsResponses } = require('../../../dest/database/entity/commands');
const { Event } = require('../../../dest/database/entity/event');
const { User } = require('../../../dest/database/entity/user');
const events = (require('../../../dest/events')).default;
const { defaultPermissions } = (require('../../../dest/helpers/permissions/defaultPermissions'));
const { isBotSubscriber } = require('../../../dest/helpers/user/isBot');
const alias = (require('../../../dest/systems/alias')).default;
const commercial = (require('../../../dest/systems/commercial')).default;
const customcommands = (require('../../../dest/systems/customcommands')).default;
const db = require('../../general.js').db;
const message = require('../../general.js').message;
const time = require('../../general.js').time;
const user = require('../../general.js').user;

let event;
describe('Events - event run command should correctly parse filters and be able to use CASTERS permissions - https://discord.com/channels/317348946144002050/619437014001123338/8157333500391587958 - @func3', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();

    event = {};
    event.id = uuidv4();
    event.name = 'follow';
    event.givenName = 'Follow alert';
    event.triggered = {};
    event.definitions = {};
    event.filter = '';
    event.isEnabled = true;
    event.operations = [{
      name:        'run-command',
      definitions: {
        commandToRun:   '!test33',
        isCommandQuiet: false,
      },
    }];
    await AppDataSource.getRepository(Event).save(event);

    const command = new Commands();
    command.id =        '1a945d76-2d3c-4c7a-ae03-e0daf17142c5';
    command.command =   '!test33';
    command.enabled =   true;
    command.visible =   true;
    command.group =     null;
    command.responses = [{
      stopIfExecuted: false,
      response:       '1',
      filter:         '$isBotSubscriber',
      order:          0,
      permission:     defaultPermissions.CASTERS,
    }, {
      stopIfExecuted: false,
      response:       '2',
      filter:         `$sender === '${user.viewer2.userName}'`,
      order:          1,
      permission:     defaultPermissions.MODERATORS,
    }, {
      stopIfExecuted: false,
      response:       '3',
      filter:         '',
      order:          2,
      permission:     defaultPermissions.VIEWERS,
    }];
    await command.save();
  });

  it('set bot as subscriber', async () => {
    await message.prepare();
    isBotSubscriber(true);
  });

  it('trigger follow event', async () => {
    await events.fire('follow', { userName: user.viewer.userName, userId: user.viewer.userId });
  });

  it('commands should be triggered', async () => {
    await message.isSentRaw(`1`, user.viewer);
  });

  it('unset bot as subscriber', async () => {
    await message.prepare();
    isBotSubscriber(false);
  });

  it('trigger follow event', async () => {
    await events.fire('follow', { userName: user.viewer2.userName, userId: user.viewer2.userId });
  });

  it('commands should be triggered', async () => {
    await message.isSentRaw(`2`, user.viewer2);
  });

  it('trigger follow event', async () => {
    await events.fire('follow', { userName: user.viewer3.userName, userId: user.viewer3.userId });
  });

  it('commands should be triggered', async () => {
    await message.isSentRaw(`3`, user.viewer3);
  });

  it('set bot as subscriber', async () => {
    await message.prepare();
    isBotSubscriber(true);
  });
});

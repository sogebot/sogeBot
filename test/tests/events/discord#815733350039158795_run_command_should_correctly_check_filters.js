import _ from 'lodash-es';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../../../dest/database.js';

import('../../general.js');

import { Commands } from '../../../dest/database/entity/commands.js';
import { Event } from '../../../dest/database/entity/event.js';
import { User } from '../../../dest/database/entity/user.js';
import events from '../../../dest/events.js';
import { defaultPermissions } from '../../../dest/helpers/permissions/defaultPermissions.js';
import { isBotSubscriber } from '../../../dest/helpers/user/isBot.js';
import alias from '../../../dest/systems/alias.js';
import commercial from '../../../dest/systems/commercial.js';
import customcommands from '../../../dest/systems/customcommands.js';
import { db } from '../../general.js';
import { message } from '../../general.js';
import { time } from '../../general.js';
import { user } from '../../general.js';

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

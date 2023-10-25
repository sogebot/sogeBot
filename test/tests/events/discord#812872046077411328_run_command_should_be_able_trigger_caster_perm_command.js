/* global describe it before */

import _ from 'lodash-es';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../../../dest/database.js';

import('../../general.js');

import { Event } from '../../../dest/database/entity/event.js';
import { User } from '../../../dest/database/entity/user.js';
import events from '../../../dest/events.js';
import { defaultPermissions } from '../../../dest/helpers/permissions/defaultPermissions.js';
import alias from '../../../dest/systems/alias.js';
import commercial from '../../../dest/systems/commercial.js';
import { db } from '../../general.js';
import { message } from '../../general.js';
import { url } from '../../general.js';
import { time } from '../../general.js';
import { user } from '../../general.js';

describe('Events - event run command should be able to run caster command and alias - https://discord.com/channels/317348946144002050/317349069024395264/812872046077411328 - @func3', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();

    commercial.setCommand('!commercial', '!test');

    const event = {};
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
        commandToRun:   '!test',
        isCommandQuiet: false,
      },
    }, {
      name:        'run-command',
      definitions: {
        commandToRun:   '!test2',
        isCommandQuiet: false,
      },
    }];
    const a = await alias.add({ sender: user.owner, parameters: '-a !test2 -c !command -p ' + defaultPermissions.CASTERS });
    await AppDataSource.getRepository(Event).save(event);
  });

  after(() => {
    commercial.setCommand('!commercial', '!commercial');
  });

  for (const follower of [user.viewer, user.viewer2, user.viewer3]) {
    it ('reset message', async () => {
      await message.prepare();
    });
    it('trigger follow event', async () => {
      await events.fire('follow', { userName: follower.userName, userId: follower.userId });
    });

    it('command should be triggered', async () => {
      await message.isSentRaw(`Usage: !test [duration] [optional-message]`, follower);
    });

    it('alias should be triggered', async () => {
      await message.isSentRaw(`Usage => ${url}/systems/custom-commands`, follower);
    });

    it('wait 5s', async () => {
      await time.waitMs(5000);
    });
  }
});

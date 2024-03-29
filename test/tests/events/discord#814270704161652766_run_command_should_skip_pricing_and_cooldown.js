/* global */

import assert from 'assert';

import _ from 'lodash-es';
import { AppDataSource } from '../../../dest/database.js';

import('../../general.js');

import { Event } from '../../../dest/database/entity/event.js';
import { User } from '../../../dest/database/entity/user.js';
import events from '../../../dest/events.js';
import { defaultPermissions } from '../../../dest/helpers/permissions/defaultPermissions.js';
import alias from '../../../dest/systems/alias.js';
import commercial from '../../../dest/systems/commercial.js';
import cooldown from '../../../dest/systems/cooldown.js'
import { db } from '../../general.js';
import { message } from '../../general.js';
import { time } from '../../general.js';
import { user } from '../../general.js';

describe('Events - event run command should be able to skip pricing and cooldown - https://discord.com/channels/317348946144002050/619437014001123338/814270704161652766 - @func3', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();

    const ev = new Event();
    ev.event = {
      definitions: {},
      triggered:{},
      name: 'follow',
    };
    ev.givenName = 'Follow alert';
    ev.filter = '';
    ev.isEnabled = true;
    ev.operations = [{
      name:        'run-command',
      definitions: {
        commandToRun:   '!test',
        isCommandQuiet: false,
      },
    }];
    await ev.save();
    await alias.add({ sender: user.owner, parameters: '-a !test -c !commercial -p ' + defaultPermissions.CASTERS });

    const r = await cooldown.main({ sender: user.owner, parameters: '!test global 20 true' });
    assert.strictEqual(r[0].response, '$sender, global cooldown for !test was set to 20s');
  });

  for (const follower of [user.viewer, user.viewer2, user.viewer3]) {
    it ('reset message', async () => {
      await message.prepare();
    });
    it('trigger follow event', async () => {
      await events.fire('follow', { userName: follower.userName, userId: follower.userId });
    });

    it('parsers should be skipped', async () => {
      await message.debug('parser.process', 'Skipped Cooldown.check');
      await message.debug('parser.process', 'Skipped Price.check');
      await message.debug('parser.process', 'Skipped Points.messagePoints');
    });

    it('command should be triggered', async () => {
      await message.isSentRaw(`Usage: !commercial [duration] [optional-message]`, follower);
    });
  }
});

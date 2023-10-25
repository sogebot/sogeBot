import assert from 'assert';

import('../../general.js');

import { v4 as uuidv4 } from 'uuid';

import events from '../../../dest/events.js';
import { Event } from '../../../dest/database/entity/event.js';
import { User } from '../../../dest/database/entity/user.js';
import { AppDataSource } from '../../../dest/database.js';
import * as changelog from '../../../dest/helpers/user/changelog.js';
import { time } from '../../general.js';
import { db } from '../../general.js';
import { message } from '../../general.js';

describe('Events - cheer event - @func3', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  describe('#1699 - Cheer event is not waiting for user to save id', function () {
    before(async function () {
      await AppDataSource.getRepository(Event).save({
        id:          uuidv4(),
        name:        'cheer',
        givenName:   'Cheer alert',
        triggered:   {},
        definitions: {},
        filter:      '',
        isEnabled:   true,
        operations:  [{
          name:        'run-command',
          definitions: {
            isCommandQuiet: false,
            commandToRun:   '!points add $username (math.$bits*10)',
          },
        }],
      });
    });

    for (const username of ['losslezos', 'rigneir', 'mikasa_hraje', 'foufhs']) {
      const userId = String(Math.floor(Math.random() * 10000));
      describe(username + ' cheer event', () => {
        it('trigger cheer event for 1 bit - ' + username, async () => {
          await events.fire('cheer', { userName: username, userId, bits: 1, message: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5) });
        });

        it('we are expecting message to be sent', async () => {
          await message.isSentRaw(`@${username} just received 10 points!`, username);
        });

        it('user should have 10 points', async () => {
          const points = (await import('../../../dest/systems/points.js')).default;
          assert.strict.equal(await points.getPointsOf(userId), 10);
        });
      });
    }
  });
});

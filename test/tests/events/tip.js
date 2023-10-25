
/* global  */

import assert from 'assert';

import('../../general.js');

import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../../../dest/database.js';

import { Event } from '../../../dest/database/entity/event.js';
import { User } from '../../../dest/database/entity/user.js';
import events from '../../../dest/events.js';
import * as log from '../../../dest/helpers/log.js';
import * as changelog from '../../../dest/helpers/user/changelog.js';
import { time } from '../../general.js';
import { db } from '../../general.js';
import { message } from '../../general.js';

describe('Events - tip event - @func3', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  describe('#2219 - Give points on tip not working', function () {
    before(async function () {
      await AppDataSource.getRepository(Event).save({
        id:          uuidv4(),
        name:        'tip',
        givenName:   'Tip alert',
        triggered:   {},
        definitions: {},
        filter:      '',
        isEnabled:   true,
        operations:  [{
          name:        'run-command',
          definitions: {
            isCommandQuiet: true,
            commandToRun:   '!points add $username (math.$amount*10)',
          },
        }],
      });

      for (const [idx, user] of ['losslezos', 'rigneir', 'mikasa_hraje', 'foufhs'].entries()) {
        await AppDataSource.getRepository(User).save({ userName: user, userId: String(idx * 100000) });
      }
    });

    for (const [idx, username] of ['losslezos', 'rigneir', 'mikasa_hraje', 'foufhs'].entries()) {
      describe(username + ' tip event', () => {
        it('trigger tip event for 10 EUR - ' + username, async () => {
          log.tip(`${username}, amount: 10.00EUR, message: Ahoj jak je`);
          events.fire('tip', {
            userId: String(idx * 100000), userName: username, amount: 10.00, message: 'Ahoj jak je', currency: 'EUR',
          });
        });

        it('wait 1s', async () => {
          await time.waitMs(5000);
        });

        it('we are not expecting any messages to be sent - quiet mode', async () => {
          assert.strict.equal(log.chatOut.callCount, 0);
        });

        it('user should have 100 points', async () => {
          await changelog.flush();
          const user = await AppDataSource.getRepository(User).findOneBy({ userName: username });
          assert.strict.equal(user.points, 100);
        });
      });
    }
  });
});

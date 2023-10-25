/* global describe it before */

import _ from 'lodash-es';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../../../dest/database.js';

import('../../general.js');

import { Event } from '../../../dest/database/entity/event.js';
import { User } from '../../../dest/database/entity/user.js';
import events from '../../../dest/events.js';
import { db } from '../../general.js';
import { message } from '../../general.js';
import { time } from '../../general.js';
import { user } from '../../general.js';

describe('Events - follow event - @func3', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
  });

  describe('#1370 - Second follow event didn\'t trigger event ', function () {
    before(async function () {
      const event = {};
      event.id = uuidv4();
      event.name = 'follow';
      event.givenName = 'Follow alert';
      event.triggered = {};
      event.definitions = {};
      event.filter = '';
      event.isEnabled = true;
      event.operations = [{
        name:        'emote-explosion',
        definitions: { emotesToExplode: 'purpleHeart <3' },
      }, {
        name:        'run-command',
        definitions: {
          commandToRun:   '!duel',
          isCommandQuiet: true,
        },
      }, {
        name:        'send-chat-message',
        definitions: { messageToSend: 'Diky za follow, $username!' },
      }];
      await AppDataSource.getRepository(Event).save(event);
    });

    for (const follower of [user.viewer, user.viewer2, user.viewer3]) {
      it('trigger follow event', async () => {
        await events.fire('follow', { userName: follower.userName, userId: follower.userId });
      });

      it('message should be send', async () => {
        await message.isSentRaw(`Diky za follow, @${follower.userName}!`, { userName: follower.userName });
      });

      it('wait 5s', async () => {
        await time.waitMs(5000);
      });
    }
  });
});

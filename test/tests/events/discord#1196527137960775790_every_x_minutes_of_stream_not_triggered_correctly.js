import _ from 'lodash-es';
import { AppDataSource } from '../../../dest/database.js';

import('../../general.js');

import { Event } from '../../../dest/database/entity/event.js';
import { eventEmitter } from '../../../dest/helpers/events/index.js';
import { db } from '../../general.js';
import { message } from '../../general.js';
import { time } from '../../general.js';
import { user } from '../../general.js';

describe('Events - event every-x-minutes-of-stream is not triggered correctly - https://discord.com/channels/317348946144002050/1196527137960775790 - @func3', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();

    const ev = new Event();
    ev.event = {
      definitions: {
        runEveryXMinutes: 1, // every 60 seconds
      },
      triggered:{},
      name: 'every-x-minutes-of-stream',
    };
    ev.givenName = 'Log';
    ev.filter = '';
    ev.isEnabled = true;
    ev.operations = [{
      name:        'send-chat-message',
      definitions: {
        messageToSend:   'It works!',
      },
    }];
    await ev.save();

    // reset emitter
    eventEmitter.emit('every-x-minutes-of-stream', { reset: true } );
    eventEmitter.emit('every-x-minutes-of-stream', { reset: false } );
  });

  for (let i = 0; i < 3; i++) {
    it('wait 30 seconds', async () => {
      // wait 30 seconds to ensure event is not yet triggered
      await time.waitMs(31 * 1000);
    })

    it('trigger event', () => {
      eventEmitter.emit('every-x-minutes-of-stream', { reset: false } );
    })

    it('commands should not be triggered, yet', async () => {
      await message.isNotSentRaw(`It works!`, user.owner);
      await message.prepare(); // reset
    });

    it('wait 30 + 1 seconds', async () => {
      // wait 30 + 1 seconds to ensure event is triggered
      await time.waitMs(31 * 1000);
    })

    it('trigger event', () => {
      eventEmitter.emit('every-x-minutes-of-stream', { reset: false } );
    })

    it('commands should be triggered', async () => {
      await message.isSentRaw(`It works!`, user.owner);
      await message.prepare(); // reset
    });
  }
});

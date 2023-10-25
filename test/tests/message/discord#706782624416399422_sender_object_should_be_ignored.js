import('../../general.js');

import { db } from '../../general.js';
import { message } from '../../general.js';
import { time } from '../../general.js';

import { isStreamOnline } from '../../../dest/helpers/api/isStreamOnline.js'
import alias from '../../../dest/systems/alias.js';
import customcommands from '../../../dest/systems/customcommands.js';
import timers from '../../../dest/systems/timers.js';
import {check} from '../../../dest/watchers.js'

import { AppDataSource } from '../../../dest/database.js';
import { Timer, TimerResponse } from '../../../dest/database/entity/timer.js';

import { linesParsed } from '../../../dest/helpers/parser.js';

// users
const owner = { userName: '__broadcaster__' };

describe('Message - https://discordapp.com/channels/317348946144002050/619437014001123338/706782624416399422 - sender object should be owner on timers with (!#) - @func3', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await alias.add({ sender: owner, parameters: '-a !testAlias -c !me' });
    await customcommands.add({ sender: owner, parameters: '-c !testCmd -r Lorem Ipsum' });
    const timer = await AppDataSource.getRepository(Timer).save({
      name: 'test',
      triggerEveryMessage: 0,
      triggerEverySecond: 1,
      isEnabled: true,
      triggeredAtTimestamp: Date.now(),
      triggeredAtMessage: linesParsed,
    });
    await AppDataSource.getRepository(TimerResponse).save({
      response: '(!top time)',
      timestamp: Date.now(),
      isEnabled: true,
      timer,
    });
    for (let i = 0; i < 5; i++) {
      await time.waitMs(1000);
      isStreamOnline.value = true;
      await check();
      await timers.check();
    }
  });

  it('!top time should be properly triggered', async () => {
    await message.isSentRaw('Top 10 (watch time): no data available', '__bot__', 20000);
  });
});

/* global describe it beforeEach */

import assert from 'assert';

import('../../general.js');

import { db } from '../../general.js';
import { message } from '../../general.js';

import timers from '../../../dest/systems/timers.js';
import { isStreamOnline } from '../../../dest/helpers/api/isStreamOnline.js'

import { Timer, TimerResponse } from '../../../dest/database/entity/timer.js';

import { linesParsed } from '../../../dest/helpers/parser.js';

describe('Timers - tickOffline should send response into chat when stream is off - https://community.sogebot.xyz/t/timers-offline-mode/254 - @func2', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();

    const timer = new Timer();
    timer.name = 'test';
    timer.triggerEveryMessage = 0;
    timer.triggerEverySecond = 1;
    timer.tickOffline = true;
    timer.isEnabled = true;
    timer.triggeredAtTimestamp = Date.now();
    timer.triggeredAtMessage = linesParsed;
    await timer.save();

    const timer2 = new Timer();
    timer2.name = 'test';
    timer2.triggerEveryMessage = 0;
    timer2.triggerEverySecond = 1;
    timer2.tickOffline = false;
    timer2.isEnabled = true;
    timer2.triggeredAtTimestamp = Date.now();
    timer2.triggeredAtMessage = linesParsed;
    await timer2.save();

    const response1 = new TimerResponse()
    response1.isEnabled = true;
    response1.response = '1';
    response1.timer = timer;
    await response1.save();

    const response2 = new TimerResponse()
    response2.isEnabled = false;
    response2.response = '2';
    response2.timer = timer;
    await response2.save();

    const response3 = new TimerResponse()
    response3.isEnabled = true;
    response3.response = '3';
    response3.timer = timer;
    await response3.save();

    const response4 = new TimerResponse()
    response4.isEnabled = true;
    response4.response = '4';
    response4.timer = timer2;
    await response4.save();

    const response5 = new TimerResponse()
    response5.isEnabled = true;
    response5.response = '5';
    response5.timer = timer2;
    await response5.save();

    const response6 = new TimerResponse()
    response6.isEnabled = true;
    response6.response = '6';
    response6.timer = timer2;
    await response6.save();

    isStreamOnline.value = false;
  });

  it('We should have response 1 in chat in a while', async () => {
    await message.isSentRaw('1', '__bot__', 45000);
    // we need to wait little more as interval when offline is 30s
  }).timeout(60000);

  it('We should NOT have response 2 in chat in a while', async () => {
    await message.isNotSentRaw('2', '__bot__', 5000);
  })

  it('We should have response 3 in chat in a while', async () => {
    await message.isSentRaw('3', '__bot__', 5000);
  })

  it('We should NOT have response 4 in chat in a while', async () => {
    await message.isNotSentRaw('4', '__bot__', 5000);
  })

  it('We should NOT have response 5 in chat in a while', async () => {
    await message.isNotSentRaw('5', '__bot__', 5000);
  })

  it('We should NOT have response 5 in chat in a while', async () => {
    await message.isNotSentRaw('5', '__bot__', 5000);
  })
});

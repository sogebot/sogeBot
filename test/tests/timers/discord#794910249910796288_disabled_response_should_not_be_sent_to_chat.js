/* global describe it beforeEach */


const assert = require('assert');
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const timers = (require('../../../dest/systems/timers')).default;
const isStreamOnline = (require('../../../dest/helpers/api/isStreamOnline')).isStreamOnline;

const { getRepository } = require('typeorm');
const { Timer, TimerResponse } = require('../../../dest/database/entity/timer');

const { linesParsed } = require('../../../dest/helpers/parser');

describe('Timers - disabled response should not be sent to chat - https://discord.com/channels/317348946144002050/619437014001123338/794910249910796288 - @func2', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();

    const timer = new Timer();
    timer.name = 'test';
    timer.triggerEveryMessage = 0;
    timer.triggerEverySecond = 1;
    timer.isEnabled = true;
    timer.triggeredAtTimestamp = Date.now();
    timer.triggeredAtMessage = linesParsed;
    await timer.save();

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

    isStreamOnline.value = true;
  });
  after(async () => {
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
});

describe('Timers - disabled responses should not be sent to chat - https://discord.com/channels/317348946144002050/619437014001123338/794910249910796288', () => {
  let timer;
  before(async () => {
    await db.cleanup();
    await message.prepare();

    const timer = new Timer();
    timer.name = 'test';
    timer.triggerEveryMessage = 0;
    timer.triggerEverySecond = 1;
    timer.isEnabled = true;
    timer.triggeredAtTimestamp = Date.now();
    timer.triggeredAtMessage = linesParsed;
    await timer.save();

    const response1 = new TimerResponse()
    response1.isEnabled = false;
    response1.response = '1';
    response1.timer = timer;
    await response1.save();

    const response2 = new TimerResponse()
    response2.isEnabled = false;
    response2.response = '2';
    response2.timer = timer;
    await response2.save();

    const response3 = new TimerResponse()
    response3.isEnabled = false;
    response3.response = '3';
    response3.timer = timer;
    await response3.save();

    isStreamOnline.value = true;
  });
  after(async () => {
    isStreamOnline.value = false;
  });

  it('Timer should be updated in DB => checked', async () => {
    const time = Date.now();
    const checkTimer = new Promise((resolve) => {
      const check = async () => {
        const updatedTimer = await getRepository(Timer).findOne(timer.id);
        if (timer.triggeredAtTimestamp < updatedTimer.triggeredAtTimestamp) {
          resolve(true);
        } else {
          if (Date.now() - time > 60000) {
            resolve(false);
          } else {
            setTimeout(() => check(), 500)
          }
        }
      }
    });

    assert(checkTimer, 'Timer was not updated in 60s');
  }).timeout(65000)

  it('We should NOT have response 1 in chat in a while', async () => {
    await message.isNotSentRaw('1', '__bot__', 2000);
    // we need to wait little more as interval when offline is 45s (15s should be OK in general)
  })

  it('We should NOT have response 2 in chat in a while', async () => {
    await message.isNotSentRaw('2', '__bot__', 2000);
  })

  it('We should NOT have response 3 in chat in a while', async () => {
    await message.isNotSentRaw('3', '__bot__', 2000);
  })
});

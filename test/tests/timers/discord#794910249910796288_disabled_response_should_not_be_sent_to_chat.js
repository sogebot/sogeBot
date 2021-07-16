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

describe('Timers - disabled response should not be sent to chat - https://discord.com/channels/317348946144002050/619437014001123338/794910249910796288', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();

    await getRepository(Timer).save({
      name: 'test',
      triggerEveryMessage: 0,
      triggerEverySecond: 1,
      isEnabled: true,
      triggeredAtTimestamp: Date.now(),
      triggeredAtMessage: linesParsed,
      messages: [
        { isEnabled: true, response: '1' },
        { isEnabled: false, response: '2' },
        { isEnabled: true, response: '3' }
      ]
    });

    isStreamOnline.value = true;
  });
  after(async () => {
    isStreamOnline.value = false;
  });

  it('We should have response 1 in chat in a while', async () => {
    await message.isSentRaw('1', 'bot', 45000);
    // we need to wait little more as interval when offline is 30s
  }).timeout(60000);

  it('We should NOT have response 2 in chat in a while', async () => {
    await message.isNotSentRaw('2', 'bot', 5000);
  })

  it('We should have response 3 in chat in a while', async () => {
    await message.isSentRaw('3', 'bot', 5000);
  })
});

describe('Timers - disabled responses should not be sent to chat - https://discord.com/channels/317348946144002050/619437014001123338/794910249910796288', () => {
  let timer;
  before(async () => {
    await db.cleanup();
    await message.prepare();

    timer = await getRepository(Timer).save({
      name: 'test',
      triggerEveryMessage: 0,
      triggerEverySecond: 1,
      isEnabled: true,
      triggeredAtTimestamp: Date.now(),
      triggeredAtMessage: linesParsed,
      messages: [
        { isEnabled: false, response: '1' },
        { isEnabled: false, response: '2' },
        { isEnabled: false, response: '3' }
      ]
    });

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
    await message.isNotSentRaw('1', 'bot', 2000);
    // we need to wait little more as interval when offline is 45s (15s should be OK in general)
  })

  it('We should NOT have response 2 in chat in a while', async () => {
    await message.isNotSentRaw('2', 'bot', 2000);
  })

  it('We should NOT have response 3 in chat in a while', async () => {
    await message.isNotSentRaw('3', 'bot', 2000);
  })
});

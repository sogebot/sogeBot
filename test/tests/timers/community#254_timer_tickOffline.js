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

describe('Timers - tickOffline should send response into chat when stream is off - https://community.sogebot.xyz/t/timers-offline-mode/254', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();

    await getRepository(Timer).save({
      name: 'test',
      triggerEveryMessage: 0,
      triggerEverySecond: 1,
      tickOffline: true,
      isEnabled: true,
      triggeredAtTimestamp: Date.now(),
      triggeredAtMessage: linesParsed,
      messages: [
        { isEnabled: true, response: '1' },
        { isEnabled: false, response: '2' },
        { isEnabled: true, response: '3' }
      ]
    });

    await getRepository(Timer).save({
      name: 'test2',
      triggerEveryMessage: 0,
      triggerEverySecond: 1,
      tickOffline: false,
      isEnabled: true,
      triggeredAtTimestamp: Date.now(),
      triggeredAtMessage: linesParsed,
      messages: [
        { isEnabled: true, response: '4' },
        { isEnabled: true, response: '5' },
        { isEnabled: true, response: '6' }
      ]
    });

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

  it('We should NOT have response 4 in chat in a while', async () => {
    await message.isNotSentRaw('4', 'bot', 5000);
  })

  it('We should NOT have response 5 in chat in a while', async () => {
    await message.isNotSentRaw('5', 'bot', 5000);
  })

  it('We should NOT have response 5 in chat in a while', async () => {
    await message.isNotSentRaw('5', 'bot', 5000);
  })
});

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const time = require('../../general.js').time;

const isStreamOnline = (require('../../../dest/helpers/api/isStreamOnline')).isStreamOnline;
const alias = (require('../../../dest/systems/alias')).default;
const customcommands = (require('../../../dest/systems/customcommands')).default;
const timers = (require('../../../dest/systems/timers')).default;
const check = (require('../../../dest/watchers')).check;

const { AppDataSource } = require('../../../dest/database.js');
const { Timer, TimerResponse } = require('../../../dest/database/entity/timer');

const { linesParsed } = require('../../../dest/helpers/parser');

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

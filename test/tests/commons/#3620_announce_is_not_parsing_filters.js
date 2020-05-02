require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const api = (require('../../../dest/api')).default;
const alias = (require('../../../dest/systems/alias')).default;
const customcommands = (require('../../../dest/systems/customcommands')).default;

const { getRepository } = require('typeorm');
const { Timer, TimerResponse } = require('../../../dest/database/entity/timer');

const { linesParsed } = require('../../../dest/helpers/parser');

// users
const owner = { username: 'soge__' };

describe('Commons - #3620 - announce is not parsing message filters', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await alias.add({ sender: owner, parameters: '-a !testAlias -c !me' });
    await customcommands.add({ sender: owner, parameters: '-c !testCmd -r Lorem Ipsum' });
    const timer = await getRepository(Timer).save({
      name: 'test',
      triggerEveryMessage: 0,
      triggerEverySecond: 1,
      isEnabled: true,
      triggeredAtTimestamp: Date.now(),
      triggeredAtMessage: linesParsed,
    });
    await getRepository(TimerResponse).save({
      response: 'Prikazy bota: !klip, !me, !heist, (list.!command), (list.!alias)',
      timestamp: Date.now(),
      isEnabled: true,
      timer,
    });
    api.isStreamOnline = true;
  });

  it('Timer should trigger announce() with proper response with filters', async () => {
    await message.isSentRaw('Prikazy bota: !klip, !me, !heist, !testCmd, !testAlias', 'bot', 20000);
  });
});

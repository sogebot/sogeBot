/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it before */


require('../../general.js');

const { getRepository } = require('typeorm');
const { Cooldown } = require('../../../dest/database/entity/cooldown');
const Parser = require('../../../dest/parser').default;
const { Price } = require('../../../dest/database/entity/price');

const assert = require('assert');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const user = require('../../general.js').user;
const time = require('../../general.js').time;

const cooldown = (require('../../../dest/systems/cooldown')).default;

describe('Cooldowns - #3720 - global cooldown should be properly reverted', () => {
  let timestamp = 0;
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
  });

  it('create cooldown on !me [global 60]', async () => {
    const [command, type, seconds, quiet] = ['!me', 'global', '5', true];
    const r = await cooldown.main({ sender: user.owner, parameters: `${command} ${type} ${seconds} ${quiet}` });
    assert.strictEqual(r[0].response, '$sender, global cooldown for !me was set to 5s');
  });

  it('check if cooldown is created', async () => {
    const item = await getRepository(Cooldown).findOne({ where: { name: '!me' } });
    assert(item);
    timestamp = item.timestamp;
  });

  it('testuser should be able to use !me', async () => {
    const parse = new Parser({ sender: user.viewer, message: '!me', skip: false, quiet: false });
    await parse.process();
  });

  it('save timestamp', async () => {
    const item = await getRepository(Cooldown).findOne({ where: { name: '!me' } });
    assert(item);
    timestamp = item.timestamp;
  });

  it('add price for !me', async () => {
    await getRepository(Price).save({ command: '!me', price: '100' });
  });

  it('wait 6s to cool off cooldown', async() => {
    await time.waitMs(6000);
  })

  it('testuser should not have enough points', async () => {
    const parse = new Parser({ sender: user.viewer, message: '!me', skip: false, quiet: false });
    await parse.process();
  });

  it('cooldown should be unchanged', async () => {
    const item = await getRepository(Cooldown).findOne({ where: { name: '!me' } });
    assert.strictEqual(item.timestamp, timestamp);
    assert.strictEqual(item.lastTimestamp, timestamp);
  });
});

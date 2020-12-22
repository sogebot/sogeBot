/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it before */

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const user = require('../../general.js').user;
const time = require('../../general.js').time;

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');

const { prepare } = require('../../../dest/commons');

const assert = require('assert');

const command = '!bankheist';
let heist;

describe('Heist - !bankheist', () => {
  before(async () => {
    await db.cleanup();
    heist = (require('../../../dest/games/heist')).default;
  });
  beforeEach(async () => {
    await user.prepare();
  });

  describe('!bankheist when nobody joined', () => {
    before(async () => {
      await message.prepare();
      await getRepository(User).save({ userId: user.owner.userId, username: user.owner.username, points: 1000 });
    });

    it('User start new bankheist with !bankheist', async () => {
      await heist.main({ sender: user.viewer, parameters: '', command });
    });

    it('Heist should be announced', async () => {
      await message.isSentRaw('@__viewer__ has started planning a bank heist! Looking for a bigger crew for a bigger score. Join in! Type !bankheist <points> to enter.', { username: 'bot'});
    });

    it('Already started bankheist should show entryInstruction with !bankheist without points', async () => {
      const r = await heist.main({ sender: user.viewer2, parameters: '', command });
      assert.strictEqual(r[0].response, '$sender, type !bankheist <points> to enter.');
    });

    it('Force heist to end', async () => {
      heist.startedAt = 0;
    });

    it('Correct !bankheist should show lateEntryMessage', async () => {
      const r = await heist.main({ sender: user.owner, parameters: '100', command });
      assert.strictEqual(r[0].response, '$sender, heist is currently in progress!');
    });

    it('We need to wait at least 15 seconds', async() =>{
      const steps = 3;
      process.stdout.write(`\t... waiting ${(15)}s ...                `);
      for (let i = 0; i < steps; i++) {
        await time.waitMs(15000 / steps);
        process.stdout.write(`\r\t... waiting ${15 - ((15 / steps) * i)}s ...                `);
      }
    });

    it('Heist should be finished - nobody joined', async () => {
      await message.isSentRaw('Nobody joins a crew to heist.', { username: 'bot'});
    });
  });
});

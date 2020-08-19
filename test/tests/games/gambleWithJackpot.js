/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it before */

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');

const gamble = (require('../../../dest/games/gamble')).default;
const points = (require('../../../dest/systems/points')).default;
const { prepare } = require('../../../dest/commons');

const _ = require('lodash');
const assert = require('assert');

const user1 = { username: 'user1', userId: Number(_.random(999999, false)) };
const command = '!gamble';

describe('Gambling - gamble with Jackpot', () => {
  describe('User uses !gamble', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();

      // enable jackpot and set chance to win to 0 so we fill up jackpot bank
      gamble.enableJackpot = true;
      gamble.chanceToTriggerJackpot = -1;
      gamble.chanceToWin = -1;
      gamble.lostPointsAddedToJackpot = 10;
      gamble.jackpotValue = 0;
    });

    after(() => {
      gamble.enableJackpot = false;
    });

    it('add points for user', async () => {
      await getRepository(User).save({ userId: user1.userId, username: user1.username, points: 1000 });
    });

    it('user should lose !gamble 125', async () => {
      const r = await gamble.main({ sender: user1, parameters: '125', command });
      assert.strictEqual(r[0].response, '$sender, you LOST! You now have 875 points. Jackpot increased to 13 points');
    });

    it('user should lose again !gamble 100', async () => {
      const r = await gamble.main({ sender: user1, parameters: '200', command });
      assert.strictEqual(r[0].response, '$sender, you LOST! You now have 675 points. Jackpot increased to 33 points');
    });

    it('set lostPointsAddedToJackpot to 100%', () => {
      gamble.lostPointsAddedToJackpot = 100;
    });

    it('user should lose again !gamble 100', async () => {
      const r = await gamble.main({ sender: user1, parameters: '100', command });
      assert.strictEqual(r[0].response, '$sender, you LOST! You now have 575 points. Jackpot increased to 133 points');
    });

    it('set chance for jackpot to 100%', () => {
      gamble.chanceToTriggerJackpot = 100;
    });

    it('user should win jackpot !gamble 100', async () => {
      const r = await gamble.main({ sender: user1, parameters: '100', command });
      assert.strictEqual(r[0].response, '$sender, you hit JACKPOT! You won 133 points in addition to your bet. You now have 808 points');
    });
  });
});

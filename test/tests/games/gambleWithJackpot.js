
/* global describe it before */

import('../../general.js');

import assert from 'assert';

import _ from 'lodash-es';
import { AppDataSource } from '../../../dest/database.js';

import { User } from '../../../dest/database/entity/user.js';
import gamble from '../../../dest/games/gamble.js';
import { prepare } from '../../../dest/helpers/commons/prepare.js';
import { db } from '../../general.js';
import { message } from '../../general.js';

const user1 = { userName: 'user1', userId: String(_.random(999999, false)) };
const command = '!gamble';

describe('Gambling - gamble with Jackpot - @func1', () => {
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
      await AppDataSource.getRepository(User).save({
        userId: user1.userId, userName: user1.userName, points: 1000,
      });
    });

    it('user should lose !gamble 125', async () => {
      const r = await gamble.main({
        sender: user1, parameters: '125', command,
      });
      assert.strictEqual(r[0].response, '$sender, you LOST! You now have 875 points. Jackpot increased to 13 points');
    });

    it('user should lose again !gamble 100', async () => {
      const r = await gamble.main({
        sender: user1, parameters: '200', command,
      });
      assert.strictEqual(r[0].response, '$sender, you LOST! You now have 675 points. Jackpot increased to 33 points');
    });

    it('set lostPointsAddedToJackpot to 100%', () => {
      gamble.lostPointsAddedToJackpot = 100;
    });

    it('user should lose again !gamble 100', async () => {
      const r = await gamble.main({
        sender: user1, parameters: '100', command,
      });
      assert.strictEqual(r[0].response, '$sender, you LOST! You now have 575 points. Jackpot increased to 133 points');
    });

    it('!gamble jackpot should show correct jackpot', async () => {
      const r = await gamble.jackpot({ sender: user1, command });
      assert.strictEqual(r[0].response, '$sender, current jackpot for !gamble is 133 points');
    });

    it('set chance for jackpot to 100%', () => {
      gamble.chanceToTriggerJackpot = 100;
    });

    it('user should win jackpot !gamble 100', async () => {
      const r = await gamble.main({
        sender: user1, parameters: '100', command,
      });
      assert.strictEqual(r[0].response, '$sender, you hit JACKPOT! You won 133 points in addition to your bet. You now have 808 points');
    });
  });
});

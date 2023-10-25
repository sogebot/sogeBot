/* eslint-disable @typescript-eslint/no-var-requires */
/* global */

require('../../general.js');

import assert from 'assert';

const _ = require('lodash');
const { AppDataSource } = require('../../../dest/database.js');

const { User } = require('../../../dest/database/entity/user');
const gamble = (require('../../../dest/games/gamble')).default;
const { prepare } = require('../../../dest/helpers/commons/prepare');
const { getPointsName } = require('../../../dest/helpers/points/getPointsName');
const points = (require('../../../dest/systems/points')).default;
import { db } from '../../general.js';
import { message } from '../../general.js';

const user1 = { userName: 'user1', userId: String(_.random(999999, false)) };
const command = '!gamble';

describe('Gambling - gamble - @func3', () => {
  beforeEach(async () => {
    const changelog = (require('../../../dest/helpers/user/changelog'));
    await changelog.flush();
    await AppDataSource.getRepository(User).save({
      userId: user1.userId, userName: user1.userName, points: 100,
    });
  });

  describe('User uses !gamble', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      gamble.enableJackpot = false;
    });

    it('user should unsuccessfully !gamble 0', async () => {
      const r = await gamble.main({
        sender: user1, parameters: '0', command,
      });
      const updatedPoints = await points.getPointsOf(user1.userId);

      assert(r[0].response === '$sender, you cannot gamble 0 points', JSON.stringify({ r }, null, 2));
      assert.strictEqual(updatedPoints, 100);
    });

    it('user should successfully !gamble 1', async () => {
      const r = await gamble.main({
        sender: user1, parameters: '1', command,
      });
      const updatedPoints = await points.getPointsOf(user1.userId);

      const msg1 = prepare('gambling.gamble.win', {
        pointsName: await getPointsName(updatedPoints), points: updatedPoints, command,
      });
      const msg2 = prepare('gambling.gamble.lose', {
        pointsName: await getPointsName(updatedPoints), points: updatedPoints, command,
      });
      assert(r[0].response === msg1 || r[0].response === msg2, JSON.stringify({
        r, msg1, msg2,
      }, null, 2));
      assert(updatedPoints === 99 || updatedPoints === 101, updatedPoints);
    });

    it('!gamble jackpot should show disabled jackpot', async () => {
      const r = await gamble.jackpot({ sender: user1, command });
      assert.strictEqual(r[0].response, '$sender, jackpot is disabled for !gamble.');
    });

    it('user should successfully !gamble all', async () => {
      const r = await gamble.main({
        sender: user1, parameters: 'all', command,
      });
      const updatedPoints = await points.getPointsOf(user1.userId);
      const msg1 = prepare('gambling.gamble.win', {
        pointsName: await getPointsName(updatedPoints), points: updatedPoints, command,
      });
      const msg2 = prepare('gambling.gamble.lose', {
        pointsName: await getPointsName(updatedPoints), points: updatedPoints, command,
      });
      assert(r[0].response === msg1 || r[0].response === msg2, JSON.stringify({
        r, msg1, msg2,
      }, null, 2));
      assert(updatedPoints === 0 || updatedPoints === 200, updatedPoints);
    });
  });

  describe('User uses !gamble with not enough options', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
    });

    it('user should fail !gamble', async () => {
      const r = await gamble.main({
        sender: user1, parameters: '', command,
      });
      assert(r[0].response === '$sender, you need to specify points to gamble', JSON.stringify({ r }, null, 2));
    });

    describe('User uses !gamble with minimal value 10', () => {
      before(async () => {
        await db.cleanup();
        await message.prepare();
        gamble.minimalBet = 10;
      });
      after(() => {
        gamble.minimalBet = 0;
      });
      it('user should unsuccessfully !gamble 1', async () => {
        const r = await gamble.main({
          sender: user1, parameters: '1', command,
        });
        const updatedPoints = await points.getPointsOf(user1.userId);

        assert(r[0].response === '$sender, minimal bet for !gamble is 10 points', JSON.stringify({ r }, null, 2));
        assert.strictEqual(updatedPoints, 100);
      });

      it('user should successfully !gamble 10', async () => {
        const r = await gamble.main({
          sender: user1, parameters: '10', command,
        });
        const updatedPoints = await points.getPointsOf(user1.userId);

        const msg1 = prepare('gambling.gamble.win', {
          pointsName: await getPointsName(updatedPoints), points: updatedPoints, command,
        });
        const msg2 = prepare('gambling.gamble.lose', {
          pointsName: await getPointsName(updatedPoints), points: updatedPoints, command,
        });
        assert(r[0].response === msg1 || r[0].response === msg2, JSON.stringify({
          r, msg1, msg2,
        }, null, 2));
        assert(updatedPoints === 90 || updatedPoints === 110, { updatedPoints });
      });

      it('user should successfully !gamble all', async () => {
        const r = await gamble.main({
          sender: user1, parameters: 'all', command,
        });
        const updatedPoints = await points.getPointsOf(user1.userId);

        const msg1 = prepare('gambling.gamble.win', {
          pointsName: await getPointsName(updatedPoints), points: updatedPoints, command,
        });
        const msg2 = prepare('gambling.gamble.lose', {
          pointsName: await getPointsName(updatedPoints), points: updatedPoints, command,
        });
        assert(r[0].response === msg1 || r[0].response === msg2, JSON.stringify({
          r, msg1, msg2,
        }, null, 2));
        assert(updatedPoints === 0 || updatedPoints === 200, updatedPoints);
      });
    });
  });

  describe('User uses !gamble all with minimal value and with not enough points - https://community.sogebot.xyz/t/bypass-the-minimum-amount-for-gamble/219', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      gamble.minimalBet = 110;
    });
    after(() => {
      gamble.minimalBet = 0;
    });

    it('user should unsuccessfully !gamble all', async () => {
      const r = await gamble.main({
        sender: user1, parameters: 'all', command,
      });
      const updatedPoints = await points.getPointsOf(user1.userId);

      assert(r[0].response === '$sender, minimal bet for !gamble is 110 points', JSON.stringify({ r }, null, 2));
      assert.strictEqual(updatedPoints, 100);
    });
  });
});

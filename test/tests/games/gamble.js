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

describe('Gambling - gamble', () => {
  describe('User uses !gamble', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
    });

    it('add points for user', async () => {
      await getRepository(User).save({ userId: user1.userId, username: user1.username, points: 100 });
    });

    it('user should successfully !gamble 1', async () => {
      const r = await gamble.main({ sender: user1, parameters: '1', command });
      const updatedPoints = await points.getPointsOf(user1.userId);

      const msg1 = prepare('gambling.gamble.win', { pointsName: await points.getPointsName(updatedPoints), points: updatedPoints, command });
      const msg2 = prepare('gambling.gamble.lose', { pointsName: await points.getPointsName(updatedPoints), points: updatedPoints, command });
      assert(r[0].response === msg1 || r[0].response === msg2, JSON.stringify({r, msg1, msg2}));
    });

    it('user should successfully !gamble all', async () => {
      const r = await gamble.main({ sender: user1, parameters: 'all', command });
      const updatedPoints = await points.getPointsOf(user1.userId);
      const msg1 = prepare('gambling.gamble.win', { pointsName: await points.getPointsName(updatedPoints), points: updatedPoints, command });
      const msg2 = prepare('gambling.gamble.lose', { pointsName: await points.getPointsName(updatedPoints), points: updatedPoints, command });
      assert(r[0].response === msg1 || r[0].response === msg2, JSON.stringify({r, msg1, msg2}));
    });
  });
});

/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it before */

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');

const gamble = (require('../../../dest/games/gamble')).default;
const points = (require('../../../dest/systems/points')).default;

const _ = require('lodash');

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
      await gamble.main({ sender: user1, parameters: '1', command });
      const updatedPoints = await points.getPointsOf(user1.userId);

      await message.isSent(['gambling.gamble.win', 'gambling.gamble.lose'], user1, {
        pointsName: await points.getPointsName(updatedPoints),
        points: updatedPoints,
        command,
      });
    });

    it('user should successfully !gamble all', async () => {
      await gamble.main({ sender: user1, parameters: 'all', command });
      const updatedPoints = await points.getPointsOf(user1.userId);

      await message.isSent(['gambling.gamble.win', 'gambling.gamble.lose'], user1, {
        pointsName: await points.getPointsName(updatedPoints),
        points: updatedPoints,
        command,
      });
    });
  });
});

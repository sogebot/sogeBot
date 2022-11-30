/* eslint-disable @typescript-eslint/no-var-requires */
/* global */

require('../../general.js');
const assert = require('assert');
const { IsNull } = require('typeorm');

const commons = require('../../../dest/commons');
const { AppDataSource } = require('../../../dest/database.js');
const { Raffle } = require('../../../dest/database/entity/raffle');
const { User } = require('../../../dest/database/entity/user');
const changelog = (require('../../../dest/helpers/user/changelog'));
const raffles = (require('../../../dest/systems/raffles')).default;
const db = require('../../general.js').db;
const message = require('../../general.js').message;
const user = require('../../general.js').user;

describe('Raffles - over max limit points not adding to raffle #3547 - @func3', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
    raffles.allowOverTicketing = true;
  });

  it('create ticket raffle', async () => {
    raffles.open({ sender: user.owner, parameters: '!winme -min 0 -max 100' });
    await message.isSentRaw('Raffle is running (0 entries). To enter type "!winme <1-100>". Raffle is opened for everyone.', { userName: '__bot__' });
  });

  it('Update viewer to have 1000 points', async () => {
    await AppDataSource.getRepository(User).save({
      userName: user.viewer.userName, userId: user.viewer.userId, points: 1000,
    });
  });

  it('Viewer bets over max points', async () => {
    const a = await raffles.participate({ sender: user.viewer, message: '!winme 1000' });
    assert(a);
  });

  it('expecting 1 participant to have bet of 100', async () => {
    const raffle = await AppDataSource.getRepository(Raffle).findOne({
      relations: ['participants'],
      where:     { winner: IsNull(), isClosed: false },
    });
    assert(raffle.participants.length === 1, 'Participant not found in raffle - ' + JSON.stringify(raffle.participants));
    assert(raffle.participants[0].tickets === 100, `Participant doesn't have correct points - ${raffle.participants[0].tickets} === 100`);
  });

  it('User should have 900 points', async () => {
    await changelog.flush();
    const result = await AppDataSource.getRepository(User).findOneBy({ userName: user.viewer.userName, userId: user.viewer.userId });
    assert(result.points === 900);
  });
});

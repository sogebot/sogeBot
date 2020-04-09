/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it before */

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const user = require('../../general.js').user;
const commons = require('../../../dest/commons');

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');
const { Raffle } = require('../../../dest/database/entity/raffle');

const raffles = (require('../../../dest/systems/raffles')).default;

const assert = require('assert');

describe('Raffles - over max limit points not adding to raffle #3547', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
    raffles.allowOverTicketing = true;
  });

  it('create ticket raffle', async () => {
    raffles.open({ sender: user.owner, parameters: '!winme -min 0 -max 100' });
    await message.isSent('raffles.announce-ticket-raffle', { username: 'bot' }, {
      keyword: '!winme',
      eligibility: await commons.prepare('raffles.eligibility-everyone-item'),
      min: 1,
      max: 100,
    });
  });

  it('Update viewer to have 1000 points', async () => {
    await getRepository(User).save({ username: user.viewer.username, userId: user.viewer.userId, points: 1000 });
  });

  it('Viewer bets over max points', async () => {
    const a = await raffles.participate({ sender: user.viewer, message: '!winme 1000' });
    assert(a);
  });

  it('expecting 1 participant to have bet of 100', async () => {
    const raffle = await getRepository(Raffle).findOne({
      relations: ['participants'],
      where: { winner: null, isClosed: false },
    });
    assert(raffle.participants.length === 1, 'Participant not found in raffle - ' + JSON.stringify(raffle.participants));
    assert(raffle.participants[0].tickets === 100, `Participant doesn't have correct points - ${raffle.participants[0].tickets} === 100`);
  });

  it('User should have 900 points', async () => {
    const result = await getRepository(User).findOne({ username: user.viewer.username, userId: user.viewer.userId });
    assert(result.points === 900);
  });
});

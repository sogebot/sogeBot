/* global describe it before */

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const _ = require('lodash');
const commons = require('../../../dest/commons');

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');
const { Raffle } = require('../../../dest/database/entity/raffle');

const raffles = (require('../../../dest/systems/raffles')).default;

const assert = require('assert');

const max = Math.floor(Number.MAX_SAFE_INTEGER / 10000000);

const owner = { username: 'soge__', userId: Number(_.random(999999, false)) };
const testuser = { username: 'testuser', userId: Number(_.random(999999, false)) };
const testuser2 = { username: 'testuser2', userId: Number(_.random(999999, false)) };

describe('/t/raffle-owner-can-join-raffle-more-then-1-time/32', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('create normal raffle', async () => {
    raffles.open({ sender: owner, parameters: '!winme' });
    await message.isSent('raffles.announce-raffle', { username: 'bot' }, {
      keyword: '!winme',
      eligibility: await commons.prepare('raffles.eligibility-everyone-item'),
    });
  });

  it('loop through owner participations', async () => {
    for (let i = 0; i < 100; i++) {
      const a = await raffles.participate({ sender: commons.getOwnerAsSender(), message: `!winme` });
      assert(a);
    }
  });

  it('expecting only one participator', async () => {
    const raffle = await getRepository(Raffle).findOne({
      relations: ['participants'],
      where: { winner: null, isClosed: false },
    });
    assert(raffle.participants.length === 1)
  });
});

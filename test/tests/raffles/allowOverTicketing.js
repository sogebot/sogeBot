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

describe('Raffles - allowOverTicketing', () => {
  describe('Disabled allowOverTicketing', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      raffles.allowOverTicketing = false;
    });

    it('create ticket raffle', async () => {
      raffles.open({ sender: user.owner, parameters: '!winme -min 0 -max 500' });
      await message.isSent('raffles.announce-ticket-raffle', { username: 'bot' }, {
        keyword: '!winme',
        eligibility: await commons.prepare('raffles.eligibility-everyone-item'),
        min: 1,
        max: 500,
      });
    });

    it('Update viewer to have 10 points', async () => {
      await getRepository(User).save({ username: user.viewer.username, userId: user.viewer.userId, points: 10 });
    });

    it('Viewer bets over 10 points', async () => {
      const a = await raffles.participate({ sender: user.viewer, message: '!winme 100' });
      assert(a === false);
    });

    it('expecting 0 participant', async () => {
      const raffle = await getRepository(Raffle).findOne({
        relations: ['participants'],
        where: { winner: null, isClosed: false },
      });
      assert(raffle.participants.length === 0);
    });

    it('Viewer bets 10 points', async () => {
      const a = await raffles.participate({ sender: user.viewer, message: '!winme 10' });
      assert(a);
    });

    it('expecting 1 participant', async () => {
      const raffle = await getRepository(Raffle).findOne({
        relations: ['participants'],
        where: { winner: null, isClosed: false },
      });
      assert(raffle.participants.length === 1);
    });

    it('Participant bet 10 points', async () => {
      const raffle = await getRepository(Raffle).findOne({
        relations: ['participants'],
        where: { winner: null, isClosed: false },
      });
      assert(raffle.participants[0].tickets === 10, `${raffle.participants[0].tickets} != 10`);
    });
  });

  describe('Enabled allowOverTicketing', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      raffles.allowOverTicketing = true;
    });

    after(() => {
      raffles.allowOverTicketing = false;
    });

    it('create ticket raffle', async () => {
      raffles.open({ sender: user.owner, parameters: '!winme -min 0 -max 500' });
      await message.isSent('raffles.announce-ticket-raffle', { username: 'bot' }, {
        keyword: '!winme',
        eligibility: await commons.prepare('raffles.eligibility-everyone-item'),
        min: 1,
        max: 500,
      });
    });

    it('Update viewer to have 10 points', async () => {
      await getRepository(User).save({ username: user.viewer.username, userId: user.viewer.userId, points: 10 });
    });

    it('Viewer bets over 10 points', async () => {
      const a = await raffles.participate({ sender: user.viewer, message: '!winme 100' });
      assert(a);
    });

    it('expecting 1 participant', async () => {
      const raffle = await getRepository(Raffle).findOne({
        relations: ['participants'],
        where: { winner: null, isClosed: false },
      });
      assert(raffle.participants.length === 1);
    });

    it('Participant bet 10 points', async () => {
      const raffle = await getRepository(Raffle).findOne({
        relations: ['participants'],
        where: { winner: null, isClosed: false },
      });
      assert(raffle.participants[0].tickets === 10, `${raffle.participants[0].tickets} != 10`);
    });

    it('Viewer bets 10 points', async () => {
      const a = await raffles.participate({ sender: user.viewer, message: '!winme 10' });
      assert(a);
    });

    it('expecting 1 participant', async () => {
      const raffle = await getRepository(Raffle).findOne({
        relations: ['participants'],
        where: { winner: null, isClosed: false },
      });
      assert(raffle.participants.length === 1);
    });

    it('Participant bet 10 points', async () => {
      const raffle = await getRepository(Raffle).findOne({
        relations: ['participants'],
        where: { winner: null, isClosed: false },
      });
      assert(raffle.participants[0].tickets === 10, `${raffle.participants[0].tickets} != 10`);
    });
  });
});

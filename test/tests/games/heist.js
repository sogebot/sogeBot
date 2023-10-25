import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js';

import('../../general.js');
import { User } from '../../../dest/database/entity/user.js';
import { db, message, user } from '../../general.js';
import { time } from '../../general.js';

const command = '!bankheist';
let heist;

describe('Heist - !bankheist - @func2', () => {
  before(async () => {
    await db.cleanup();
    await user.prepare();

    heist = (await import('../../../dest/games/heist.js')).default;
  });

  describe('!bankheist when nobody joined', () => {
    before(async () => {
      await message.prepare();
      await AppDataSource.getRepository(User).save({
        userId: user.owner.userId, userName: user.owner.userName, points: 1000,
      });

      // reset heist
      heist.startedAt = null;
      heist.lastAnnouncedLevel = '';
      heist.lastHeistTimestamp = 0;
      heist.lastAnnouncedCops = 0;
      heist.lastAnnouncedHeistInProgress = 0;
      heist.lastAnnouncedStart = 0;
      heist.showMaxUsers = 20;
    });

    it('User start new bankheist with !bankheist', async () => {
      await heist.main({
        sender: user.viewer, parameters: '', command,
      });
    });

    it('Heist should be announced', async () => {
      await message.isSentRaw('@__viewer__ has started planning a bank heist! Looking for a bigger crew for a bigger score. Join in! Type !bankheist <points> to enter.', { userName: '__bot__' });
    });

    it('Already started bankheist should show entryInstruction with !bankheist without points', async () => {
      const r = await heist.main({
        sender: user.viewer2, parameters: '', command,
      });
      assert.strictEqual(r[0].response, '$sender, type !bankheist <points> to enter.');
    });

    it('Force heist to end', async () => {
      heist.startedAt = 0;
    });

    it('Correct !bankheist should show lateEntryMessage', async () => {
      const r = await heist.main({
        sender: user.owner, parameters: '100', command,
      });
      assert.strictEqual(r[0].response, '$sender, heist is currently in progress!');
    });

    it('We need to wait at least 30 seconds', async() =>{
      const steps = 10;
      process.stdout.write(`\t... waiting ${(30)}s ...                `);
      for (let i = 0; i < steps; i++) {
        await time.waitMs(30000 / steps);
        process.stdout.write(`\r\t... waiting ${30 - ((30 / steps) * i)}s ...                `);
      }
    });

    it('Heist should be finished - nobody joined', async () => {
      await message.isSentRaw('Nobody joins a crew to heist.', { userName: '__bot__' });
    });
  });

  describe('!bankheist with several joins', () => {
    before(async () => {
      await message.prepare();

      // reset heist
      heist.startedAt = null;
      heist.lastAnnouncedLevel = '';
      heist.lastHeistTimestamp = 0;
      heist.lastAnnouncedCops = 0;
      heist.lastAnnouncedHeistInProgress = 0;
      heist.lastAnnouncedStart = 0;
      heist.showMaxUsers = 1;

      await AppDataSource.getRepository(User).save({
        userId: user.owner.userId, userName: user.owner.userName, points: 1000,
      });
      await AppDataSource.getRepository(User).save({
        userId: user.viewer.userId, userName: user.viewer.userName, points: 1000,
      });
      await AppDataSource.getRepository(User).save({
        userId: user.viewer2.userId, userName: user.viewer2.userName, points: 1000,
      });
      await AppDataSource.getRepository(User).save({
        userId: user.mod.userId, userName: user.mod.userName, points: 1000,
      });
      // generate 1000 users
      for (let i=0; i < 1000; i++) {
        await AppDataSource.getRepository(User).save({
          userId: String(i * 9999), userName: `user${i}`, points: 1000,
        });
      }
    });

    it('User start new bankheist with !bankheist 100', async () => {
      const r = await heist.main({
        sender: user.viewer, parameters: '100', command,
      });
      // if correct we don't expect any message
      assert.strictEqual(r.length, 0, JSON.stringify(r, null, 2));
    });

    it('Heist should be announced', async () => {
      await message.isSentRaw('@__viewer__ has started planning a bank heist! Looking for a bigger crew for a bigger score. Join in! Type !bankheist <points> to enter.', { userName: '__bot__' });
    });

    it('Another viewer joins with all points', async () => {
      const r = await heist.main({
        sender: user.viewer2, parameters: 'all', command,
      });
      // if correct we don't expect any message
      assert.strictEqual(r.length, 0);
    });

    it('Another viewer joins with 0 points', async () => {
      const r = await heist.main({
        sender: user.viewer2, parameters: '0', command,
      });
      assert.strictEqual(r[0].response, '$sender, type !bankheist <points> to enter.');
    });

    it('Another viewer joins with all points', async () => {
      const r = await heist.main({
        sender: user.mod, parameters: 'all', command,
      });
      // if correct we don't expect any message
      assert.strictEqual(r.length, 0);
    });

    it('Another viewer joins with all points (and not having any points)', async () => {
      const r = await heist.main({
        sender: user.mod, parameters: 'all', command,
      });
      assert.strictEqual(r[0].response, '$sender, type !bankheist <points> to enter.');
    });

    it(`1000 users joins bankheist`, async () => {
      for (let i=0; i < 1000; i++) {
        await heist.main({
          sender: { userId: String(i*9999), userName: `user${i}` }, parameters: '100', command,
        });
      }
    });

    it('Force heist to end', async () => {
      heist.startedAt = 0;
      // force instant result
      heist.iCheckFinished();
    });
    it('We need to wait at least 10 seconds', async() =>{
      const steps = 10;
      process.stdout.write(`\t... waiting ${(10)}s ...                `);
      for (let i = 0; i < steps; i++) {
        await time.waitMs(10000 / steps);
        process.stdout.write(`\r\t... waiting ${10 - ((10 / steps) * i)}s ...                `);
      }
    });

    it('Heist should be finished - start message', async () => {
      await message.isSentRaw('Alright guys, check your equipment, this is what we trained for. This is not a game, this is real life. We will get money from Federal reserve!', { userName: '__bot__' });
    });
    it('Heist should be finished - result message', async () => {
      await message.isSentRaw([
        'Everyone was mercilessly obliterated. This is slaughter.',
        'Only 1/3rd of team get its money from heist.',
        'Half of heist team was killed or catched by police.',
        'Some loses of heist team is nothing of what remaining crew have in theirs pockets.',
        'God divinity, nobody is dead, everyone won!',
      ], { userName: '__bot__' });
    });
    it('We need to wait at least 10 seconds', async() =>{
      const steps = 10;
      process.stdout.write(`\t... waiting ${(10)}s ...                `);
      for (let i = 0; i < steps; i++) {
        await time.waitMs(10000 / steps);
        process.stdout.write(`\r\t... waiting ${10 - ((10 / steps) * i)}s ...                `);
      }
    });
    it('Heist should be finished - userslist', async () => {
      await message.sentMessageContain('The heist payouts are: ');
      await message.sentMessageContain('more...');
    });
  });

  describe('!bankheist with single join', () => {
    before(async () => {
      await message.prepare();

      // reset heist
      heist.startedAt = null;
      heist.lastAnnouncedLevel = '';
      heist.lastHeistTimestamp = 0;
      heist.lastAnnouncedCops = 0;
      heist.lastAnnouncedHeistInProgress = 0;
      heist.lastAnnouncedStart = 0;
      heist.showMaxUsers = 20;

      await AppDataSource.getRepository(User).save({
        userId: user.viewer.userId, userName: user.viewer.userName, points: 1000,
      });
    });

    it('User start new bankheist with !bankheist 100', async () => {
      const r = await heist.main({
        sender: user.viewer, parameters: '100', command,
      });
      // if correct we don't expect any message
      assert.strictEqual(r.length, 0);
    });

    it('Heist should be announced', async () => {
      await message.isSentRaw('@__viewer__ has started planning a bank heist! Looking for a bigger crew for a bigger score. Join in! Type !bankheist <points> to enter.', { userName: '__bot__' });
    });

    it('Force heist to end', async () => {
      heist.startedAt = 0;
      heist.iCheckFinished();
    });

    it('Heist should be finished - start message', async () => {
      await message.isSentRaw('Alright guys, check your equipment, this is what we trained for. This is not a game, this is real life. We will get money from Bank van!', { userName: '__bot__' });
    });
    it('Heist should be finished - result message', async () => {
      await message.isSentRaw([
        '@__viewer__ was like a ninja. Nobody noticed missing money.',
        '@__viewer__ failed to get rid of police and will be spending his time in jail.',
      ], { userName: '__bot__' });
    });
  });

  describe('!bankheist cops cooldown', () => {
    before(async () => {
      await message.prepare();

      // reset heist
      heist.startedAt = null;
      heist.lastAnnouncedLevel = '';
      heist.lastHeistTimestamp = 0;
      heist.lastAnnouncedCops = 0;
      heist.lastAnnouncedHeistInProgress = 0;
      heist.lastAnnouncedStart = 0;
      heist.showMaxUsers = 20;
      heist.copsCooldownInMinutes = 1;
      heist.entryCooldownInSeconds = 5; // adds 10 seconds to announce results

      await AppDataSource.getRepository(User).save({
        userId: user.viewer.userId, userName: user.viewer.userName, points: 1000,
      });
    });

    after(() => {
      heist.copsCooldownInMinutes = 10;
      heist.entryCooldownInSeconds = 120;
    });

    it('User start new bankheist with !bankheist 100', async () => {
      const r = await heist.main({
        sender: user.viewer, parameters: '100', command,
      });
      // if correct we don't expect any message
      assert.strictEqual(r.length, 0);
    });

    it('Heist should be announced', async () => {
      await message.isSentRaw('@__viewer__ has started planning a bank heist! Looking for a bigger crew for a bigger score. Join in! Type !bankheist <points> to enter.', { userName: '__bot__' });
    });
    it('We need to wait at least 20 seconds', async() =>{
      const steps = 10;
      process.stdout.write(`\t... waiting ${(20)}s ...                `);
      for (let i = 0; i < steps; i++) {
        await time.waitMs(20000 / steps);
        process.stdout.write(`\r\t... waiting ${20 - ((20 / steps) * i)}s ...                `);
      }
    });

    it('Heist should be finished - start message', async () => {
      await message.isSentRaw('Alright guys, check your equipment, this is what we trained for. This is not a game, this is real life. We will get money from Bank van!', { userName: '__bot__' });
    });
    it('Heist should be finished - result message', async () => {
      await message.isSentRaw([
        '@__viewer__ was like a ninja. Nobody noticed missing money.',
        '@__viewer__ failed to get rid of police and will be spending his time in jail.',
      ], { userName: '__bot__' });
    });

    it('User start new bankheist with !bankheist 100, but cops are patrolling', async () => {
      const r = await heist.main({
        sender: user.viewer, parameters: '100', command,
      });
      assert([
        '$sender, cops are still searching for last heist team. Try again after 1.0 minute.',
        '$sender, cops are still searching for last heist team. Try again after 0.9 minutes.',
        '$sender, cops are still searching for last heist team. Try again after 0.8 minutes.',
        '$sender, cops are still searching for last heist team. Try again after 0.10 minutes.',
        '$sender, cops are still searching for last heist team. Try again after 0.6 minutes.',
        '$sender, cops are still searching for last heist team. Try again after 0.5 minutes.',
        '$sender, cops are still searching for last heist team. Try again after 0.4 minutes.',
        '$sender, cops are still searching for last heist team. Try again after 0.3 minutes.',
        '$sender, cops are still searching for last heist team. Try again after 0.2 minutes.',
        '$sender, cops are still searching for last heist team. Try again after 0.1 minutes.',
      ].includes(r[0].response), r[0].response);
    });

    it('Cops are still patrolling but we should not have new message in succession', async () => {
      const r = await heist.main({
        sender: user.viewer, parameters: '100', command,
      });
      assert(r.length === 0);
    });
    it('We need to wait at least 105 seconds', async() =>{
      const steps = 15;
      process.stdout.write(`\t... waiting ${(105)}s ...                `);
      for (let i = 0; i < steps; i++) {
        await time.waitMs(105000 / steps);
        process.stdout.write(`\r\t... waiting ${105 - ((105 / steps) * i)}s ...                `);
      }
    }).timeout(60000 * 3);
    it('We should get announce that cops are not on cooldown', async () => {
      await message.isSentRaw('Alright guys, looks like police forces are eating donuts and we can get that sweet money!', { userName: '__bot__' });
    });
  });

  describe('!bankheist levels announcement', () => {
    before(async () => {
      await message.prepare();

      // reset heist
      heist.startedAt = null;
      heist.lastAnnouncedLevel = '';
      heist.lastHeistTimestamp = 0;
      heist.lastAnnouncedCops = 0;
      heist.lastAnnouncedHeistInProgress = 0;
      heist.lastAnnouncedStart = 0;
      heist.showMaxUsers = 20;
      heist.entryCooldownInSeconds = 5; // adds 10 seconds to announce results

      await AppDataSource.getRepository(User).save({
        userId: user.viewer.userId, userName: user.viewer.userName, points: 1000,
      });
      // generate 50 users
      for (let i=0; i < 50; i++) {
        await AppDataSource.getRepository(User).save({
          userId: String(i * 9999), userName: `user${i}`, points: 1000,
        });
      }
    });
    after(() => {
      heist.entryCooldownInSeconds = 120;
    });

    it('User start new bankheist with !bankheist 100', async () => {
      const r = await heist.main({
        sender: user.viewer, parameters: '100', command,
      });
      // if correct we don't expect any message
      assert.strictEqual(r.length, 0);
    });

    it('bankVan level should be announced', async () => {
      const current = 'Bank van';
      const next = 'City bank';
      await message.isSentRaw(`With this crew, we can heist ${current}! Let's see if we can get enough crew to heist ${next}`, { userName: '__bot__' });
    });

    it(`5 users joins bankheist`, async () => {
      for (let i=0; i < 5; i++) {
        await heist.main({
          sender: { userId: String(i*9999), userName: `user${i}` }, parameters: '100', command,
        });
      }
    });

    it('cityBank level should be announced', async () => {
      const current = 'City bank';
      const next = 'State bank';
      await message.isSentRaw(`With this crew, we can heist ${current}! Let's see if we can get enough crew to heist ${next}`, { userName: '__bot__' });
    });

    it(`10 users joins bankheist`, async () => {
      for (let i=5; i < 10; i++) {
        await heist.main({
          sender: { userId: String(i*9999), userName: `user${i}` }, parameters: '100', command,
        });
      }
    });

    it('stateBank level should be announced', async () => {
      const current = 'State bank';
      const next = 'National reserve';
      await message.isSentRaw(`With this crew, we can heist ${current}! Let's see if we can get enough crew to heist ${next}`, { userName: '__bot__' });
    });

    it(`10 users joins bankheist`, async () => {
      for (let i=10; i < 20; i++) {
        await heist.main({
          sender: { userId: String(i*9999), userName: `user${i}` }, parameters: '100', command,
        });
      }
    });

    it('nationalReserve level should be announced', async () => {
      const current = 'National reserve';
      const next = 'Federal reserve';
      await message.isSentRaw(`With this crew, we can heist ${current}! Let's see if we can get enough crew to heist ${next}`, { userName: '__bot__' });
    });

    it(`30 users joins bankheist`, async () => {
      for (let i=20; i < 50; i++) {
        await heist.main({
          sender: { userId: String(i*9999), userName: `user${i}` }, parameters: '100', command,
        });
      }
    });

    it('maxLevelMessage level should be announced', async () => {
      const current = 'Federal reserve';
      await message.isSentRaw(`With this crew, we can heist ${current}! It cannot be any better!`, { userName: '__bot__' });
    });
  });

  describe('!bankheist no levels', () => {
    before(async () => {
      await message.prepare();

      // reset heist
      heist.startedAt = null;
      heist.lastAnnouncedLevel = '';
      heist.lastHeistTimestamp = 0;
      heist.lastAnnouncedCops = 0;
      heist.lastAnnouncedHeistInProgress = 0;
      heist.lastAnnouncedStart = 0;
      heist.showMaxUsers = 20;
      heist.entryCooldownInSeconds = 5; // adds 10 seconds to announce results
      heist.levelsValues = [];

      await AppDataSource.getRepository(User).save({
        userId: user.viewer.userId, userName: user.viewer.userName, points: 1000,
      });
    });
    after(() => {
      heist.entryCooldownInSeconds = 120;
    });

    it('User start new bankheist with !bankheist 100', async () => {
      const r = await heist.main({
        sender: user.viewer, parameters: '100', command,
      });
      // if correct we don't expect any message
      assert.strictEqual(r.length, 0);
    });

    it(`No levels to check return`, async () => {
      heist.startedAt = 0;
      await heist.iCheckFinished();
      await message.debug('heist', 'no level to check');
    });
  });
});

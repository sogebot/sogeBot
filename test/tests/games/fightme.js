/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it before */

require('../../general.js');
const assert = require('assert');
const db = require('../../general.js').db;
const message = require('../../general.js').message;
const time = require('../../general.js').time;
const user = require('../../general.js').user;

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');
const { prepare } = require('../../../dest/helpers/commons/prepare');

const fightme = (require('../../../dest/games/fightme')).default;
const translate = require('../../../dest/translate').translate;

const command = '!fightme';

const tests = [
  {
    challenger: { userId: 3, username: 'user1' },
    challenging: { username: '' },
    expected: 'gambling.fightme.notEnoughOptions',
  },
  {
    challenger: { userId: 3, username: 'user1' },
    challenging: { userId: 3, username: 'user1' },
    expected: 'gambling.fightme.cannotFightWithYourself',
  },
  {
    challenger: { userId: 3, username: 'user1' },
    challenging: { userId: 4, username: 'user2' },
    expected: 'gambling.fightme.winner',
  },
  {
    challenger: { userId: 5, username: 'broadcaster' },
    challenging: { userId: 3, username: 'user1' },
    expected: 'gambling.fightme.broadcaster',
  },
  {
    challenger: { userId: 3, username: 'user1' },
    challenging: { userId: 5, username: 'broadcaster' },
    expected: 'gambling.fightme.broadcaster',
  },
  {
    challenger: { userId: 1, username: 'usermod1' },
    challenging: { userId: 4, username: 'user2' },
    expected: 'gambling.fightme.oneModerator',
  },
  {
    challenger: { userId: 3, username: 'user1' },
    challenging: { userId: 2, username: 'usermod2' },
    expected: 'gambling.fightme.oneModerator',
  },
  {
    challenger: { userId: 1, username: 'usermod1' },
    challenging: { userId: 2, username: 'usermod2' },
    expected: 'gambling.fightme.bothModerators',
  },
];

describe('game/fightme - !fightme - @func2', () => {
  describe('Challenge should be removed after a while', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await getRepository(User).save({ userId: 10, username: 'user10' });
      await getRepository(User).save({ userId: 11, username: 'user11' });
    });

    it('Challenger is starting !fightme', async () => {
      await fightme.main({ command, sender: { userId: 10, username: 'user10' }, parameters: 'user11' });
    });

    it('Challenge should be saved', () => {
      const fightMeChallenges = (require('../../../dest/games/fightme')).fightMeChallenges;
      assert.strictEqual(fightMeChallenges.length, 1);
    });

    it('We need to wait at least 2.5 minutes', async() =>{
      const steps = 100;
      process.stdout.write(`\t... waiting ${(60 * 2.5)}s ...                `);
      for (let i = 0; i < steps; i++) {
        await time.waitMs((60000 * 2.5) / steps);
        process.stdout.write(`\r\t... waiting ${(60 * 2.5) - (((60 * 2.5) / steps) * i)}s ...                `);
      }
    }).timeout(60000 * 3);

    it('Challenges should be empty', () => {
      const fightMeChallenges = (require('../../../dest/games/fightme')).fightMeChallenges;
      assert.strictEqual(fightMeChallenges.length, 0);
    });
  });

  describe('Doubled challenge should not add to challenge, but refresh time', () => {
    let removeAt = 0;

    before(async () => {
      await db.cleanup();
      await message.prepare();
      await getRepository(User).save({ userId: 10, username: 'user10' });
      await getRepository(User).save({ userId: 11, username: 'user11' });
    });

    it('Challenger is starting !fightme', async () => {
      await fightme.main({ command, sender: { userId: 10, username: 'user10' }, parameters: 'user11' });
    });

    it('Challenge should be saved', () => {
      const fightMeChallenges = (require('../../../dest/games/fightme')).fightMeChallenges;
      assert.strictEqual(fightMeChallenges.length, 1);
      removeAt = fightMeChallenges[0].removeAt;
    });

    it('Challenger is starting !fightme again ', async () => {
      await fightme.main({ command, sender: { userId: 10, username: 'user10' }, parameters: 'user11' });
    });

    it('We are not expecting additional challenge', () => {
      const fightMeChallenges = (require('../../../dest/games/fightme')).fightMeChallenges;
      assert.strictEqual(fightMeChallenges.length, 1);
    });

    it('We are expecting updated removeAt time', () => {
      const fightMeChallenges = (require('../../../dest/games/fightme')).fightMeChallenges;
      assert.notStrictEqual(fightMeChallenges[0].removeAt, removeAt);
    });
  });

  for (const test of tests) {
    describe(`challenger: ${test.challenger.username} | challenging: ${test.challenging.username} => ${test.expected}`, async () => {
      let responses = [];
      before(async () => {
        await db.cleanup();
        await message.prepare();

        await getRepository(User).save({ userId: 1, username: 'usermod1', isModerator: true });
        await getRepository(User).save({ userId: 2, username: 'usermod2', isModerator: true });
        await getRepository(User).save({ userId: 3, username: 'user1' });
        await getRepository(User).save({ userId: 4, username: 'user2' });
        await getRepository(User).save({ userId: 5, username: 'broadcaster' });
      });

      it('Challenger is starting !fightme', async () => {
        responses = await fightme.main({ command, sender: test.challenger, parameters: test.challenging.username });
      });
      if (test.challenging.username.length === 0 || test.challenging.username === test.challenger.username) {
        it(`Expecting ${test.expected}`, async () => {
          assert.strictEqual(responses[0].response, translate(test.expected), JSON.stringify({responses}));
        });
      } else {
        it('Expecting gambling.fightme.challenge', async () => {
          assert.strictEqual(responses[0].response, prepare('gambling.fightme.challenge', { username: test.challenging.username, command, sender: test.challenger.username }), JSON.stringify({responses}));
        });
        it('Challenged user is responding !fightme', async () => {
          responses = await fightme.main({ command, sender: test.challenging, parameters: test.challenger.username });
        });
        it(`Expecting ${test.expected}`, async () => {
          const firstMessage = prepare(test.expected, { winner: test.challenging.username, loser: test.challenger.username, challenger: test.challenging.username });
          const secondMessage = prepare(test.expected, { winner: test.challenger.username, loser: test.challenging.username, challenger: test.challenger.username });
          assert(responses[0].response === firstMessage || responses[0].response === secondMessage, JSON.stringify({responses}));
        });
      }
    });
  }

  describe('FightMe is on cooldown without bypass by mods', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
    });
    after(() => {
      fightme.cooldown = 0;
    });

    it('set cooldown to 10 minutes', async () => {
      fightme.cooldown = 600;
    });

    it('set manually internal cooldown to 0', async () => {
      fightme._cooldown = 0;
    });

    it('user 1 is challenging and should be OK', async () => {
      const responses = await fightme.main({ command, sender: user.viewer, parameters: user.viewer2.username });
      assert(responses[0].response.includes('@__viewer__ wants to fight you @__viewer2__! If you accept, send !fightme @__viewer__'), JSON.stringify({responses}));
    });

    it('user 2 is challenging and should be on cooldown', async () => {
      const responses = await fightme.main({ command, sender: user.viewer2, parameters: user.mod.username });
      assert(responses[0].response === '$sender, you cannot use !fightme for 10 minutes.', JSON.stringify({responses}));
    });

    it('user 2 accepting user 1 fight me, should be OK', async () => {
      const responses = await fightme.main({ command, sender: user.viewer2, parameters: user.viewer.username });
      assert(responses[0].response.includes('is proud winner'), JSON.stringify({responses}));
    });
  });

  describe('FightMe is on cooldown without bypass by mods', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
    });
    after(() => {
      fightme.cooldown = 0;
    });

    it('set cooldown to 10 minutes', async () => {
      fightme.cooldown = 600;
    });

    it('set manually internal cooldown', async () => {
      fightme._cooldown = Date.now();
    });

    it('user 1 is challenging and should be on cooldown', async () => {
      const responses = await fightme.main({ command, sender: user.viewer, parameters: user.viewer2.username });
      assert(responses[0].response === '$sender, you cannot use !fightme for 10 minutes.', JSON.stringify({responses}));
    });

    it('owner is challenging and should be on cooldown', async () => {
      const responses = await fightme.main({ command, sender: user.owner, parameters: user.viewer2.username });
      assert(responses[0].response === '$sender, you cannot use !fightme for 10 minutes.', JSON.stringify({responses}));
    });

    it('mod is challenging and should be on cooldown', async () => {
      const responses = await fightme.main({ command, sender: user.mod, parameters: user.viewer2.username });
      assert(responses[0].response === '$sender, you cannot use !fightme for 10 minutes.', JSON.stringify({responses}));
    });
  });

  describe('FightMe is on cooldown without bypass by mods', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
    });
    after(async () => {
      fightme.cooldown = 0;
      fightme.bypassCooldownByOwnerAndMods = false;
    });

    it('set cooldown to 10 minutes', async () => {
      fightme.cooldown = 600;
    });

    it('set bypass by mods and owner', async () => {
      fightme.bypassCooldownByOwnerAndMods = true;
    });

    it('set manually internal cooldown', async () => {
      fightme._cooldown = Date.now();
    });

    it('set fightme timestamp to 0 to force new fightme', async () => {
      fightme._timestamp = 0;
    });

    it('user 1 is challenging and should be on cooldown', async () => {
      const responses = await fightme.main({ command, sender: user.viewer, parameters: user.viewer2.username });
      assert(responses[0].response === '$sender, you cannot use !fightme for 10 minutes.', JSON.stringify({responses}));
    });

    it('owner is challenging and should not be on cooldown', async () => {
      const responses = await fightme.main({ command, sender: user.owner, parameters: user.viewer2.username });
      assert(responses[0].response.includes('@__broadcaster__ wants to fight you @__viewer2__! If you accept, send !fightme @__broadcaster__'), JSON.stringify({responses}));
    });

    it('reset fightme', async () => {
      fightme._timestamp = 0;
      fightme._cooldown = Date.now();
    });

    it('mod is challenging and should not be on cooldown', async () => {
      const responses = await fightme.main({ command, sender: user.mod, parameters: user.viewer2.username });
      assert(responses[0].response.includes('@__mod__ wants to fight you @__viewer2__! If you accept, send !fightme @__mod__'), JSON.stringify({responses}));
    });
  });
});


/* global */

import('../../general.js');

import assert from 'assert';

import _ from 'lodash-es';
import { AppDataSource } from '../../../dest/database.js';

import { User } from '../../../dest/database/entity/user.js';
import roulette from '../../../dest/games/roulette.js';
import * as changelog from '../../../dest/helpers/user/changelog.js';
import points from '../../../dest/systems/points.js';
import { db, message, user } from '../../general.js';

const tests = [
  { user: { userName: 'user1', userId: String(_.random(999999, false)) } },
  { user: user.owner },
  { user: user.mod },
];

describe('game/roulette - !roulette - @func3', () => {
  for (const test of tests) {
    describe(`${test.user.userName} uses !roulette`, async () => {
      let r;
      before(async () => {
        await db.cleanup();
        await message.prepare();
        await user.prepare();
      });

      it(`${test.user.userName} starts roulette`, async () => {
        r = await roulette.main({ sender: test.user });
      });

      if (user.mod.userName === test.user.userName) {
        it('Expecting mod message', async () => {
          assert(r[1].response === '$sender is incompetent and completely missed his head!', JSON.stringify({ r }, null, 2));
        });
      } else if (user.owner.userName === test.user.userName) {
        it('Expecting owner message', async () => {
          assert(r[1].response === '$sender is using blanks, boo!', JSON.stringify({ r }, null, 2));
        });
      } else {
        it('Expecting win or lose', async () => {
          const msg1 = '$sender is alive! Nothing happened.';
          const msg2 = '$sender\'s brain was splashed on the wall!';
          assert(r[1].response === msg1 || r[1].response === msg2, JSON.stringify({
            r, msg1, msg2,
          }, null, 2));
        });
      }
    });
  }

  describe('/t/seppuku-and-roulette-points-can-be-negated/36', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await AppDataSource.getRepository(User).save(tests[0].user);
    });

    it(`set lose value to 100`, () => {
      roulette.loserWillLose = 100;
    });

    it(`User starts roulette and we are waiting for lose`, async () => {
      let isAlive = true;
      let r;
      while(isAlive) {
        r = await roulette.main({ sender: tests[0].user });
        isAlive = r[1].isAlive;
      }
      const msg1 = '$sender\'s brain was splashed on the wall!';
      assert(r[1].response === msg1, JSON.stringify({ r, msg1 }));
    });

    it(`User should not have negative points`, async () => {
      await changelog.flush();
      const user1 = await AppDataSource.getRepository(User).findOneBy({ userId: tests[0].user.userId });
      assert.strictEqual(user1.points, 0);
    });
  });

  describe('game/roulette - winnerWillGet, loserWillLose', () => {
    describe(`Winner should get points`, async () => {
      before(async () => {
        await db.cleanup();
        await message.prepare();
        await user.prepare();
        roulette.winnerWillGet = 100;
      });
      after(() => {
        roulette.winnerWillGet = 0;
      });

      it(`${user.viewer.userName} starts roulettes and we wait for win`, async () => {
        let r = '';
        while (r !== '$sender is alive! Nothing happened.') {
          const responses = await roulette.main({ sender: user.viewer });
          r = responses[1].response;
        }
      });

      it('User should get 100 points from win', async () => {
        assert.strictEqual(await points.getPointsOf(user.viewer.userId), 100);
      });
    });

    describe(`Loser should lose points`, async () => {
      before(async () => {
        await db.cleanup();
        await message.prepare();
        await user.prepare();
        roulette.loserWillLose = 100;
        await AppDataSource.getRepository(User).save({
          userId: user.viewer.userId, userName: user.viewer.userName, points: 100,
        });
      });
      after(() => {
        roulette.loserWillLose = 0;
      });

      it(`${user.viewer.userName} starts roulettes and we wait for lose`, async () => {
        let r = '';
        while (r !== '$sender\'s brain was splashed on the wall!') {
          const responses = await roulette.main({ sender: user.viewer });
          r = responses[1].response;
        }
      });

      it('User should lose 100 points from win', async () => {
        assert.strictEqual(await points.getPointsOf(user.viewer.userId), 0);
      });
    });
  });
});

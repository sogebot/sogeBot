import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js';

import('../../general.js');
const currency = (await import('../../../dest/currency.js')).default;
import { Permissions, PermissionCommands } from '../../../dest/database/entity/permissions.js';
import { User, UserBit, UserTip } from '../../../dest/database/entity/user.js';
import rates from '../../../dest/helpers/currency/rates.js';
import { defaultPermissions } from '../../../dest/helpers/permissions/defaultPermissions.js';
import { check } from '../../../dest/helpers/permissions/check.js';
import { serialize } from '../../../dest/helpers/type.js';
import { Parser } from '../../../dest/parser.js';
import { db } from '../../general.js';
import { message } from '../../general.js';

const users = [
  {
    userName: '__owner__', userId: String(1), id: 1,
  },
  {
    userName: '__moderator__', userId: String(2), id: 2, isModerator: true, badges: { moderator: true },
  },
  {
    userName: '__subscriber__', userId: String(3), id: 3, isSubscriber: true,
  },
  {
    userName: '__vip__', userId: String(4), id: 4, isVIP: true, badges: { vip: true },
  },
  {
    userName: '__viewer__', userId: String(6), id: 6,
  },
  {
    userName: '__viewer_points__', userId: String(7), id: 7, points: 100,
  },
  {
    userName: '__viewer_watched__', userId: String(8), id: 8, watchedTime: 100 * (60 * 60 * 1000 /*hours*/),
  },
  {
    userName: '__viewer_tips__', userId:   String(9), id:       9, tips:     [{
      userId: String(9), exchangeRates: rates, currency: 'EUR', amount: 100, sortAmount: 100, timestamp: Math.random(), message: '',
    }],
  },
  {
    userName: '__viewer_bits__', userId:   String(10), id:       10, bits:     [{
      amount: 100, timestamp: Math.random(), message: '', userId: String(10),
    }],
  },
  {
    userName: '__viewer_messages__', userId: String(11), id: 11, messages: 100,
  },
  {
    userName: '__viewer_subtier__', userId: String(12), id: 12, subscribeTier: 2,
  },
  {
    userName: '__viewer_subcumulativemonths__', userId: String(13), id: 13, subscribeCumulativeMonths: 2,
  },
  {
    userName: '__viewer_substreakmonths__', userId: String(14), id: 14, subscribeStreak: 2,
  },
  {
    userName: '__viewer_customrank__', userId: String(15), id: 15, haveCustomRank: true, rank: 'Lorem Ipsum',
  },
  {
    userName: '__viewer_level5__', userId: String(16), id: 16, extra: { levels: { xp: serialize(BigInt(5000)) } },
  },
];

describe('Permissions - check() - @func1', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();

    for (const u of users) {
      if (typeof u.tips !== 'undefined') {
        await AppDataSource.getRepository(UserTip).save(u.tips);
      }
      if (typeof u.bits !== 'undefined') {
        await AppDataSource.getRepository(UserBit).save(u.bits);
      }
      await AppDataSource.getRepository(User).save(u);
    }
  });

  for (let i = 0, keys = Object.keys(defaultPermissions); i < keys.length; i++) {
    describe(`Permission ${keys[i]}`, () => {
      for (let j = 0; j < users.length; j++) {
        const user = users[j];
        const pHash = defaultPermissions[keys[i]];
        if (i >= j || (keys[i] === 'VIEWERS' && user.userName.includes('viewer'))) {
          // have access
          it(`+++ ${users[j].userName} should have access to ${keys[i]}`, async () => {
            const _check = await check(user.userId, pHash);
            assert.strictEqual(_check.access, true);
          });
        } else {
          // no access
          it(`--- ${users[j].userName} should NOT have access to ${keys[i]}`, async () => {
            const _check = await check(user.userId, pHash);
            assert.strictEqual(_check.access, false);
          });
        }
      }
    });
  }

  describe(`Permission only for __viewer__ userId`, () => {
    beforeEach(async () => {
      await AppDataSource.getRepository(Permissions).save({
        id:                 'bbaac669-923f-4063-99e3-f8004b34dac3',
        name:               '__viewer__only',
        order:              Object.keys(defaultPermissions).length + 1,
        isCorePermission:   false,
        isWaterfallAllowed: false,
        automation:         'none',
        userIds:            [6],
        excludeUserIds:     [],
        filters:            [],
      });
    });
    for (let j = 0; j < users.length; j++) {
      const user = users[j];
      const pHash = 'bbaac669-923f-4063-99e3-f8004b34dac3';
      if (user.userName === '__viewer__') {
        // have access
        it(`+++ ${users[j].userName} should have access to __viewer__only`, async () => {
          const _check = await check(user.userId, pHash);
          assert.strictEqual(_check.access, true);
        });
      } else {
        // no access
        it(`--- ${users[j].userName} should NOT have access to __viewer__only`, async () => {
          const _check = await check(user.userId, pHash);
          assert.strictEqual(_check.access, false);
        });
      }
    }
  });

  describe(`Permission only for user with 100 points (__viewer_points__)`, () => {
    beforeEach(async () => {
      await AppDataSource.getRepository(Permissions).save({
        id:                 'bbaac669-923f-4063-99e3-f8004b34dac3',
        name:               '__viewer_points__only',
        order:              Object.keys(defaultPermissions).length + 1,
        isCorePermission:   false,
        isWaterfallAllowed: false,
        automation:         'viewers',
        userIds:            [],
        excludeUserIds:     [],
        filters:            [{
          comparator: '==', type: 'points', value: 100,
        }],
      });
    });
    for (let j = 0; j < users.length; j++) {
      const user = users[j];
      const pHash = 'bbaac669-923f-4063-99e3-f8004b34dac3';
      if (user.userName === '__viewer_points__') {
        // have access
        it(`+++ ${users[j].userName} should have access to __viewer_points__only`, async () => {
          const _check = await check(user.userId, pHash);
          assert.strictEqual(_check.access, true);
        });
      } else {
        // no access
        it(`--- ${users[j].userName} should NOT have access to __viewer_points__only`, async () => {
          const _check = await check(user.userId, pHash);
          assert.strictEqual(_check.access, false);
        });
      }
    }
  });

  describe(`Permission only for user with 100h watched (__viewer_watched__)`, () => {
    beforeEach(async () => {
      await AppDataSource.getRepository(Permissions).save({
        id:                 'bbaac669-923f-4063-99e3-f8004b34dac3',
        name:               '__viewer_watched__only',
        order:              Object.keys(defaultPermissions).length + 1,
        isCorePermission:   false,
        isWaterfallAllowed: false,
        automation:         'viewers',
        userIds:            [],
        excludeUserIds:     [],
        filters:            [{
          comparator: '==', type: 'watched', value: 100,
        }],
      });
    });
    for (let j = 0; j < users.length; j++) {
      const user = users[j];
      const pHash = 'bbaac669-923f-4063-99e3-f8004b34dac3';
      if (user.userName === '__viewer_watched__') {
        // have access
        it(`+++ ${users[j].userName} should have access to __viewer_watched__only`, async () => {
          const _check = await check(user.userId, pHash);
          assert.strictEqual(_check.access, true);
        });
      } else {
        // no access
        it(`--- ${users[j].userName} should NOT have access to __viewer_watched__only`, async () => {
          const _check = await check(user.userId, pHash);
          assert.strictEqual(_check.access, false);
        });
      }
    }
  });

  describe(`Permission only for user with 100 tips (__viewer_tips__)`, () => {
    beforeEach(async () => {
      await AppDataSource.getRepository(Permissions).save({
        id:                 'bbaac669-923f-4063-99e3-f8004b34dac3',
        name:               '__viewer_tips__only',
        order:              Object.keys(defaultPermissions).length + 1,
        isCorePermission:   false,
        isWaterfallAllowed: false,
        automation:         'viewers',
        userIds:            [],
        excludeUserIds:     [],
        filters:            [{
          comparator: '>=', type: 'tips', value: 100,
        }],
      });
    });
    for (let j = 0; j < users.length; j++) {
      const user = users[j];
      const pHash = 'bbaac669-923f-4063-99e3-f8004b34dac3';
      if (user.userName === '__viewer_tips__') {
        // have access
        it(`+++ ${users[j].userName} should have access to __viewer_tips__only`, async () => {
          const _check = await check(user.userId, pHash);
          assert.strictEqual(_check.access, true);
        });
      } else {
        // no access
        it(`--- ${users[j].userName} should NOT have access to __viewer_tips__only`, async () => {
          const _check = await check(user.userId, pHash);
          assert.strictEqual(_check.access, false);
        });
      }
    }
  });

  describe(`Permission only for user with 100 bits (__viewer_bits__)`, () => {
    beforeEach(async () => {
      await AppDataSource.getRepository(Permissions).save({
        id:                 'bbaac669-923f-4063-99e3-f8004b34dac3',
        name:               '__viewer_bits__only',
        order:              Object.keys(defaultPermissions).length + 1,
        isCorePermission:   false,
        isWaterfallAllowed: false,
        automation:         'viewers',
        userIds:            [],
        excludeUserIds:     [],
        filters:            [{
          comparator: '>=', type: 'bits', value: 100,
        }],
      });
    });
    for (let j = 0; j < users.length; j++) {
      const user = users[j];
      const pHash = 'bbaac669-923f-4063-99e3-f8004b34dac3';
      if (user.userName === '__viewer_bits__') {
        // have access
        it(`+++ ${users[j].userName} should have access to __viewer_bits__only`, async () => {
          const _check = await check(user.userId, pHash);
          assert.strictEqual(_check.access, true);
        });
      } else {
        // no access
        it(`--- ${users[j].userName} should NOT have access to __viewer_bits__only`, async () => {
          const _check = await check(user.userId, pHash);
          assert.strictEqual(_check.access, false);
        });
      }
    }
  });

  describe(`Permission only for user with 100 messages (__viewer_messages__)`, () => {
    beforeEach(async () => {
      await AppDataSource.getRepository(Permissions).save({
        id:                 'bbaac669-923f-4063-99e3-f8004b34dac3',
        name:               '__viewer_messages__only',
        order:              Object.keys(defaultPermissions).length + 1,
        isCorePermission:   false,
        isWaterfallAllowed: false,
        automation:         'viewers',
        userIds:            [],
        excludeUserIds:     [],
        filters:            [{
          comparator: '>=', type: 'messages', value: 100,
        }],
      });
    });
    for (let j = 0; j < users.length; j++) {
      const user = users[j];
      const pHash = 'bbaac669-923f-4063-99e3-f8004b34dac3';
      if (user.userName === '__viewer_messages__') {
        // have access
        it(`+++ ${users[j].userName} should have access to __viewer_messages__only`, async () => {
          const _check = await check(user.userId, pHash);
          assert.strictEqual(_check.access, true);
        });
      } else {
        // no access
        it(`--- ${users[j].userName} should NOT have access to __viewer_messages__only`, async () => {
          const _check = await check(user.userId, pHash);
          assert.strictEqual(_check.access, false);
        });
      }
    }
  });

  describe(`Permission only for user with 2 subtier (__viewer_subtier__)`, () => {
    beforeEach(async () => {
      await AppDataSource.getRepository(Permissions).save({
        id:                 'bbaac669-923f-4063-99e3-f8004b34dac3',
        name:               '__viewer_subtier__only',
        order:              Object.keys(defaultPermissions).length + 1,
        isCorePermission:   false,
        isWaterfallAllowed: false,
        automation:         'viewers',
        userIds:            [],
        excludeUserIds:     [],
        filters:            [{
          comparator: '>=', type: 'subtier', value: 2,
        }],
      });
    });
    for (let j = 0; j < users.length; j++) {
      const user = users[j];
      const pHash = 'bbaac669-923f-4063-99e3-f8004b34dac3';
      if (user.userName === '__viewer_subtier__') {
        // have access
        it(`+++ ${users[j].userName} should have access to __viewer_subtier__only`, async () => {
          const _check = await check(user.userId, pHash);
          assert.strictEqual(_check.access, true);
        });
      } else {
        // no access
        it(`--- ${users[j].userName} should NOT have access to __viewer_subtier__only`, async () => {
          const _check = await check(user.userId, pHash);
          assert.strictEqual(_check.access, false);
        });
      }
    }
  });

  describe(`Permission only for user with 2 subcumulativemonths (__viewer_subcumulativemonths__)`, () => {
    beforeEach(async () => {
      await AppDataSource.getRepository(Permissions).save({
        id:                 'bbaac669-923f-4063-99e3-f8004b34dac3',
        name:               '__viewer_subcumulativemonths__only',
        order:              Object.keys(defaultPermissions).length + 1,
        isCorePermission:   false,
        isWaterfallAllowed: false,
        automation:         'viewers',
        userIds:            [],
        excludeUserIds:     [],
        filters:            [{
          comparator: '>=', type: 'subcumulativemonths', value: 2,
        }],
      });
    });
    for (let j = 0; j < users.length; j++) {
      const user = users[j];
      const pHash = 'bbaac669-923f-4063-99e3-f8004b34dac3';
      if (user.userName === '__viewer_subcumulativemonths__') {
        // have access
        it(`+++ ${users[j].userName} should have access to __viewer_subcumulativemonths__only`, async () => {
          const _check = await check(user.userId, pHash);
          assert.strictEqual(_check.access, true);
        });
      } else {
        // no access
        it(`--- ${users[j].userName} should NOT have access to __viewer_subcumulativemonths__only`, async () => {
          const _check = await check(user.userId, pHash);
          assert.strictEqual(_check.access, false);
        });
      }
    }
  });

  describe(`Permission only for user with 2 substreakmonths (__viewer_substreakmonths__)`, () => {
    beforeEach(async () => {
      await AppDataSource.getRepository(Permissions).save({
        id:                 'bbaac669-923f-4063-99e3-f8004b34dac3',
        name:               '__viewer_substreakmonths__only',
        order:              Object.keys(defaultPermissions).length + 1,
        isCorePermission:   false,
        isWaterfallAllowed: false,
        automation:         'viewers',
        userIds:            [],
        excludeUserIds:     [],
        filters:            [{
          comparator: '>=', type: 'substreakmonths', value: 2,
        }],
      });
    });
    for (let j = 0; j < users.length; j++) {
      const user = users[j];
      const pHash = 'bbaac669-923f-4063-99e3-f8004b34dac3';
      if (user.userName === '__viewer_substreakmonths__') {
        // have access
        it(`+++ ${users[j].userName} should have access to __viewer_substreakmonths__only`, async () => {
          const _check = await check(user.userId, pHash);
          assert.strictEqual(_check.access, true);
        });
      } else {
        // no access
        it(`--- ${users[j].userName} should NOT have access to __viewer_substreakmonths__only`, async () => {
          const _check = await check(user.userId, pHash);
          assert.strictEqual(_check.access, false);
        });
      }
    }
  });

  describe(`Permission only for user with rank Lorem Ipsum (__viewer_customrank__)`, () => {
    beforeEach(async () => {
      await AppDataSource.getRepository(Permissions).save({
        id:                 'bbaac669-923f-4063-99e3-f9904b34dac3',
        name:               '__viewer_customrank__only',
        order:              Object.keys(defaultPermissions).length + 1,
        isCorePermission:   false,
        isWaterfallAllowed: false,
        automation:         'viewers',
        userIds:            [],
        excludeUserIds:     [],
        filters:            [{
          comparator: '==', type: 'ranks', value: 'Lorem Ipsum',
        }],
      });
    });
    for (let j = 0; j < users.length; j++) {
      const user = users[j];
      const pHash = 'bbaac669-923f-4063-99e3-f9904b34dac3';
      if (user.userName === '__viewer_customrank__') {
        // have access
        it(`+++ ${users[j].userName} should have access to __viewer_customrank__only`, async () => {
          const _check = await check(user.userId, pHash);
          assert.strictEqual(_check.access, true);
        });
      } else {
        // no access
        it(`--- ${users[j].userName} should NOT have access to __viewer_customrank__only`, async () => {
          const _check = await check(user.userId, pHash);
          assert.strictEqual(_check.access, false);
        });
      }
    }
  });

  describe(`Permission only for user with level 5 (__viewer_level5__)`, () => {
    beforeEach(async () => {
      await AppDataSource.getRepository(Permissions).save({
        id:                 'bbaac999-923f-4063-99e3-f9904b34dac3',
        name:               '__viewer_level5__only',
        order:              Object.keys(defaultPermissions).length + 1,
        isCorePermission:   false,
        isWaterfallAllowed: false,
        automation:         'viewers',
        userIds:            [],
        excludeUserIds:     [],
        filters:            [{
          comparator: '==', type: 'level', value: 5,
        }],
      });
    });
    for (let j = 0; j < users.length; j++) {
      const user = users[j];
      const pHash = 'bbaac999-923f-4063-99e3-f9904b34dac3';
      if (user.userName === '__viewer_level5__') {
        // have access
        it(`+++ ${users[j].userName} should have access to __viewer_level5__only`, async () => {
          const _check = await check(user.userId, pHash);
          assert.strictEqual(_check.access, true);
        });
      } else {
        // no access
        it(`--- ${users[j].userName} should NOT have access to __viewer_level5__only`, async () => {
          const _check = await check(user.userId, pHash);
          assert.strictEqual(_check.access, false);
        });
      }
    }
  });
  describe(`Enabled !me command should work`, () => {
    beforeEach(async () => {
      await AppDataSource.getRepository(PermissionCommands).clear();
    });
    for (let j = 0; j < users.length; j++) {
      it (`--- ${users[j].userName} should trigger command !me`, async () => {
        const parse = new Parser({
          sender: users[j], message: '!me', skip: false, quiet: false,
        });
        const r = await parse.process();

        let hours = '0';
        let level = 'Level 0';
        let points = '0';
        let messages = '0';
        let tips = '0.00';
        let bits = '0';
        let months = '0';
        let rank = '';
        if (users[j].userName === '__viewer_points__') {
          points = '100';
        }
        if (users[j].userName === '__viewer_watched__') {
          hours = '100';
        }
        if (users[j].userName === '__viewer_tips__') {
          tips = '100.00';
        }
        if (users[j].userName === '__viewer_bits__') {
          bits = '100';
        }
        if (users[j].userName === '__viewer_messages__') {
          messages = '100';
        }
        if (users[j].userName === '__viewer_customrank__') {
          rank = 'Lorem Ipsum | ';
        }
        if (users[j].userName === '__viewer_level5__') {
          level = 'Level 5';
        }
        if (users[j].userName === '__viewer_subcumulativemonths__') {
          months = '2';
        }
        assert.strictEqual(r[0].response, `$sender | ${level} | ${rank}${hours} hours | ${points} points | ${messages} messages | €${tips} | ${bits} bits | ${months} months`);
      });
    }
  });

  describe(`Disabled !me command should not work`, () => {
    beforeEach(async () => {
      await AppDataSource.getRepository(PermissionCommands).save({
        name:       '!me',
        permission: null,
      });
    });
    after(async () => {
      await AppDataSource.getRepository(PermissionCommands).clear();
    });
    for (let j = 0; j < users.length; j++) {
      it (`--- ${users[j].userName} should NOT trigger disabled command !me`, async () => {
        const parse = new Parser({
          sender: users[j], message: '!me', skip: false, quiet: false,
        });
        const r = await parse.process();
        assert.strictEqual(r.length, 0);
      });
    }
  });
});

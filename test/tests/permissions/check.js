/* global describe it beforeEach */

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const assert = require('assert');

const { permission } = require('../../../dest/helpers/permissions');
const permissions = (require('../../../dest/permissions')).default;
const Parser = require('../../../dest/parser').default;
const currency = require('../../../dest/currency').default;

const { getRepository } = require('typeorm');
const { Permissions, PermissionCommands } = require('../../../dest/database/entity/permissions');
const { User } = require('../../../dest/database/entity/user');

const users = [
  { username: '__owner__', userId: 1, id: 1 },
  { username: '__moderator__', userId: 2, id: 2, isModerator: true, badges: { moderator: true } },
  { username: '__subscriber__', userId: 3, id: 3, isSubscriber: true },
  { username: '__vip__', userId: 4, id: 4, isVIP: true, badges: { vip: true } },
  { username: '__follower__', userId: 5, id: 5, isFollower: true },
  { username: '__viewer__', userId: 6, id: 6 },
  { username: '__viewer_points__', userId: 7, id: 7, points: 100 },
  { username: '__viewer_watched__', userId: 8, id: 8, watchedTime: 100 * (60 * 60 * 1000 /*hours*/) },
  { username: '__viewer_tips__', userId: 9, id: 9, tips: [{
    exchangeRates: currency.rates, currency: 'EUR', amount: 100, sortAmount: 100, timestamp: Math.random(), message: '',
  }] },
  { username: '__viewer_bits__', userId: 10, id: 10, bits: [{
    amount: 100, timestamp: Math.random(), message: '',
  }] },
  { username: '__viewer_messages__', userId: 11, id: 11, messages: 100 },
  { username: '__viewer_subtier__', userId: 12, id: 12, subscribeTier: 2 },
  { username: '__viewer_subcumulativemonths__', userId: 13, id: 13, subscribeCumulativeMonths: 2 },
  { username: '__viewer_substreakmonths__', userId: 14, id: 14, subscribeStreak: 2 },
];

describe('Permissions - check()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();

    for (const u of users) {
      await getRepository(User).save(u);
    }
  });

  for (let i = 0, keys = Object.keys(permission); i < keys.length; i++) {
    describe(`Permission ${keys[i]}`, () => {
      for (let j = 0; j < users.length; j++) {
        const user = users[j];
        const pHash = permission[keys[i]];
        if (i >= j || (keys[i] === 'VIEWERS' && user.username.includes('viewer'))) {
          // have access
          it(`+++ ${users[j].username} should have access to ${keys[i]}`, async () => {
            const check = await permissions.check(user.userId, pHash);
            assert.strictEqual(check.access, true);
          });
        } else {
          // no access
          it(`--- ${users[j].username} should NOT have access to ${keys[i]}`, async () => {
            const check = await permissions.check(user.userId, pHash);
            assert.strictEqual(check.access, false);
          });
        }
      }
    });
  }

  describe(`Permission only for __viewer__ userId`, () => {
    beforeEach(async () => {
      await getRepository(Permissions).save({
        id: 'bbaac669-923f-4063-99e3-f8004b34dac3',
        name: '__viewer__only',
        order: Object.keys(permission).length + 1,
        isCorePermission: false,
        isWaterfallAllowed: false,
        automation: 'none',
        userIds: [6],
        filters: [],
      });
    });
    for (let j = 0; j < users.length; j++) {
      const user = users[j];
      const pHash = 'bbaac669-923f-4063-99e3-f8004b34dac3';
      if (user.username === '__viewer__') {
        // have access
        it(`+++ ${users[j].username} should have access to __viewer__only`, async () => {
          const check = await permissions.check(user.userId, pHash);
          assert.strictEqual(check.access, true);
        });
      } else {
        // no access
        it(`--- ${users[j].username} should NOT have access to __viewer__only`, async () => {
          const check = await permissions.check(user.userId, pHash);
          assert.strictEqual(check.access, false);
        });
      }
    }
  });

  describe(`Permission only for user with 100 points (__viewer_points__)`, () => {
    beforeEach(async () => {
      await getRepository(Permissions).save({
        id: 'bbaac669-923f-4063-99e3-f8004b34dac3',
        name: '__viewer_points__only',
        order: Object.keys(permission).length + 1,
        isCorePermission: false,
        isWaterfallAllowed: false,
        automation: 'viewers',
        userIds: [],
        filters: [{
          comparator: '==', type: 'points', value: 100,
        }],
      });
    });
    for (let j = 0; j < users.length; j++) {
      const user = users[j];
      const pHash = 'bbaac669-923f-4063-99e3-f8004b34dac3';
      if (user.username === '__viewer_points__') {
        // have access
        it(`+++ ${users[j].username} should have access to __viewer_points__only`, async () => {
          const check = await permissions.check(user.userId, pHash);
          assert.strictEqual(check.access, true);
        });
      } else {
        // no access
        it(`--- ${users[j].username} should NOT have access to __viewer_points__only`, async () => {
          const check = await permissions.check(user.userId, pHash);
          assert.strictEqual(check.access, false);
        });
      }
    }
  });

  describe(`Permission only for user with 100h watched (__viewer_watched__)`, () => {
    beforeEach(async () => {
      await getRepository(Permissions).save({
        id: 'bbaac669-923f-4063-99e3-f8004b34dac3',
        name: '__viewer_watched__only',
        order: Object.keys(permission).length + 1,
        isCorePermission: false,
        isWaterfallAllowed: false,
        automation: 'viewers',
        userIds: [],
        filters: [{
          comparator: '==', type: 'watched', value: 100,
        }],
      });
    });
    for (let j = 0; j < users.length; j++) {
      const user = users[j];
      const pHash = 'bbaac669-923f-4063-99e3-f8004b34dac3';
      if (user.username === '__viewer_watched__') {
        // have access
        it(`+++ ${users[j].username} should have access to __viewer_watched__only`, async () => {
          const check = await permissions.check(user.userId, pHash);
          assert.strictEqual(check.access, true);
        });
      } else {
        // no access
        it(`--- ${users[j].username} should NOT have access to __viewer_watched__only`, async () => {
          const check = await permissions.check(user.userId, pHash);
          assert.strictEqual(check.access, false);
        });
      }
    }
  });

  describe(`Permission only for user with 100 tips (__viewer_tips__)`, () => {
    beforeEach(async () => {
      await getRepository(Permissions).save({
        id: 'bbaac669-923f-4063-99e3-f8004b34dac3',
        name: '__viewer_tips__only',
        order: Object.keys(permission).length + 1,
        isCorePermission: false,
        isWaterfallAllowed: false,
        automation: 'viewers',
        userIds: [],
        filters: [{
          comparator: '>=', type: 'tips', value: 100,
        }],
      });
    });
    for (let j = 0; j < users.length; j++) {
      const user = users[j];
      const pHash = 'bbaac669-923f-4063-99e3-f8004b34dac3';
      if (user.username === '__viewer_tips__') {
        // have access
        it(`+++ ${users[j].username} should have access to __viewer_tips__only`, async () => {
          const check = await permissions.check(user.userId, pHash);
          assert.strictEqual(check.access, true);
        });
      } else {
        // no access
        it(`--- ${users[j].username} should NOT have access to __viewer_tips__only`, async () => {
          const check = await permissions.check(user.userId, pHash);
          assert.strictEqual(check.access, false);
        });
      }
    }
  });

  describe(`Permission only for user with 100 bits (__viewer_bits__)`, () => {
    beforeEach(async () => {
      await getRepository(Permissions).save({
        id: 'bbaac669-923f-4063-99e3-f8004b34dac3',
        name: '__viewer_bits__only',
        order: Object.keys(permission).length + 1,
        isCorePermission: false,
        isWaterfallAllowed: false,
        automation: 'viewers',
        userIds: [],
        filters: [{
          comparator: '>=', type: 'bits', value: 100,
        }],
      });
    });
    for (let j = 0; j < users.length; j++) {
      const user = users[j];
      const pHash = 'bbaac669-923f-4063-99e3-f8004b34dac3';
      if (user.username === '__viewer_bits__') {
        // have access
        it(`+++ ${users[j].username} should have access to __viewer_bits__only`, async () => {
          const check = await permissions.check(user.userId, pHash);
          assert.strictEqual(check.access, true);
        });
      } else {
        // no access
        it(`--- ${users[j].username} should NOT have access to __viewer_bits__only`, async () => {
          const check = await permissions.check(user.userId, pHash);
          assert.strictEqual(check.access, false);
        });
      }
    }
  });

  describe(`Permission only for user with 100 messages (__viewer_messages__)`, () => {
    beforeEach(async () => {
      await getRepository(Permissions).save({
        id: 'bbaac669-923f-4063-99e3-f8004b34dac3',
        name: '__viewer_messages__only',
        order: Object.keys(permission).length + 1,
        isCorePermission: false,
        isWaterfallAllowed: false,
        automation: 'viewers',
        userIds: [],
        filters: [{
          comparator: '>=', type: 'messages', value: 100,
        }],
      });
    });
    for (let j = 0; j < users.length; j++) {
      const user = users[j];
      const pHash = 'bbaac669-923f-4063-99e3-f8004b34dac3';
      if (user.username === '__viewer_messages__') {
        // have access
        it(`+++ ${users[j].username} should have access to __viewer_messages__only`, async () => {
          const check = await permissions.check(user.userId, pHash);
          assert.strictEqual(check.access, true);
        });
      } else {
        // no access
        it(`--- ${users[j].username} should NOT have access to __viewer_messages__only`, async () => {
          const check = await permissions.check(user.userId, pHash);
          assert.strictEqual(check.access, false);
        });
      }
    }
  });

  describe(`Permission only for user with 2 subtier (__viewer_subtier__)`, () => {
    beforeEach(async () => {
      await getRepository(Permissions).save({
        id: 'bbaac669-923f-4063-99e3-f8004b34dac3',
        name: '__viewer_subtier__only',
        order: Object.keys(permission).length + 1,
        isCorePermission: false,
        isWaterfallAllowed: false,
        automation: 'viewers',
        userIds: [],
        filters: [{
          comparator: '>=', type: 'subtier', value: 2,
        }],
      });
    });
    for (let j = 0; j < users.length; j++) {
      const user = users[j];
      const pHash = 'bbaac669-923f-4063-99e3-f8004b34dac3';
      if (user.username === '__viewer_subtier__') {
        // have access
        it(`+++ ${users[j].username} should have access to __viewer_subtier__only`, async () => {
          const check = await permissions.check(user.userId, pHash);
          assert.strictEqual(check.access, true);
        });
      } else {
        // no access
        it(`--- ${users[j].username} should NOT have access to __viewer_subtier__only`, async () => {
          const check = await permissions.check(user.userId, pHash);
          assert.strictEqual(check.access, false);
        });
      }
    }
  });

  describe(`Permission only for user with 2 subcumulativemonths (__viewer_subcumulativemonths__)`, () => {
    beforeEach(async () => {
      await getRepository(Permissions).save({
        id: 'bbaac669-923f-4063-99e3-f8004b34dac3',
        name: '__viewer_subcumulativemonths__only',
        order: Object.keys(permission).length + 1,
        isCorePermission: false,
        isWaterfallAllowed: false,
        automation: 'viewers',
        userIds: [],
        filters: [{
          comparator: '>=', type: 'subcumulativemonths', value: 2,
        }],
      });
    });
    for (let j = 0; j < users.length; j++) {
      const user = users[j];
      const pHash = 'bbaac669-923f-4063-99e3-f8004b34dac3';
      if (user.username === '__viewer_subcumulativemonths__') {
        // have access
        it(`+++ ${users[j].username} should have access to __viewer_subcumulativemonths__only`, async () => {
          const check = await permissions.check(user.userId, pHash);
          assert.strictEqual(check.access, true);
        });
      } else {
        // no access
        it(`--- ${users[j].username} should NOT have access to __viewer_subcumulativemonths__only`, async () => {
          const check = await permissions.check(user.userId, pHash);
          assert.strictEqual(check.access, false);
        });
      }
    }
  });

  describe(`Permission only for user with 2 substreakmonths (__viewer_substreakmonths__)`, () => {
    beforeEach(async () => {
      await getRepository(Permissions).save({
        id: 'bbaac669-923f-4063-99e3-f8004b34dac3',
        name: '__viewer_substreakmonths__only',
        order: Object.keys(permission).length + 1,
        isCorePermission: false,
        isWaterfallAllowed: false,
        automation: 'viewers',
        userIds: [],
        filters: [{
          comparator: '>=', type: 'substreakmonths', value: 2,
        }],
      });
    });
    for (let j = 0; j < users.length; j++) {
      const user = users[j];
      const pHash = 'bbaac669-923f-4063-99e3-f8004b34dac3';
      if (user.username === '__viewer_substreakmonths__') {
        // have access
        it(`+++ ${users[j].username} should have access to __viewer_substreakmonths__only`, async () => {
          const check = await permissions.check(user.userId, pHash);
          assert.strictEqual(check.access, true);
        });
      } else {
        // no access
        it(`--- ${users[j].username} should NOT have access to __viewer_substreakmonths__only`, async () => {
          const check = await permissions.check(user.userId, pHash);
          assert.strictEqual(check.access, false);
        });
      }
    }
  });

  describe(`Enabled !me command should work`, () => {
    beforeEach(async () => {
      await getRepository(PermissionCommands).clear();
    });
    for (let j = 0; j < users.length; j++) {
      it (`--- ${users[j].username} should trigger command !me`, async () => {
        const parse = new Parser({ sender: users[j], message: '!me', skip: false, quiet: false });
        const r = await parse.process();

        let hours = '0.0';
        let points = '0';
        let messages = '0';
        let tips = '0.00';
        let bits = '0';
        if (users[j].username === '__viewer_points__') {
          points = '100';
        }
        if (users[j].username === '__viewer_watched__') {
          hours = '100.0';
        }
        if (users[j].username === '__viewer_tips__') {
          tips = '100.00';
        }
        if (users[j].username === '__viewer_bits__') {
          bits = '100';
        }
        if (users[j].username === '__viewer_messages__') {
          messages = '100';
        }
        assert.strictEqual(r[0].response, `$sender | ${hours}h | ${points} points | ${messages} messages | ${tips}€ | ${bits} bits`);
      });
    }
  });

  describe(`Disabled !me command should not work`, () => {
    beforeEach(async () => {
      await getRepository(PermissionCommands).save({
        name: '!me',
        permission: null,
      });
    });
    for (let j = 0; j < users.length; j++) {
      it (`--- ${users[j].username} should NOT trigger disabled command !me`, async () => {
        const parse = new Parser({ sender: users[j], message: '!me', skip: false, quiet: false });
        const r = await parse.process();
        assert.strictEqual(r.length, 0);
      });
    }
  });
});

/* global describe it beforeEach */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const time = require('../../general.js').time
const assert = require('assert')

const { permission } = require('../../../dest/permissions')
const Parser = require('../../../dest/parser')

const users = [
  { username: '__owner__', userId: 1, id: 1, stats: { subStreak: 0, subCumulativeMonths: 0 } },
  { username: '__moderator__', userId: 2, id: 2, is: { moderator: true }, badges: { moderator: true }, stats: { subStreak: 0, subCumulativeMonths: 0 } },
  { username: '__subscriber__', userId: 3, id: 3, is: { subscriber: true }, stats: { subStreak: 0, subCumulativeMonths: 0 } },
  { username: '__vip__', userId: 4, id: 4, is: { vip: true }, badges: { vip: true }, stats: { subStreak: 0, subCumulativeMonths: 0 } },
  { username: '__follower__', userId: 5, id: 5, is: { follower: true }, stats: { subStreak: 0, subCumulativeMonths: 0 } },
  { username: '__viewer__', userId: 6, id: 6, stats: { subStreak: 0, subCumulativeMonths: 0 } },
  { username: '__viewer_points__', userId: 7, id: 7, stats: { subStreak: 0, subCumulativeMonths: 0 } },
  { username: '__viewer_watched__', userId: 8, id: 8, stats: { subStreak: 0, subCumulativeMonths: 0 } },
  { username: '__viewer_tips__', userId: 9, id: 9, stats: { subStreak: 0, subCumulativeMonths: 0 } },
  { username: '__viewer_bits__', userId: 10, id: 10, stats: { subStreak: 0, subCumulativeMonths: 0 } },
  { username: '__viewer_messages__', userId: 11, id: 11, stats: { subStreak: 0, subCumulativeMonths: 0 } },
  { username: '__viewer_subtier__', userId: 12, id: 12, stats: { tier: 2, subStreak: 0, subCumulativeMonths: 0 } },
  { username: '__viewer_subcumulativemonths__', userId: 13, id: 13, stats: { subCumulativeMonths: 2, subStreak: 0 } },
  { username: '__viewer_substreakmonths__', userId: 14, id: 14, stats: { subStreak: 2, subCumulativeMonths: 0 } },
]

describe('Permissions - check()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()

    for (const u of users) {
      await global.db.engine.insert('users', u)
    }
    await global.db.engine.insert('users.points', { id: 7, points: 100 })
    await global.db.engine.insert('users.watched', { id: 8, watched: 100 * (60 * 60 * 1000 /*hours*/) })
    await global.db.engine.insert('users.tips', { id: 9, currency: 'EUR', amount: 100 })
    await global.db.engine.insert('users.bits', { id: 10, amount: 100 })
    await global.db.engine.insert('users.messages', { id: 11, messages: 100 })
  })

  for (let i = 0, keys = Object.keys(permission); i < keys.length; i++) {
    describe(`Permission ${keys[i]}`, () => {
      for (let j = 0; j < users.length; j++) {
        const user = users[j]
        const pHash = permission[keys[i]]
        if (i >= j || (keys[i] === 'VIEWERS' && user.username.includes('viewer'))) {
          // have access
          it(`+++ ${users[j].username} should have access to ${keys[i]}`, async () => {
            const check = await global.permissions.check(user.id, pHash)
            assert.strictEqual(check.access, true)
          })
        } else {
          // no access
          it(`--- ${users[j].username} should NOT have access to ${keys[i]}`, async () => {
            const check = await global.permissions.check(user.id, pHash)
            assert.strictEqual(check.access, false)
          })
        }
      }
    })
  }

  describe(`Permission only for __viewer__ userId`, () => {
    beforeEach(async () => {
      await global.db.engine.insert(global.permissions.collection.data, {
        id: '12345',
        name: '__viewer__only',
        order: Object.keys(permission).length + 1,
        isCorePermission: false,
        isWaterfallAllowed: false,
        automation: 'none',
        userIds: [6],
        filters: [],
      })
    })
    for (let j = 0; j < users.length; j++) {
      const user = users[j]
      const pHash = '12345'
      if (user.username === '__viewer__') {
        // have access
        it(`+++ ${users[j].username} should have access to __viewer__only`, async () => {
          const check = await global.permissions.check(user.id, pHash)
          assert.strictEqual(check.access, true)
        })
      } else {
        // no access
        it(`--- ${users[j].username} should NOT have access to __viewer__only`, async () => {
          const check = await global.permissions.check(user.id, pHash)
          assert.strictEqual(check.access, false)
        })
      }
    }
  })

  describe(`Permission only for user with 100 points (__viewer_points__)`, () => {
    beforeEach(async () => {
      await global.db.engine.insert(global.permissions.collection.data, {
        id: '12345',
        name: '__viewer_points__only',
        order: Object.keys(permission).length + 1,
        isCorePermission: false,
        isWaterfallAllowed: false,
        automation: 'viewers',
        userIds: [],
        filters: [{
          comparator: '==', type: 'points', value: 100
        }],
      })
    })
    for (let j = 0; j < users.length; j++) {
      const user = users[j]
      const pHash = '12345'
      if (user.username === '__viewer_points__') {
        // have access
        it(`+++ ${users[j].username} should have access to __viewer_points__only`, async () => {
          const check = await global.permissions.check(user.id, pHash)
          assert.strictEqual(check.access, true)
        })
      } else {
        // no access
        it(`--- ${users[j].username} should NOT have access to __viewer_points__only`, async () => {
          const check = await global.permissions.check(user.id, pHash)
          assert.strictEqual(check.access, false)
        })
      }
    }
  })

  describe(`Permission only for user with 100h watched (__viewer_watched__)`, () => {
    beforeEach(async () => {
      await global.db.engine.insert(global.permissions.collection.data, {
        id: '12345',
        name: '__viewer_watched__only',
        order: Object.keys(permission).length + 1,
        isCorePermission: false,
        isWaterfallAllowed: false,
        automation: 'viewers',
        userIds: [],
        filters: [{
          comparator: '==', type: 'watched', value: 100
        }],
      })
    })
    for (let j = 0; j < users.length; j++) {
      const user = users[j]
      const pHash = '12345'
      if (user.username === '__viewer_watched__') {
        // have access
        it(`+++ ${users[j].username} should have access to __viewer_watched__only`, async () => {
          const check = await global.permissions.check(user.id, pHash)
          assert.strictEqual(check.access, true)
        })
      } else {
        // no access
        it(`--- ${users[j].username} should NOT have access to __viewer_watched__only`, async () => {
          const check = await global.permissions.check(user.id, pHash)
          assert.strictEqual(check.access, false)
        })
      }
    }
  })

  describe(`Permission only for user with 100 tips (__viewer_tips__)`, () => {
    beforeEach(async () => {
      await global.db.engine.insert(global.permissions.collection.data, {
        id: '12345',
        name: '__viewer_tips__only',
        order: Object.keys(permission).length + 1,
        isCorePermission: false,
        isWaterfallAllowed: false,
        automation: 'viewers',
        userIds: [],
        filters: [{
          comparator: '>=', type: 'tips', value: 100
        }],
      })
    })
    for (let j = 0; j < users.length; j++) {
      const user = users[j]
      const pHash = '12345'
      if (user.username === '__viewer_tips__') {
        // have access
        it(`+++ ${users[j].username} should have access to __viewer_tips__only`, async () => {
          const check = await global.permissions.check(user.id, pHash)
          assert.strictEqual(check.access, true)
        })
      } else {
        // no access
        it(`--- ${users[j].username} should NOT have access to __viewer_tips__only`, async () => {
          const check = await global.permissions.check(user.id, pHash)
          assert.strictEqual(check.access, false)
        })
      }
    }
  })

  describe(`Permission only for user with 100 bits (__viewer_bits__)`, () => {
    beforeEach(async () => {
      await global.db.engine.insert(global.permissions.collection.data, {
        id: '12345',
        name: '__viewer_bits__only',
        order: Object.keys(permission).length + 1,
        isCorePermission: false,
        isWaterfallAllowed: false,
        automation: 'viewers',
        userIds: [],
        filters: [{
          comparator: '>=', type: 'bits', value: 100
        }],
      })
    })
    for (let j = 0; j < users.length; j++) {
      const user = users[j]
      const pHash = '12345'
      if (user.username === '__viewer_bits__') {
        // have access
        it(`+++ ${users[j].username} should have access to __viewer_bits__only`, async () => {
          const check = await global.permissions.check(user.id, pHash)
          assert.strictEqual(check.access, true)
        })
      } else {
        // no access
        it(`--- ${users[j].username} should NOT have access to __viewer_bits__only`, async () => {
          const check = await global.permissions.check(user.id, pHash)
          assert.strictEqual(check.access, false)
        })
      }
    }
  })

  describe(`Permission only for user with 100 messages (__viewer_messages__)`, () => {
    beforeEach(async () => {
      await global.db.engine.insert(global.permissions.collection.data, {
        id: '12345',
        name: '__viewer_messages__only',
        order: Object.keys(permission).length + 1,
        isCorePermission: false,
        isWaterfallAllowed: false,
        automation: 'viewers',
        userIds: [],
        filters: [{
          comparator: '>=', type: 'messages', value: 100
        }],
      })
    })
    for (let j = 0; j < users.length; j++) {
      const user = users[j]
      const pHash = '12345'
      if (user.username === '__viewer_messages__') {
        // have access
        it(`+++ ${users[j].username} should have access to __viewer_messages__only`, async () => {
          const check = await global.permissions.check(user.id, pHash)
          assert.strictEqual(check.access, true)
        })
      } else {
        // no access
        it(`--- ${users[j].username} should NOT have access to __viewer_messages__only`, async () => {
          const check = await global.permissions.check(user.id, pHash)
          assert.strictEqual(check.access, false)
        })
      }
    }
  })

  describe(`Permission only for user with 2 subtier (__viewer_subtier__)`, () => {
    beforeEach(async () => {
      await global.db.engine.insert(global.permissions.collection.data, {
        id: '12345',
        name: '__viewer_subtier__only',
        order: Object.keys(permission).length + 1,
        isCorePermission: false,
        isWaterfallAllowed: false,
        automation: 'viewers',
        userIds: [],
        filters: [{
          comparator: '>=', type: 'subtier', value: 2
        }],
      })
    })
    for (let j = 0; j < users.length; j++) {
      const user = users[j]
      const pHash = '12345'
      if (user.username === '__viewer_subtier__') {
        // have access
        it(`+++ ${users[j].username} should have access to __viewer_subtier__only`, async () => {
          const check = await global.permissions.check(user.id, pHash)
          assert.strictEqual(check.access, true)
        })
      } else {
        // no access
        it(`--- ${users[j].username} should NOT have access to __viewer_subtier__only`, async () => {
          const check = await global.permissions.check(user.id, pHash)
          assert.strictEqual(check.access, false)
        })
      }
    }
  })

  describe(`Permission only for user with 2 subcumulativemonths (__viewer_subcumulativemonths__)`, () => {
    beforeEach(async () => {
      await global.db.engine.insert(global.permissions.collection.data, {
        id: '12345',
        name: '__viewer_subcumulativemonths__only',
        order: Object.keys(permission).length + 1,
        isCorePermission: false,
        isWaterfallAllowed: false,
        automation: 'viewers',
        userIds: [],
        filters: [{
          comparator: '>=', type: 'subcumulativemonths', value: 2
        }],
      })
    })
    for (let j = 0; j < users.length; j++) {
      const user = users[j]
      const pHash = '12345'
      if (user.username === '__viewer_subcumulativemonths__') {
        // have access
        it(`+++ ${users[j].username} should have access to __viewer_subcumulativemonths__only`, async () => {
          const check = await global.permissions.check(user.id, pHash)
          assert.strictEqual(check.access, true)
        })
      } else {
        // no access
        it(`--- ${users[j].username} should NOT have access to __viewer_subcumulativemonths__only`, async () => {
          const check = await global.permissions.check(user.id, pHash)
          assert.strictEqual(check.access, false)
        })
      }
    }
  })

  describe(`Permission only for user with 2 substreakmonths (__viewer_substreakmonths__)`, () => {
    beforeEach(async () => {
      await global.db.engine.insert(global.permissions.collection.data, {
        id: '12345',
        name: '__viewer_substreakmonths__only',
        order: Object.keys(permission).length + 1,
        isCorePermission: false,
        isWaterfallAllowed: false,
        automation: 'viewers',
        userIds: [],
        filters: [{
          comparator: '>=', type: 'substreakmonths', value: 2
        }],
      })
    })
    for (let j = 0; j < users.length; j++) {
      const user = users[j]
      const pHash = '12345'
      if (user.username === '__viewer_substreakmonths__') {
        // have access
        it(`+++ ${users[j].username} should have access to __viewer_substreakmonths__only`, async () => {
          const check = await global.permissions.check(user.id, pHash)
          assert.strictEqual(check.access, true)
        })
      } else {
        // no access
        it(`--- ${users[j].username} should NOT have access to __viewer_substreakmonths__only`, async () => {
          const check = await global.permissions.check(user.id, pHash)
          assert.strictEqual(check.access, false)
        })
      }
    }
  })

  describe(`Disabled !uptime command should not work`, () => {
    beforeEach(async () => {
      await global.db.engine.insert(global.permissions.collection.commands, {
        key: '!uptime',
        permission: null,
      })
    })
    for (let j = 0; j < users.length; j++) {
      it (`--- ${users[j].username} should NOT trigger disabled command !uptime`, async () => {
        const parse = new Parser({ sender: users[j], message: '!uptime', skip: false, quiet: false })
        await parse.process()
        await message.isNotSentRaw('Stream is currently offline for', users[j], 1000)
      })
    }
  })
})

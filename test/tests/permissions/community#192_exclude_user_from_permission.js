/* global describe it beforeEach */

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const assert = require('assert');

const { defaultPermissions } = require('../../../dest/helpers/permissions/defaultPermissions');
const { check } = require('../../../dest/helpers/permissions/check');
const Parser = require('../../../dest/parser').default;
const currency = require('../../../dest/currency').default;

const { Permissions, PermissionCommands } = require('../../../dest/database/entity/permissions');
const { User } = require('../../../dest/database/entity/user');
const { AppDataSource } = require('../../../dest/database.js');

const users = [
  { userName: '__viewer__', userId: String(6), id: 6 },
  { userName: '__excluded_viewer__', userId: String(7), id: 7 },
];

describe('Permissions - https://community.sogebot.xyz/t/spotify-user-banlist/192 - exclude user from permission - @func3', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();

    for (const u of users) {
      await AppDataSource.getRepository(User).save(u);
    }
  });

  it('Add permission with excluded __excluded_viewer__', async () => {
    await AppDataSource.getRepository(Permissions).save({
      id: 'bbaac669-923f-4063-99e3-f8004b34dac3',
      name: '__permission_with_excluded_user__',
      order: Object.keys(defaultPermissions).length + 1,
      isCorePermission: false,
      isWaterfallAllowed: false,
      automation: 'viewers',
      userIds: [],
      excludeUserIds: ['7'],
      filters: [],
    });
  });

  for (let j = 0; j < users.length; j++) {
    const user = users[j];
    const pHash = 'bbaac669-923f-4063-99e3-f8004b34dac3';
    if (user.userName === '__viewer__') {
      // have access
      it(`+++ ${users[j].userName} should have access to __permission_with_excluded_user__`, async () => {
        const _check = await check(user.userId, pHash);
        assert.strictEqual(_check.access, true);
      });
    } else {
      // no access
      it(`--- ${users[j].userName} should NOT have access to __permission_with_excluded_user__`, async () => {
        const _check = await check(user.userId, pHash);
        assert.strictEqual(_check.access, false);
      });
    }
  }
});

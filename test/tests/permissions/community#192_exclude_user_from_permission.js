/* global describe it beforeEach */

import('../../general.js');

import { db } from '../../general.js';
import { message } from '../../general.js';
import assert from 'assert';

import { defaultPermissions } from '../../../dest/helpers/permissions/defaultPermissions.js';
import { check } from '../../../dest/helpers/permissions/check.js';
import { Parser } from '../../../dest/parser.js';
const currency = (await import('../../../dest/currency.js')).default;

import { Permissions, PermissionCommands } from '../../../dest/database/entity/permissions.js';
import { User } from '../../../dest/database/entity/user.js';
import { AppDataSource } from '../../../dest/database.js';

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

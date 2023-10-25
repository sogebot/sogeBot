/* global */

import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js';

import('../../general.js');

import { Permissions } from '../../../dest/database/entity/permissions.js';
import { defaultPermissions } from '../../../dest/helpers/permissions/defaultPermissions.js';import moderation from '../../../dest/systems/moderation.js';
import { db } from '../../general.js';
import { variable } from '../../general.js';
import { message } from '../../general.js';
import { user } from '../../general.js';

describe('discord#868236481406324747 - Manually included users with link disabled should not be purged - @func1', () => {
  after(async () => {
    await AppDataSource
      .createQueryBuilder()
      .delete()
      .from(Permissions)
      .where('1 = 1')
      .execute();
    await AppDataSource.getRepository(Permissions).insert({
      id:                 defaultPermissions.CASTERS,
      name:               'Casters',
      automation:         'casters',
      isCorePermission:   true,
      isWaterfallAllowed: true,
      order:              0,
      userIds:            [],
      excludeUserIds:     [],
      filters:            [],
    });
    await AppDataSource.getRepository(Permissions).insert({
      id:                 defaultPermissions.MODERATORS,
      name:               'Moderators',
      automation:         'moderators',
      isCorePermission:   true,
      isWaterfallAllowed: true,
      order:              1,
      userIds:            [],
      excludeUserIds:     [],
      filters:            [],
    });
    await AppDataSource.getRepository(Permissions).insert({
      id:                 defaultPermissions.SUBSCRIBERS,
      name:               'Subscribers',
      automation:         'subscribers',
      isCorePermission:   true,
      isWaterfallAllowed: true,
      order:              2,
      userIds:            [],
      excludeUserIds:     [],
      filters:            [],
    });
    await AppDataSource.getRepository(Permissions).insert({
      id:                 defaultPermissions.VIP,
      name:               'VIP',
      automation:         'vip',
      isCorePermission:   true,
      isWaterfallAllowed: true,
      order:              3,
      userIds:            [],
      excludeUserIds:     [],
      filters:            [],
    });
    await AppDataSource.getRepository(Permissions).insert({
      id:                 defaultPermissions.VIEWERS,
      name:               'Viewers',
      automation:         'viewers',
      isCorePermission:   true,
      isWaterfallAllowed: true,
      order:              4,
      userIds:            [],
      excludeUserIds:     [],
      filters:            [],
    });
  });

  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();

    await AppDataSource
      .createQueryBuilder()
      .delete()
      .from(Permissions)
      .where('1 = 1')
      .execute();
    await AppDataSource.getRepository(Permissions).insert({
      id:                 defaultPermissions.CASTERS,
      name:               'Casters',
      automation:         'casters',
      isCorePermission:   true,
      isWaterfallAllowed: true,
      order:              0,
      userIds:            [],
      excludeUserIds:     [],
      filters:            [],
    });
    moderation.__permission_based__cLinksEnabled[defaultPermissions.CASTERS] = true;

    await AppDataSource.getRepository(Permissions).insert({
      id:                 defaultPermissions.MODERATORS,
      name:               'Moderators',
      automation:         'moderators',
      isCorePermission:   true,
      isWaterfallAllowed: true,
      order:              1,
      userIds:            [],
      excludeUserIds:     [],
      filters:            [],
    });
    moderation.__permission_based__cLinksEnabled[defaultPermissions.MODERATORS] = true;
    await AppDataSource.getRepository(Permissions).insert({
      id:                 '162e0172-bf00-41d7-b363-346bea52838b',
      name:               'Test',
      automation:         'moderators',
      isCorePermission:   false,
      isWaterfallAllowed: true,
      order:              2,
      userIds:            [user.viewer.userId],
      excludeUserIds:     [],
      filters:            [],
    });
    await AppDataSource.getRepository(Permissions).insert({
      id:                 defaultPermissions.SUBSCRIBERS,
      name:               'Subscribers',
      automation:         'subscribers',
      isCorePermission:   true,
      isWaterfallAllowed: true,
      order:              3,
      userIds:            [],
      excludeUserIds:     [],
      filters:            [],
    });
    moderation.__permission_based__cLinksEnabled[defaultPermissions.SUBSCRIBERS] = true;

    await AppDataSource.getRepository(Permissions).insert({
      id:                 defaultPermissions.VIP,
      name:               'VIP',
      automation:         'vip',
      isCorePermission:   true,
      isWaterfallAllowed: true,
      order:              4,
      userIds:            [],
      excludeUserIds:     [],
      filters:            [],
    });
    moderation.__permission_based__cLinksEnabled[defaultPermissions.VIP] = true;

    await AppDataSource.getRepository(Permissions).insert({
      id:                 defaultPermissions.VIEWERS,
      name:               'Viewers',
      automation:         'viewers',
      isCorePermission:   true,
      isWaterfallAllowed: true,
      order:              5,
      userIds:            [],
      excludeUserIds:     [],
      filters:            [],
    });
    moderation.__permission_based__cLinksEnabled[defaultPermissions.VIEWERS] = true;
  });

  it (`Enable link moderation for Test group`, () => {
    moderation.__permission_based__cLinksEnabled['162e0172-bf00-41d7-b363-346bea52838b'] = true;
  });

  it(`Link 'http://www.foobarpage.com' should timeout`, async () => {
    assert(!(await moderation.containsLink({ sender: user.viewer, message: 'http://www.foobarpage.com' })));
  });

  it (`Disable link moderation for Test group`, () => {
    moderation.__permission_based__cLinksEnabled['162e0172-bf00-41d7-b363-346bea52838b'] = false;
  });

  it(`Link 'http://www.foobarpage.com' should not timeout`, async () => {
    assert((await moderation.containsLink({ sender: user.viewer, message: 'http://www.foobarpage.com' })));
  });
});

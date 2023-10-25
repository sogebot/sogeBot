/* global */
import assert from 'assert';

import('../../general.js');
import { Alias, AliasGroup } from '../../../dest/database/entity/alias.js';
import { AppDataSource } from '../../../dest/database.js'
import { prepare } from '../../../dest/helpers/commons/prepare.js';
import { defaultPermissions } from '../../../dest/helpers/permissions/defaultPermissions.js';
import alias from '../../../dest/systems/alias.js';
import { db, message, user } from '../../general.js';

describe('Alias - @func1 - #4860 - alias group permissions and filter should be considered', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
  });

  it('create filterGroup with filter | $game === "Dota 2"', async () => {
    await AppDataSource.getRepository(AliasGroup).insert({
      name:    'filterGroup',
      options: {
        filter:     '$game === "Dota 2"',
        permission: null,
      },
    });
  });

  it('create permGroup with permission | CASTERS', async () => {
    await AppDataSource.getRepository(AliasGroup).insert({
      name:    'permGroup',
      options: {
        filter:     null,
        permission: defaultPermissions.CASTERS,
      },
    });
  });

  it('create permGroup2 without permission', async () => {
    await AppDataSource.getRepository(AliasGroup).insert({
      name:    'permGroup2',
      options: {
        filter:     null,
        permission: null,
      },
    });
  });

  it('create alias !testfilter with filterGroup', async () => {
    await AppDataSource.getRepository(Alias).insert({
      id:         '1a945d76-2d3c-4c7a-ae03-e0daf17142c5',
      alias:      '!testfilter',
      command:    '!me',
      enabled:    true,
      visible:    true,
      permission: defaultPermissions.VIEWERS,
      group:      'filterGroup',
    });
  });

  it('create alias !testpermnull with permGroup', async () => {
    await AppDataSource.getRepository(Alias).insert({
      id:         '2584b3c1-d2da-4fae-bf9a-95048724acde',
      alias:      '!testpermnull',
      command:    '!me',
      enabled:    true,
      visible:    true,
      permission: null,
      group:      'permGroup',
    });
  });

  it('create alias !testpermnull2 with permGroup2', async () => {
    await AppDataSource.getRepository(Alias).insert({
      id:         'ed5f2925-ba73-4146-906b-3856d2583b6a',
      alias:      '!testpermnull2',
      command:    '!me',
      enabled:    true,
      visible:    true,
      permission: null,
      group:      'permGroup2',
    });
  });

  it('create alias !testpermmods with permGroup', async () => {
    await AppDataSource.getRepository(Alias).insert({
      id:         '2d33f59d-4900-454e-9d3a-22472ae1d3a7',
      alias:      '!testpermmods',
      command:    '!me',
      enabled:    true,
      visible:    true,
      permission: defaultPermissions.MODERATORS,
      group:      'permGroup',
    });
  });

  it('!testpermnull should be triggered by CASTER', async () => {
    message.prepare();
    alias.run({ sender: user.owner, message: '!testpermnull' });
    await message.isSentRaw('@__broadcaster__ | Level 0 | 0 hours | 0 points | 0 messages | €0.00 | 0 bits | 0 months', user.owner);
  });

  it('!testpermnull should not be triggered by VIEWER', async () => {
    message.prepare();
    alias.run({ sender: user.viewer, message: '!testpermnull' });
    await message.isNotSentRaw('@__viewer__ | Level 0 | 0 hours | 0 points | 0 messages | €0.00 | 0 bits | 0 months', user.viewer);
  });

  it('!testpermnull2 should be triggered by CASTER', async () => {
    message.prepare();
    alias.run({ sender: user.owner, message: '!testpermnull2' });
    await message.isWarnedRaw('Alias !testpermnull2#ed5f2925-ba73-4146-906b-3856d2583b6a doesn\'t have any permission set, treating as CASTERS permission.');
    await message.isSentRaw('@__broadcaster__ | Level 0 | 0 hours | 0 points | 0 messages | €0.00 | 0 bits | 0 months', user.owner);
  });

  it('!testpermnull2 should not be triggered by VIEWER', async () => {
    message.prepare();
    alias.run({ sender: user.viewer, message: '!testpermnull2' });
    await message.isWarnedRaw('Alias !testpermnull2#ed5f2925-ba73-4146-906b-3856d2583b6a doesn\'t have any permission set, treating as CASTERS permission.');
    await message.isNotSentRaw('@__viewer__ | Level 0 | 0 hours | 0 points | 0 messages | €0.00 | 0 bits | 0 months', user.viewer);
  });

  it('!testpermmods should be triggered by MOD', async () => {
    message.prepare();
    alias.run({ sender: user.mod, message: '!testpermmods' });
    await message.isSentRaw('@__mod__ | Level 0 | 0 hours | 0 points | 0 messages | €0.00 | 0 bits | 0 months', user.mod);
  });

  it('!testpermmods should not be triggered by VIEWER', async () => {
    message.prepare();
    alias.run({ sender: user.viewer, message: '!testpermmods' });
    await message.isNotSentRaw('@__viewer__ | Level 0 | 0 hours | 0 points | 0 messages | €0.00 | 0 bits | 0 months', user.viewer);
  });

  describe('Test incorrect filter', () => {
    before(() => {
      message.prepare();
    });
    it('set $game to Test', async () => {
      const {stats} = await import('../../../dest/helpers/api/stats.js');
      stats.value.currentGame = 'Test';
    });
    it('!testfilter alias should not be triggered', async () => {
      alias.run({ sender: user.owner, message: '!testfilter' });
      await message.isWarnedRaw('Alias !testfilter#1a945d76-2d3c-4c7a-ae03-e0daf17142c5 didn\'t pass group filter.');
    });
  });

  describe('Test correct filter', () => {
    before(() => {
      message.prepare();
    });
    it('set $game to Dota 2', async() => {
      const {stats} = await import('../../../dest/helpers/api/stats.js');
      stats.value.currentGame = 'Dota 2';
    });
    it('!testfilter alias should be triggered', async () => {
      alias.run({ sender: user.owner, message: '!testfilter' });
      await message.isSentRaw('@__broadcaster__ | Level 0 | 0 hours | 0 points | 0 messages | €0.00 | 0 bits | 0 months', user.owner);
    });
  });
});

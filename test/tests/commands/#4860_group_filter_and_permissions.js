/* global */
import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js';

import('../../general.js');
import { Commands, CommandsGroup } from '../../../dest/database/entity/commands.js';
import { prepare } from '../../../dest/helpers/commons/prepare.js';
import { defaultPermissions } from '../../../dest/helpers/permissions/defaultPermissions.js';
import customcommands from '../../../dest/systems/customcommands.js';
import { db, message, user } from '../../general.js';

describe('Custom Commands - @func2 - #4860 - customcommands group permissions and filter should be considered', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
  });

  it('create filterGroup with filter | $game === "Dota 2"', async () => {
    await AppDataSource.getRepository(CommandsGroup).insert({
      name:    'filterGroup',
      options: {
        filter:     '$game === "Dota 2"',
        permission: null,
      },
    });
  });

  it('create permGroup with permission | CASTERS', async () => {
    await AppDataSource.getRepository(CommandsGroup).insert({
      name:    'permGroup',
      options: {
        filter:     null,
        permission: defaultPermissions.CASTERS,
      },
    });
  });

  it('create permGroup2 without permission', async () => {
    await AppDataSource.getRepository(CommandsGroup).insert({
      name:    'permGroup2',
      options: {
        filter:     null,
        permission: null,
      },
    });
  });

  it('create command !testfilter with filterGroup', async () => {
    const command = new Commands();
    command.id =        '1a945d76-2d3c-4c7a-ae03-e0daf17142c5';
    command.command =   '!testfilter';
    command.enabled =   true;
    command.visible =   true;
    command.group =     'filterGroup';
    command.responses = [{
      stopIfExecuted: false,
      response:       'bad449ae-f0b3-488c-a7b0-39a853d5333f',
      filter:         '',
      order:          0,
      permission:     defaultPermissions.VIEWERS,
    }, {
      stopIfExecuted: false,
      response:       'c0f68c62-630b-412b-9c97-f5b1afc734d2',
      filter:         '$title === \'test\'',
      order:          1,
      permission:     defaultPermissions.VIEWERS,
    }, {
      stopIfExecuted: false,
      response:       '4b310000-b105-475a-8a85-a573a0bca1b7',
      filter:         '$title !== \'test\'',
      order:          2,
      permission:     defaultPermissions.VIEWERS,
    }];
    await command.save();
  });

  it('create command !testpermnull with permGroup', async () => {
    const command = new Commands();
    command.id =        '2584b3c1-d2da-4fae-bf9a-95048724acda';
    command.command =   '!testpermnull';
    command.enabled =   true;
    command.visible =   true;
    command.group =     'permGroup';
    command.responses = [{
      stopIfExecuted: false,
      response:       '430ea834-da5f-48b1-bf2f-3acaf1f04c63',
      filter:         '',
      order:          0,
      permission:     null,
    }];
    await command.save();
  });

  it('create command !testpermnull2 with permGroup2', async () => {
    const command = new Commands();
    command.id =        '2584b3c1-d2da-4fae-bf9a-95048724acdb';
    command.command =   '!testpermnull2';
    command.enabled =   true;
    command.visible =   true;
    command.group =     'permGroup2';
    command.responses = [{
      stopIfExecuted: false,
      response:       '1594a86e-158d-4b7d-9898-0f80bd6a0c98',
      filter:         '',
      order:          0,
      permission:     null,
    }];
    await command.save();
  });

  it('create command !testpermmods with permGroup2', async () => {
    const command = new Commands();
    command.id =        '2584b3c1-d2da-4fae-bf9a-95048724acdc';
    command.command =   '!testpermmods';
    command.enabled =   true;
    command.visible =   true;
    command.group =     'permGroup2';
    command.responses = [{
      stopIfExecuted: false,
      response:       'cae8f74f-046a-4756-b6c5-f2219d9a0f4e',
      filter:         '',
      order:          1,
      permission:     defaultPermissions.MODERATORS,
    }];
    await command.save();
  });

  it('!testpermnull should be triggered by CASTER', async () => {
    message.prepare();
    customcommands.run({ sender: user.owner, message: '!testpermnull' });
    await message.isSentRaw('430ea834-da5f-48b1-bf2f-3acaf1f04c63', user.owner);
  });

  it('!testpermnull should not be triggered by VIEWER', async () => {
    message.prepare();
    customcommands.run({ sender: user.viewer, message: '!testpermnull' });
    await message.isNotSentRaw('430ea834-da5f-48b1-bf2f-3acaf1f04c63', user.viewer);
  });

  it('!testpermnull2 should be triggered by CASTER', async () => {
    message.prepare();
    customcommands.run({ sender: user.owner, message: '!testpermnull2' });
    await message.isWarnedRaw('Custom command !testpermnull2#2584b3c1-d2da-4fae-bf9a-95048724acdb|0 doesn\'t have any permission set, treating as CASTERS permission.');
    await message.isSentRaw('1594a86e-158d-4b7d-9898-0f80bd6a0c98', user.owner);
  });

  it('!testpermnull2 should not be triggered by VIEWER', async () => {
    message.prepare();
    customcommands.run({ sender: user.viewer, message: '!testpermnull2' });
    await message.isWarnedRaw('Custom command !testpermnull2#2584b3c1-d2da-4fae-bf9a-95048724acdb|0 doesn\'t have any permission set, treating as CASTERS permission.');
    await message.isNotSentRaw('1594a86e-158d-4b7d-9898-0f80bd6a0c98', user.viewer);
  });

  it('!testpermmods should be triggered by MOD', async () => {
    message.prepare();
    customcommands.run({ sender: user.mod, message: '!testpermmods' });
    await message.isSentRaw('cae8f74f-046a-4756-b6c5-f2219d9a0f4e', user.mod);
  });

  it('!testpermmods should not be triggered by VIEWER', async () => {
    message.prepare();
    customcommands.run({ sender: user.viewer, message: '!testpermmods' });
    await message.isNotSentRaw('cae8f74f-046a-4756-b6c5-f2219d9a0f4e', user.viewer);
  });

  describe('Test incorrect filter', () => {
    before(() => {
      message.prepare();
    });
    it('set $game to Test', async () => {
      const {stats} = await import('../../../dest/helpers/api/stats.js');
      stats.value.currentGame = 'Test';
    });
    it('!testfilter customcommands should not be triggered', async () => {
      customcommands.run({ sender: user.owner, message: '!testfilter' });
      await message.isWarnedRaw('Custom command !testfilter#1a945d76-2d3c-4c7a-ae03-e0daf17142c5 didn\'t pass group filter.');
    });
  });

  describe('Test correct filter', () => {
    before(() => {
      message.prepare();
    });
    it('set $game to Dota 2', async () => {
      const {stats} = await import('../../../dest/helpers/api/stats.js');
      stats.value.currentGame = 'Dota 2';
    });
    it('!testfilter customcommands should be triggered', async () => {
      customcommands.run({ sender: user.owner, message: '!testfilter' });
      await message.isSentRaw('bad449ae-f0b3-488c-a7b0-39a853d5333f', user.owner);
      await message.isNotSentRaw('c0f68c62-630b-412b-9c97-f5b1afc734d2', user.owner);
      await message.isSentRaw('4b310000-b105-475a-8a85-a573a0bca1b7', user.owner);
    });
  });
});

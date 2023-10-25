/* global */
import assert from 'assert';

import('../../general.js');
import { Keyword, KeywordGroup, KeywordResponses } from '../../../dest/database/entity/keyword.js';
import { prepare } from '../../../dest/helpers/commons/prepare.js';
import { defaultPermissions } from '../../../dest/helpers/permissions/defaultPermissions.js';
import keywords from '../../../dest/systems/keywords.js';
import { db, message, user } from '../../general.js';

describe('Keywords - @func3 - #4860 - keywords group permissions and filter should be considered', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
  });

  it('create filterGroup with filter | $game === "Dota 2"', async () => {
    const group = new KeywordGroup();
    group.name = 'filterGroup';
    group.options = {
      filter:     '$game === "Dota 2"',
      permission: null,
    };
    await group.save();
  });

  it('create permGroup with permission | CASTERS', async () => {
    const group = new KeywordGroup();
    group.name = 'permGroup';
    group.options = {
      filter:     null,
      permission: defaultPermissions.CASTERS,
    };
    await group.save();
  });

  it('create permGroup2 without permission', async () => {
    const group = new KeywordGroup();
    group.name = 'permGroup2';
    group.options = {
      filter:     null,
      permission: null,
    };
    await group.save();
  });

  let testfilter = '';

  it('create keyword testfilter with filterGroup', async () => {
    const keyword = new Keyword();
    keyword.keyword = 'testfilter';
    keyword.enabled = true;
    keyword.visible = true;
    keyword.group = 'filterGroup';
    await keyword.save();
    testfilter = keyword.id;

    const response1 = new KeywordResponses();
    response1.stopIfExecuted = false;
    response1.response = 'bad449ae-f0b3-488c-a7b0-39a853d5333f';
    response1.filter = '';
    response1.order = 0;
    response1.permission = defaultPermissions.VIEWERS;
    response1.keyword = keyword;
    await response1.save();

    const response2 = new KeywordResponses();
    response2.stopIfExecuted = false;
    response2.response = 'c0f68c62-630b-412b-9c97-f5b1afc734d2';
    response2.filter = '$title === \'test\'';
    response2.order = 1;
    response2.permission = defaultPermissions.VIEWERS;
    response2.keyword = keyword;
    await response2.save();

    const response3 = new KeywordResponses();
    response3.stopIfExecuted = false;
    response3.response = '4b310000-b105-475a-8a85-a573a0bca1b7';
    response3.filter = '$title !== \'test\'';
    response3.order = 2;
    response3.permission = defaultPermissions.VIEWERS;
    response3.keyword = keyword;
    await response3.save();
  });

  it('create keyword testpermnull with permGroup', async () => {
    const keyword = new Keyword();
    keyword.keyword = 'testpermnull';
    keyword.enabled = true;
    keyword.visible = true;
    keyword.group = 'permGroup';
    await keyword.save();

    const response1 = new KeywordResponses();
    response1.stopIfExecuted = false;
    response1.response = '430ea834-da5f-48b1-bf2f-3acaf1f04c63';
    response1.filter = '';
    response1.order = 0;
    response1.permission = null;
    response1.keyword = keyword;
    await response1.save();
  });

  let testpermnull2 = '';

  it('create keyword testpermnull2 with permGroup2', async () => {
    const keyword = new Keyword();
    keyword.keyword = 'testpermnull2';
    keyword.enabled = true;
    keyword.visible = true;
    keyword.group = 'permGroup2';
    await keyword.save();
    testpermnull2 = keyword.id;

    const response1 = new KeywordResponses();
    response1.stopIfExecuted = false;
    response1.response = '1594a86e-158d-4b7d-9898-0f80bd6a0c98';
    response1.filter = '';
    response1.order = 0;
    response1.permission = null;
    response1.keyword = keyword;
    await response1.save();
  });

  it('create keyword testpermmods with permGroup2', async () => {
    const keyword = new Keyword();
    keyword.keyword = 'testpermmods';
    keyword.enabled = true;
    keyword.visible = true;
    keyword.group = 'permGroup2';
    await keyword.save();

    const response1 = new KeywordResponses();
    response1.stopIfExecuted = false;
    response1.response = 'cae8f74f-046a-4756-b6c5-f2219d9a0f4e';
    response1.filter = '';
    response1.order = 0;
    response1.permission = defaultPermissions.MODERATORS;
    response1.keyword = keyword;
    await response1.save();
  });

  it('!testpermnull should be triggered by CASTER', async () => {
    message.prepare();
    keywords.run({ sender: user.owner, message: 'testpermnull' });
    await message.isSentRaw('430ea834-da5f-48b1-bf2f-3acaf1f04c63', user.owner);
  });

  it('!testpermnull should not be triggered by VIEWER', async () => {
    message.prepare();
    keywords.run({ sender: user.viewer, message: 'testpermnull' });
    await message.isNotSentRaw('430ea834-da5f-48b1-bf2f-3acaf1f04c63', user.viewer);
  });

  it('!testpermnull2 should be triggered by CASTER', async () => {
    message.prepare();
    keywords.run({ sender: user.owner, message: 'testpermnull2' });
    await message.isWarnedRaw('Keyword testpermnull2#'+testpermnull2+'|0 doesn\'t have any permission set, treating as CASTERS permission.');
    await message.isSentRaw('1594a86e-158d-4b7d-9898-0f80bd6a0c98', user.owner);
  });

  it('!testpermnull2 should not be triggered by VIEWER', async () => {
    message.prepare();
    keywords.run({ sender: user.viewer, message: 'testpermnull2' });
    await message.isWarnedRaw('Keyword testpermnull2#'+testpermnull2+'|0 doesn\'t have any permission set, treating as CASTERS permission.');
    await message.isNotSentRaw('1594a86e-158d-4b7d-9898-0f80bd6a0c98', user.viewer);
  });

  it('!testpermmods should be triggered by MOD', async () => {
    message.prepare();
    keywords.run({ sender: user.mod, message: 'testpermmods' });
    await message.isSentRaw('cae8f74f-046a-4756-b6c5-f2219d9a0f4e', user.mod);
  });

  it('!testpermmods should not be triggered by VIEWER', async () => {
    message.prepare();
    keywords.run({ sender: user.viewer, message: 'testpermmods' });
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
    it('!testfilter keywords should not be triggered', async () => {
      keywords.run({ sender: user.owner, message: 'testfilter' });
      await message.isWarnedRaw('Keyword testfilter#'+ testfilter +' didn\'t pass group filter.');
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
    it('!testfilter keywords should be triggered', async () => {
      keywords.run({ sender: user.owner, message: 'testfilter' });
      await message.isSentRaw('bad449ae-f0b3-488c-a7b0-39a853d5333f', user.owner);
      await message.isNotSentRaw('c0f68c62-630b-412b-9c97-f5b1afc734d2', user.owner);
      await message.isSentRaw('4b310000-b105-475a-8a85-a573a0bca1b7', user.owner);
    });
  });
});

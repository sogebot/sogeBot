/* global describe it */
import assert from 'assert';

import('../../general.js');
import { db, message, user } from '../../general.js';
import alias from '../../../dest/systems/alias.js';

import { prepare } from '../../../dest/helpers/commons/prepare.js';
import { defaultPermissions } from '../../../dest/helpers/permissions/defaultPermissions.js';

import { Variable } from '../../../dest/database/entity/variable.js';
import { AppDataSource } from '../../../dest/database.js'

describe('Alias - @func1 - 1243662970593083429 - alias should be triggered with numbers', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('create alias !H4nExe for command !queue open (caster only)', async () => {
    const r = await alias.add({ sender: user.owner, parameters: '-a !H4nExe -c !queue open' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: '!H4nExe', command: '!queue open' }));
  });

  it('call alias with regular viewer should process it correctly', async () => {
    await alias.run({ sender: user.viewer, message: '!H4nExe' });
    await message.debug('alias.process', '!queue open');
    await message.debug('parser.command', 'Running !queue open');
  });
});

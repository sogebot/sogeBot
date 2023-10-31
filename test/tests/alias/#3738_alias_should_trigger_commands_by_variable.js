/* global describe it */
import assert from 'assert';

import('../../general.js');
import { db, message, user } from '../../general.js';
import alias from '../../../dest/systems/alias.js';

import { prepare } from '../../../dest/helpers/commons/prepare.js';
import { defaultPermissions } from '../../../dest/helpers/permissions/defaultPermissions.js';

import { Variable } from '../../../dest/database/entity/variable.js';
import { AppDataSource } from '../../../dest/database.js'

describe('Alias - @func1 - #3738 - alias should trigger commands by variable', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('create variable $_alert', async () => {
    const variable = Variable.create({
      variableName: '$_alert',
      readOnly: false,
      currentValue: '!queue open',
      type: 'string',
      responseType: 0,
      permission: defaultPermissions.CASTERS,
      evalValue: '',
      usableOptions: [],
    })
    await variable.save();
  });

  it('create alias !test for command !queue open (caster only)', async () => {
    const r = await alias.add({ sender: user.owner, parameters: '-a !test -c $_alert' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: '!test', command: '$_alert' }));
  });

  it('call alias with regular viewer should process it correctly', async () => {
    await alias.run({ sender: user.viewer, message: '!test' });
    await message.debug('alias.process', '!queue open');
    await message.debug('parser.command', 'Running !queue open');
  });
});

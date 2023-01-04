/* global describe it */
const assert = require('assert');

require('../../general.js');
const db = require('../../general.js').db;
const message = require('../../general.js').message;
const user = require('../../general.js').user;
const alias = (require('../../../dest/systems/alias')).default;

const { prepare } = (require('../../../dest/helpers/commons/prepare'));
const { defaultPermissions } = require('../../../dest/helpers/permissions/defaultPermissions');

const { Variable } = require('../../../dest/database/entity/variable');
const { AppDataSource } = require('../../../dest/database');

describe('Alias - @func1 - #3738 - alias should trigger commands by variable', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('create variable $_alert', async () => {
    await new Variable({
      variableName: '$_alert',
      readOnly: false,
      currentValue: '!media type=video',
      type: 'string',
      responseType: 0,
      permission: defaultPermissions.CASTERS,
      evalValue: '',
      usableOptions: [],
    }).save();
  });

  it('create alias !test for command !media (caster only)', async () => {
    const r = await alias.add({ sender: user.owner, parameters: '-a !test -c $_alert' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: '!test', command: '$_alert' }));
  });

  it('call alias with regular viewer should process it correctly', async () => {
    await alias.run({ sender: user.viewer, message: '!test' });
    await message.debug('alias.process', '!media type=video');
    await message.debug('parser.command', 'Running !media');
    await message.debug('alerts.emit', 'type=video');
  });
});

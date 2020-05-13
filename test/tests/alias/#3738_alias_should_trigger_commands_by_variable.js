/* global describe it */
const assert = require('assert');

require('../../general.js');
const db = require('../../general.js').db;
const message = require('../../general.js').message;
const user = require('../../general.js').user;
const alias = (require('../../../dest/systems/alias')).default;

const { prepare } = (require('../../../dest/commons'));
const { permission } = require('../../../dest/helpers/permissions');

const { getRepository } = require('typeorm');
const { Variable } = require('../../../dest/database/entity/variable');

describe('Alias - #3738 - alias should trigger commands by variable', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('create variable $_alert', async () => {
    await getRepository(Variable).save({
      variableName: '$_alert',
      readOnly: false,
      currentValue: '!alert type=video',
      type: 'string',
      responseType: 0,
      permission: permission.CASTERS,
      evalValue: '',
      usableOptions: [],
    });
  });

  it('create alias !test for command !alert (caster only)', async () => {
    const r = await alias.add({ sender: user.owner, parameters: '-a !test -c $_alert' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: '!test', command: '$_alert' }));
  });

  it('call alias with regular viewer should process it correctly', async () => {
    await alias.run({ sender: user.viewer, message: '!test' });
    await message.debug('alias.process', '!alert type=video');
    await message.debug('parser.command', 'Running !alert');
    await message.debug('alerts.emit', 'type=video');
  });
});

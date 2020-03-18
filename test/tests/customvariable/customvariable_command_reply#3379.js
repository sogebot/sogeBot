/* global describe it before */

const { permission } = require('../../../dest/helpers/permissions');
const Parser = require('../../../dest/parser').default;

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const customcommands = (require('../../../dest/systems/customcommands')).default;
const user = require('../../general.js').user;

const assert = require('chai').assert;
const _ = require('lodash');

const { getRepository } = require('typeorm');
const { Variable } = require('../../../dest/database/entity/variable');

// stub
_.set(global, 'widgets.custom_variables.io.emit', function () {
  return;
});

// https://github.com/sogehige/sogeBot/issues/3379
// custom variable command reply should return command response with updated variable #3379
describe('Custom Variable - Command reply should return correct reply', () => {
  before(async () => {
    await db.cleanup();
  });

  beforeEach(async () => {
    await message.prepare();
  })

  it ('Create command `!test` with `Variable set to $_variable`', async () => {
    customcommands.add({ sender: user.owner, parameters: '-c !test -r Variable set to $_variable' });
    await message.isSent('customcmds.command-was-added', user.owner, { response: 'Variable set to $_variable', command: '!test', sender: user.owner.username });
  });

  it(`Create initial value 0 of $_variable`, async () => {
    await getRepository(Variable).save({
      variableName: '$_variable',
      readOnly: false,
      currentValue: 0,
      type: 'number', responseType: 2,
      permission: permission.VIEWERS,
      evalValue: '',
      usableOptions: [],
    });
  });

  it ('`!test` should return `Variable set to 0`', async () => {
    customcommands.run({ sender: user.owner, message: '!test' });
    await message.isSentRaw('Variable set to 0', user.owner);
  });

  describe('!_test 5', () => {
    it(`Run !_test 5`, async () => {
      const parse = new Parser({ sender: user.owner, message: '!test 5', skip: false, quiet: false });
      await parse.process();
    });

    it('Expecting `Variable set to 5`', async () => {
      await message.isSentRaw(`Variable set to 5`, user.owner, 1000);
    });
  });

  describe('!_test +', () => {
    it(`Run !_test +`, async () => {
      const parse = new Parser({ sender: user.owner, message: '!test +', skip: false, quiet: false });
      await parse.process();
    });

    it('Expecting `Variable set to 6`', async () => {
      await message.isSentRaw(`Variable set to 6`, user.owner, 1000);
    });
  });

  describe('!_test -', () => {
    it(`Run !_test -`, async () => {
      const parse = new Parser({ sender: user.owner, message: '!test -', skip: false, quiet: false });
      await parse.process();
    });

    it('Expecting `Variable set to 5`', async () => {
      await message.isSentRaw(`Variable set to 5`, user.owner, 1000);
    });
  });
});

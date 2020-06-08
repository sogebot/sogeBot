/* global describe it before */

const { permission } = require('../../../dest/helpers/permissions');
const Parser = require('../../../dest/parser').default;

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const customcommands = (require('../../../dest/systems/customcommands')).default;
const user = require('../../general.js').user;

const assert = require('assert');
const _ = require('lodash');

const { getRepository } = require('typeorm');
const { Variable } = require('../../../dest/database/entity/variable');

// stub
_.set(global, 'widgets.custom_variables.io.emit', function () {
  return;
});

describe('Custom Variable - #3879 - Eval should trigger with param with proper permissions', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
  });

  it ('Create command `!test` with `My awesome variable is set to $_variable`', async () => {
    const r = await customcommands.add({ sender: user.owner, parameters: '-c !test -r My awesome variable is set to $_variable' });
    assert.strictEqual(r[0].response, '$sender, command !test was added');
  });

  it(`Create eval $_variable to return param`, async () => {
    await getRepository(Variable).save({
      variableName: '$_variable',
      readOnly: false,
      currentValue: 0,
      type: 'eval',
      responseType: 2,
      permission: permission.MODERATORS,
      evalValue: 'return param || "no param sent";',
      usableOptions: [],
    });
  });

  describe('!_test 4 by owner', () => {
    it(`Run !_test 4`, async () => {
      const parse = new Parser({ sender: user.owner, message: '!test 4', skip: false, quiet: false });
      await parse.process();
    });

    it('Expecting `My awesome variable is set to 4`', async () => {
      await message.isSentRaw(`My awesome variable is set to 4`, user.owner, 1000);
    });
  });
  describe('!_test 5 by mod', () => {
    it(`Run !_test 5`, async () => {
      const parse = new Parser({ sender: user.mod, message: '!test 5', skip: false, quiet: false });
      await parse.process();
    });

    it('Expecting `My awesome variable is set to 5`', async () => {
      await message.isSentRaw(`My awesome variable is set to 5`, user.mod, 1000);
    });
  });
  describe('!_test 6 by viewer', () => {
    it(`Run !_test 6`, async () => {
      const parse = new Parser({ sender: user.viewer, message: '!test 6', skip: false, quiet: false });
      await parse.process();
    });

    it('Expecting old value `My awesome variable is set to 5`', async () => {
      await message.isSentRaw(`My awesome variable is set to 5`, user.viewer, 1000);
    });
  });

  describe('!_test by viewer', () => {
    it(`Run !_test`, async () => {
      const parse = new Parser({ sender: user.viewer, message: '!test', skip: false, quiet: false });
      await parse.process();
    });

    it('Expecting old value `My awesome variable is set to 5`', async () => {
      await message.isSentRaw(`My awesome variable is set to 5`, user.viewer, 1000);
    });
  });

  describe('!_test by mod', () => {
    it(`Run !_test`, async () => {
      const parse = new Parser({ sender: user.mod, message: '!test', skip: false, quiet: false });
      await parse.process();
    });

    it('Expecting value `My awesome variable is set to no param sent`', async () => {
      await message.isSentRaw(`My awesome variable is set to no param sent`, user.mod, 1000);
    });
  });
});

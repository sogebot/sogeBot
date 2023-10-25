/* global describe it before */

import { defaultPermissions } from '../../../dest/helpers/permissions/defaultPermissions.js';
import { Parser } from '../../../dest/parser.js';

import('../../general.js');

import { db } from '../../general.js';
import { message } from '../../general.js';
import customcommands from '../../../dest/systems/customcommands.js';
import { user } from '../../general.js';

import assert from 'assert';
import _ from 'lodash-es';

import { Variable } from '../../../dest/database/entity/variable.js';
import { AppDataSource } from '../../../dest/database.js'

// stub
_.set(global, 'widgets.custom_variables.io.emit', function () {
  return;
});

describe('Custom Variable - #3879 - Eval should trigger with param with proper permissions - @func1', () => {
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
    await Variable.create({
      variableName: '$_variable',
      readOnly: false,
      currentValue: '0',
      type: 'eval',
      responseType: 2,
      runEvery: 0,
      permission: defaultPermissions.MODERATORS,
      evalValue: 'return param || "no param sent";',
      usableOptions: [],
    }).save();
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

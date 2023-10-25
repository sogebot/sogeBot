/* global describe it before */

import { defaultPermissions } from '../../../dest/helpers/permissions/defaultPermissions.js';
import { Parser } from '../../../dest/parser.js';

import('../../general.js');

import { db } from '../../general.js';
import { message, user } from '../../general.js';
import customcommands from '../../../dest/systems/customcommands.js';

import assert from 'assert';
import _ from 'lodash-es';

import { Variable } from '../../../dest/database/entity/variable.js';
import { AppDataSource } from '../../../dest/database.js'

// stub
_.set(global, 'widgets.custom_variables.io.emit', function () {
  return;
});

describe('Custom Variable - #3379 - Command reply should return correct reply - @func1', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it ('Create command `!test` with `My awesome variable is set to $_variable`', async () => {
    const r = await customcommands.add({ sender: user.owner, parameters: '-c !test -r My awesome variable is set to $_variable' });
    assert.strictEqual(r[0].response, '$sender, command !test was added');
  });

  it(`Create initial value 0 of $_variable`, async () => {
    await Variable.create({
      variableName: '$_variable',
      readOnly: false,
      currentValue: '0',
      type: 'number',
      responseType: 2,
      permission: defaultPermissions.VIEWERS,
      evalValue: '',
      usableOptions: [],
    }).save();
  });

  it ('`!test` should return `My awesome variable is set to 0`', async () => {
    customcommands.run({ sender: user.owner, message: '!test' });
    await message.isSentRaw('My awesome variable is set to 0', user.owner);
  });

  describe('!_test 5', () => {
    it(`Run !_test 5`, async () => {
      const parse = new Parser({ sender: user.owner, message: '!test 5', skip: false, quiet: false });
      await parse.process();
    });

    it('Expecting `My awesome variable is set to 5`', async () => {
      await message.isSentRaw(`My awesome variable is set to 5`, user.owner, 1000);
    });
  });

  describe('!_test +', () => {
    it(`Run !_test +`, async () => {
      const parse = new Parser({ sender: user.owner, message: '!test +', skip: false, quiet: false });
      await parse.process();
    });

    it('Expecting `My awesome variable is set to 6`', async () => {
      await message.isSentRaw(`My awesome variable is set to 6`, user.owner, 1000);
    });
  });

  describe('!_test -', () => {
    it(`Run !_test -`, async () => {
      const parse = new Parser({ sender: user.owner, message: '!test -', skip: false, quiet: false });
      await parse.process();
    });

    it('Expecting `My awesome variable is set to 5`', async () => {
      await message.isSentRaw(`My awesome variable is set to 5`, user.owner, 1000);
    });
  });
});

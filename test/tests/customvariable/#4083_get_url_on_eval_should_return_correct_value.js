/* global describe it before */

const { defaultPermissions } = require('../../../dest/helpers/permissions/');
const Parser = require('../../../dest/parser').default;

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const customcommands = (require('../../../dest/systems/customcommands')).default;
const user = require('../../general.js').user;

const assert = require('assert');
const _ = require('lodash');
const axios = require('axios');

const { Variable, VariableURL } = require('../../../dest/database/entity/variable');
const { AppDataSource } = require('../../../dest/database');
const { v4 } = require('uuid');

// stub
_.set(global, 'widgets.custom_variables.io.emit', function () {
  return;
});

describe('Custom Variable - #4083 - Get url on eval should return correct value - @func1', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
  });

  let urlId = v4();
  it(`Create eval $_variable to return Date.now()`, async () => {
    const variable = await new Variable({
      variableName: '$_variable',
      readOnly: false,
      currentValue: '0',
      type: 'eval',
      responseType: 2,
      permission: defaultPermissions.MODERATORS,
      evalValue: 'return Date.now();',
      usableOptions: [],
      urls: [{
        id: urlId,
        GET: true,
      }]
    }).save();
  });

  it(`Fetch endpoint for value and check`, async () => {
    const now = Date.now();
    const response = await axios.get(`http://localhost:20000/customvariables/${urlId}`);
    assert(response.data.value > now && response.data.value < Date.now());
  });
});

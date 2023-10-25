import { defaultPermissions } from '../../../dest/helpers/permissions/defaultPermissions.js';

import('../../general.js');

import { db, message, user } from '../../general.js';

import assert from 'assert';

import _ from 'lodash-es';
import axios from 'axios';

import { Variable } from '../../../dest/database/entity/variable.js';

import { v4 } from 'uuid'

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

  const urlId = v4();
  it(`Create eval $_variable to return Date.now()`, async () => {
    await (Variable.create({
      variableName:  '$_variable',
      readOnly:      false,
      currentValue:  '0',
      type:          'eval',
      responseType:  2,
      permission:    defaultPermissions.MODERATORS,
      evalValue:     'return Date.now();',
      runEvery:      0,
      usableOptions: [],
      urls:          [{
        id:           urlId,
        GET:          true,
        POST:         true,
        showResponse: true,
      }],
    }).save());
  });

  it(`Fetch endpoint for value and check`, async () => {
    const now = Date.now();
    const response = await axios.get(`http://localhost:20000/customvariables/${urlId}`);
    console.log(JSON.stringify(response.data));
    assert(response.data.value > now && response.data.value < Date.now());
  });
});

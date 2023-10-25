/* global describe it before */

import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js'

import { v4 } from 'uuid';

import { Variable } from '../../../dest/database/entity/variable.js';
import {getURL} from '../../../dest/helpers/customvariables/getURL.js';
import { defaultPermissions } from '../../../dest/helpers/permissions/defaultPermissions.js';
import('../../general.js');
import { db } from '../../general.js';
import { message } from '../../general.js';

describe('Custom Variable - helpers/customvariables/getURL - @func1', () => {
  let urlId = v4();
  let urlIdWithoutGET = v4();

  before(async () => {
    await db.cleanup();
    await message.prepare();

    await Variable.create({
      variableName: '$_variable',
      readOnly: false,
      currentValue: '0',
      type: 'number',
      responseType: 2,
      permission: defaultPermissions.VIEWERS,
      evalValue: '',
      usableOptions: [],
      urls: [
        { GET: true, POST: false, showResponse: false, id: urlId },
        { GET: false, POST: false, showResponse: false, id: urlIdWithoutGET }
      ]
    }).save();
  });

  it ('with enabled GET', async () => {
    const res = {
      _status: 0,
      _toSend: null,
      status(value) {
        this._status = value;
        return this;
      },
      send(value) {
        this._toSend = value;
        return this;
      },
    };
    await getURL({
      params: {
        id: urlId,
      },
    }, res);

    assert.strictEqual(res._toSend.value, '0');
    assert.strictEqual(res._toSend.code, undefined);
    assert.strictEqual(res._status, 200);
  });

  it ('with disabled GET', async () => {
    const res = {
      _status: 0,
      _toSend: null,
      status(value) {
        this._status = value;
        return this;
      },
      send(value) {
        this._toSend = value;
        return this;
      },
    };
    await getURL({
      params: {
        id: urlIdWithoutGET,
      },
    }, res);

    assert.strictEqual(res._toSend.error, 'This endpoint is not enabled for GET');
    assert.strictEqual(res._toSend.code, 403);
    assert.strictEqual(res._status, 403);
  });

  it ('Nonexistent id', async () => {
    const res = {
      _status: 0,
      _toSend: null,
      status(value) {
        this._status = value;
        return this;
      },
      send(value) {
        this._toSend = value;
        return this;
      },
    };
    await getURL({
      params: {
        id: v4(),
      },
    }, res);

    assert.strictEqual(res._toSend.error, 'Variable not found');
    assert.strictEqual(res._toSend.code, 404);
    assert.strictEqual(res._status, 404);
  });
});

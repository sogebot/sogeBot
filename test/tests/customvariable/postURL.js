/* global describe it before */

import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js'

import { v4 } from 'uuid';

import { Variable } from '../../../dest/database/entity/variable.js';
import { defaultPermissions } from '../../../dest/helpers/permissions/defaultPermissions.js';
import('../../general.js');
import { db } from '../../general.js';
import { message } from '../../general.js';
import {postURL} from '../../../dest/helpers/customvariables/postURL.js';

describe('Custom Variable - helpers/customvariables/postURL - @func1', () => {
  let urlId = v4();
  let urlIdWithoutPOST = v4();
  let urlIdWithResponse1 = v4();
  let urlIdWithResponse2 = v4();

  before(async () => {
    await db.cleanup();
    await message.prepare();

    Variable.create({
      variableName: '$_variable',
      readOnly: false,
      currentValue: '0',
      type: 'number',
      responseType: 2,
      permission: defaultPermissions.VIEWERS,
      evalValue: '',
      usableOptions: [],
      urls: [
        { GET: false, POST: true, showResponse: false, id: urlId },
        { GET: false, POST: false, showResponse: false, id: urlIdWithoutPOST }
      ]
    }).save();

    Variable.create({
      variableName: '$_variable2',
      readOnly: false,
      currentValue: '0',
      type: 'number',
      responseType: 0,
      permission: defaultPermissions.VIEWERS,
      evalValue: '',
      usableOptions: [],
      urls: [{ GET: false, POST: true, showResponse: true, id: urlIdWithResponse1 }]
    }).save();

    Variable.create({
      variableName: '$_variable3',
      readOnly: false,
      currentValue: '0',
      type: 'number',
      responseType: 1,
      responseText: 'This is custom update text: $value',
      permission: defaultPermissions.VIEWERS,
      evalValue: '',
      usableOptions: [],
      urls: [{ GET: false, POST: true, showResponse: true, id: urlIdWithResponse2 }]
    }).save();
  });

  it ('with enabled POST - correct value', async () => {
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
    await postURL({
      params: {
        id: urlId,
      },
      body: {
        value: 100,
      },
    }, res);
    assert.strictEqual(res._toSend.oldValue, '0');
    assert.strictEqual(res._toSend.value, '100');
    assert.strictEqual(res._toSend.code, undefined);
    assert.strictEqual(res._status, 200);
    await message.isNotSentRaw('@__bot__, $_variable2 was set to 101.', '__bot__');
    await message.isNotSentRaw('This is custom update text: 101', '__bot__');
  });

  it ('with enabled POST and response type 0 - correct value', async () => {
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
    await postURL({
      params: {
        id: urlIdWithResponse1,
      },
      body: {
        value: 101,
      },
    }, res);
    assert.strictEqual(res._toSend.oldValue, '0');
    assert.strictEqual(res._toSend.value, '101');
    assert.strictEqual(res._toSend.code, undefined);
    assert.strictEqual(res._status, 200);
    await message.isSentRaw('@__bot__, $_variable2 was set to 101.', '__bot__');
  });

  it ('with enabled POST and response type 1 - correct value', async () => {
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
    await postURL({
      params: {
        id: urlIdWithResponse2,
      },
      body: {
        value: 101,
      },
    }, res);
    assert.strictEqual(res._toSend.oldValue, '0');
    assert.strictEqual(res._toSend.value, '101');
    assert.strictEqual(res._toSend.code, undefined);
    assert.strictEqual(res._status, 200);
    await message.isSentRaw('This is custom update text: 101', '__bot__');
  });

  it ('with enabled POST - incorrect value', async () => {
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
    await postURL({
      params: {
        id: urlId,
      },
      body: {
        value: 'lorem ipsum',
      },
    }, res);

    assert.strictEqual(res._toSend.error, 'This value is not applicable for this endpoint');
    assert.strictEqual(res._toSend.code, 400);
    assert.strictEqual(res._status, 400);
  });

  it ('with disabled POST', async () => {
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
    await postURL({
      params: {
        id: urlIdWithoutPOST,
      },
    }, res);

    assert.strictEqual(res._toSend.error, 'This endpoint is not enabled for POST');
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
    await postURL({
      params: {
        id: v4(),
      },
    }, res);

    assert.strictEqual(res._toSend.error, 'Variable not found');
    assert.strictEqual(res._toSend.code, 404);
    assert.strictEqual(res._status, 404);
  });
});

/* global describe it before */

const assert = require('assert');

const { getRepository } = require('typeorm');
const v4 = require('uuid').v4;

const { Variable, VariableURL } = require('../../../dest/database/entity/variable');
const postURL = require('../../../dest/helpers/customvariables/postURL').postURL;
const { defaultPermissions } = require('../../../dest/helpers/permissions');
require('../../general.js');
const db = require('../../general.js').db;
const message = require('../../general.js').message;

describe('Custom Variable - helpers/customvariables/postURL', () => {
  let urlId;
  let urlIdWithoutPOST;
  let urlIdWithResponse;

  before(async () => {
    await db.cleanup();
    await message.prepare();

    const variable = await getRepository(Variable).save({
      variableName: '$_variable',
      readOnly: false,
      currentValue: 0,
      type: 'number',
      responseType: 2,
      permission: defaultPermissions.VIEWERS,
      evalValue: '',
      usableOptions: [],
    });
    urlId = (await getRepository(VariableURL).save({ GET: false, POST: true, showResponse: false, variableId: variable.id })).id;
    urlIdWithoutPOST = (await getRepository(VariableURL).save({ GET: false, POST: false, showResponse: false, variableId: variable.id })).id;
    urlIdWithResponse = (await getRepository(VariableURL).save({ GET: false, POST: true, showResponse: true, variableId: variable.id })).id;
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
    assert.strictEqual(res._toSend.oldValue, '0.0');
    assert.strictEqual(res._toSend.value, '100');
    assert.strictEqual(res._toSend.code, undefined);
    assert.strictEqual(res._status, 200);
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

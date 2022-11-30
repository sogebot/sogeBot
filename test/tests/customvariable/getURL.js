/* global describe it before */

const assert = require('assert');
const { AppDataSource } = require('../../../dest/database');

const v4 = require('uuid').v4;

const { Variable, VariableURL } = require('../../../dest/database/entity/variable');
const getURL = require('../../../dest/helpers/customvariables/getURL').getURL;
const { defaultPermissions } = require('../../../dest/helpers/permissions');
require('../../general.js');
const db = require('../../general.js').db;
const message = require('../../general.js').message;

describe('Custom Variable - helpers/customvariables/getURL - @func1', () => {
  let urlId;
  let urlIdWithoutGET;

  before(async () => {
    await db.cleanup();
    await message.prepare();

    const variable = await AppDataSource.getRepository(Variable).save({
      variableName: '$_variable',
      readOnly: false,
      currentValue: '0',
      type: 'number',
      responseType: 2,
      permission: defaultPermissions.VIEWERS,
      evalValue: '',
      usableOptions: [],
    });
    urlId = (await AppDataSource.getRepository(VariableURL).save({ GET: true, POST: false, showResponse: false, variableId: variable.id })).id;
    urlIdWithoutGET = (await AppDataSource.getRepository(VariableURL).save({ GET: false, POST: false, showResponse: false, variableId: variable.id })).id;
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

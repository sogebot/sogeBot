/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it before */

require('../../general.js');

const assert = require('assert');
const db = require('../../general.js').db;

describe('SQLVariableLimit should have correct value - @func1', () => {
  before(async () => {
    await db.cleanup();
  });

  if (process.env.TYPEORM_CONNECTION === 'postgres') {
    it('SQLVariableLimit should be 32767', () => {
      const { SQLVariableLimit } = require('../../../dest/helpers/sql');
      assert.strictEqual(SQLVariableLimit, 32767);
    });
  }

  if (process.env.TYPEORM_CONNECTION === 'mysql') {
    it('SQLVariableLimit should be 16382', () => {
      const { SQLVariableLimit } = require('../../../dest/helpers/sql');
      assert.strictEqual(SQLVariableLimit, 16382);
    });
  }

  if (process.env.TYPEORM_CONNECTION === 'better-sqlite3') {
    it('SQLVariableLimit should be 999', () => {
      const { SQLVariableLimit } = require('../../../dest/helpers/sql');
      assert.strictEqual(SQLVariableLimit, 999);
    });
  }
});

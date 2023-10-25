
/* global describe it before */

import('../../general.js');

import assert from 'assert';
import { db } from '../../general.js';

describe('SQLVariableLimit should have correct value - @func1', () => {
  before(async () => {
    await db.cleanup();
  });

  if (process.env.TYPEORM_CONNECTION === 'postgres') {
    it('SQLVariableLimit should be 32767', () => {
      import { SQLVariableLimit } from '../../../dest/helpers/sql.js.js';
      assert.strictEqual(SQLVariableLimit, 32767);
    });
  }

  if (process.env.TYPEORM_CONNECTION === 'mysql') {
    it('SQLVariableLimit should be 16382', () => {
      import { SQLVariableLimit } from '../../../dest/helpers/sql.js.js';
      assert.strictEqual(SQLVariableLimit, 16382);
    });
  }

  if (process.env.TYPEORM_CONNECTION === 'better-sqlite3') {
    it('SQLVariableLimit should be 999', () => {
      import { SQLVariableLimit } from '../../../dest/helpers/sql.js.js';
      assert.strictEqual(SQLVariableLimit, 999);
    });
  }
});

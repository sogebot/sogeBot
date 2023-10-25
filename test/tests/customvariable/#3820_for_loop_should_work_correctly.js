/* global describe it before */


import('../../general.js');

import { db } from '../../general.js';
import { message } from '../../general.js';
import { runScript } from '../../../dest/helpers/customvariables/runScript.js';
import assert from 'assert';

describe('Custom Variable - #3820 - For loop should work corectly - @func1', () => {
  let result = '';
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it ('Run for loop script', async () => {
    result = await runScript('let i = 0; for(let j=0; j<10; j++) { i++; } return i;', {});
  });

  it ('We should have eval result', async () => {
    assert.strictEqual(result, 10);
  });
});

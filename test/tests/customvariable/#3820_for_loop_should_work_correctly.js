/* global describe it before */


require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const runScript = (require('../../../dest/helpers/customvariables/runScript')).runScript;
const assert = require('assert');

describe('Custom Variable - #3820 - For loop should work corectly', () => {
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

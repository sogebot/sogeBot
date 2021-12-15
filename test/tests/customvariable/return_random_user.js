const assert = require('assert');

require('../../general.js');

const runScript = (require('../../../dest/helpers/customvariables/runScript')).runScript;
const db = require('../../general.js').db;
const message = require('../../general.js').message;
const user = require('../../general.js').user;

describe('Custom Variable - Return random user - @func1', () => {
  let result = '';
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
  });

  it ('Run infinite loop script', async () => {
    result = await runScript('return (await randomViewer()).username;', {});
  });

  it ('We should have some result', async () => {
    assert.strictEqual(result, '');
  });
});

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
    result = await runScript('return (await randomViewer()).userName;', {});
  });

  it ('We should have some result', async () => {
    assert.strictEqual([
      '__viewer__',
      '__viewer__2',
      '__viewer__3',
      '__viewer__4',
      '__viewer__5',
      '__viewer__6',
      '__viewer__7',
      '__mod__',
    ].includes(result), true);
  });
});

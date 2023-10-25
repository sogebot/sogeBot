import assert from 'assert';

import('../../general.js');

import { runScript } from '../../../dest/helpers/customvariables/runScript.js';
import { db, message, user } from '../../general.js';

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
      '__viewer2__',
      '__viewer3__',
      '__viewer4__',
      '__viewer5__',
      '__viewer6__',
      '__viewer7__',
      '__mod__',
    ].includes(result), true);
  });
});

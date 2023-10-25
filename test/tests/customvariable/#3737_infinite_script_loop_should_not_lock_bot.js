import('../../general.js');
import assert from 'assert';

import { runScript } from '../../../dest/helpers/customvariables/runScript.js';
import { db } from '../../general.js';
import { message } from '../../general.js';

describe('Custom Variable - #3737 - Infinite script loop should not lock bot - @func1', () => {
  let result = '';
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it ('Run infinite loop script', async () => {
    result = await runScript('let i = 0; while(true) { i++; } return i;', {});
  });

  it ('We should have loop error after 100000 operations', async () => {
    await message.debug('customvariables.eval', 'Running script seems to be in infinite loop.');
  });

  it ('We should have empty result', async () => {
    assert.strictEqual(result, '');
  });

  it ('Run normal loop script', async () => {
    result = await runScript('let i = 0; while(true) { if (i<10) { i++; } else { break; } } return i;', {});
  });

  it ('We should have eval result', async () => {
    assert.strictEqual(result, 10);
  });
});

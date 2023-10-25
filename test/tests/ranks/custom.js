/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it */
import('../../general.js');

import { db } from '../../general.js';
import { message } from '../../general.js';
const { prepare, viewer, owner } = require('../../general.js').user;
import assert from 'assert';

const ranks = (require('../../../dest/systems/ranks')).default;

describe('Ranks - custom rank - @func2', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await prepare();
  });

  it(`Set custom rank 'My amazing rank'`, async () => {
    const r = await ranks.set({ sender: owner, parameters: `${viewer.userName} My amazing rank` });
    assert.strictEqual(r[0].response, `$sender, you set My amazing rank to @__viewer__`);
  });

  it('Rank of user should be \'My amazing rank\'', async () => {
    const r = await ranks.main({ sender: viewer });
    assert.strictEqual(r[0].response, '$sender, you have My amazing rank rank');
  });

  it(`Unset custom rank`, async () => {
    const r = await ranks.unset({ sender: owner, parameters: `${viewer.userName}` });
    assert.strictEqual(r[0].response, `$sender, custom rank for @__viewer__ was unset`);
  });

  it('Rank of user should be empty', async () => {
    const r = await ranks.main({ sender: viewer });
    assert.strictEqual(r[0].response, '$sender, you don\'t have a rank yet');
  });
});

import('../../general.js');

import assert from 'assert';

const shortid = require('shortid');
import { AppDataSource } from '../../../dest/database.js';

const { Gallery } = require('../../../dest/database/entity/gallery');
import { db } from '../../general.js';

const id = shortid.generate();

describe('Gallery - #4969 - id can be shortid - @func3', () => {
  beforeEach(async () => {
    await db.cleanup();
  });

  it(`Save pseudo-file with shortid`, async () => {
    await AppDataSource.getRepository(Gallery).save({
      id, type: '', data: '', name: 'unknown',
    });
  });

  it(`Pseudo-file should exist in db`, async () => {
    const count = await AppDataSource.getRepository(Gallery).countBy({ id });
    assert.strictEqual(count, 1);
  });
});

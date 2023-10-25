import('../../general.js');

import assert from 'assert';

import {nanoid} from 'nanoid';
import { AppDataSource } from '../../../dest/database.js';

import { Gallery } from '../../../dest/database/entity/gallery.js';
import { db } from '../../general.js';

const id = nanoid();

describe('Gallery - #4969 - id can be nanoid - @func3', () => {
  beforeEach(async () => {
    await db.cleanup();
  });

  it(`Save pseudo-file with nanoid`, async () => {
    await AppDataSource.getRepository(Gallery).save({
      id, type: '', data: '', name: 'unknown',
    });
  });

  it(`Pseudo-file should exist in db`, async () => {
    const count = await AppDataSource.getRepository(Gallery).countBy({ id });
    assert.strictEqual(count, 1);
  });
});

/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it */
require('../../general.js');

const db = require('../../general.js').db;
const assert = require('assert');

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');

describe('Database - unicode chars can be saved', () => {
  before(async () => {
    await db.cleanup();
  });

  it('Save to db chars █▓░', async () => {
    await getRepository(User).save({ username: '█▓░' , userId: 12345 });
  });

  it('Should be saved correctly', async () => {
    const count = await getRepository(User).count();
    assert(count, 1);
  });
});

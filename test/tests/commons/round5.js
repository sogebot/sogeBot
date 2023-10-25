/* global describe it before */

import('../../general.js');

import { db, message, variable } from '../../general.js';
import  { round5 } from '../../../dest/helpers/commons/round5.js';

import assert from 'assert';

describe('lib/commons - @func2 - round5()', () => {
  it('6 => 5', async () => {
    assert.deepEqual(round5(6), 5);
  });
  it('10 => 10', async () => {
    assert.deepEqual(round5(10), 10);
  });
  it('50 => 50', async () => {
    assert.deepEqual(round5(50), 50);
  });
  it('9 => 10', async () => {
    assert.deepEqual(round5(9), 10);
  });
  it('159 => 160', async () => {
    assert.deepEqual(round5(159), 160);
  });
});
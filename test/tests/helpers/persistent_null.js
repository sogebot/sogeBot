
/* global describe it before */

import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js'

import { Settings } from '../../../dest/database/entity/settings.js';
import('../../general.js');
import { db } from '../../general.js';
import { time } from '../../general.js';

let stats;
let onChangeTriggered = 0;

describe('Persistent null - @func1', () => {
  before(async () => {
    await db.cleanup();
    const { persistent } =  await import('../../../dest/helpers/core/persistent.js');

    stats = persistent({
      value:     null,
      name:      'null',
      namespace: '/test',
      onChange:  () => {
        onChangeTriggered++;
      },
    });

    await new Promise((resolve) => {
      (function check () {
        if (!stats.__loaded__) {
          setImmediate(() => check());
        } else {
          resolve(true);
        }
      })();
    });
  });

  describe('null = test', () => {
    it('trigger change', () => {
      stats.value = 'test';
    });
    it('value should be changed in db', async () => {
      await time.waitMs(1000);
      const value = await AppDataSource.getRepository(Settings).findOneByOrFail({ name: 'null', namespace: '/test' });
      assert(JSON.parse(value.value) === 'test');
    });
  });

  describe('null = null', () => {
    it('trigger change', () => {
      stats.value = null;
    });
    it('value should be changed in db', async () => {
      await time.waitMs(1000);
      const value = await AppDataSource.getRepository(Settings).findOneByOrFail({ name: 'null', namespace: '/test' });
      assert(JSON.parse(value.value) === null);
    });
  });

  describe('On change should be triggered', () => {
    it('check on change value', () => {
      assert.strictEqual(onChangeTriggered, 2);
    });
  });
});

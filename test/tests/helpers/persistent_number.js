
/* global describe it before */

import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js'

import { Settings } from '../../../dest/database/entity/settings.js';
import('../../general.js');
import { db } from '../../general.js';
import { time } from '../../general.js';

let stats;
let onChangeTriggered = 0;

describe('Persistent number - @func1', () => {
  before(async () => {
    await db.cleanup();
    const { persistent } =  await import('../../../dest/helpers/core/persistent.js');

    stats = persistent({
      value:     0,
      name:      'number',
      namespace: '/test',
      onChange:  (val) => {
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

  describe('Number++', () => {
    it('trigger change', () => {
      stats.value++;
    });
    it('value should be changed in db', async () => {
      await time.waitMs(1000);
      const value = await AppDataSource.getRepository(Settings).findOneByOrFail({ name: 'number', namespace: '/test' });
      assert(JSON.parse(value.value) === 1);
    });
  });

  describe('Number--', () => {
    it('trigger change', () => {
      stats.value--;
    });
    it('value should be changed in db', async () => {
      await time.waitMs(1000);
      const value = await AppDataSource.getRepository(Settings).findOneByOrFail({ name: 'number', namespace: '/test' });
      assert(JSON.parse(value.value) === 0);
    });
  });

  describe('Number = 100', () => {
    it('trigger change', () => {
      stats.value = 100;
    });
    it('value should be changed in db', async () => {
      await time.waitMs(1000);
      const value = await AppDataSource.getRepository(Settings).findOneByOrFail({ name: 'number', namespace: '/test' });
      assert(JSON.parse(value.value) === 100);
    });
  });

  describe('On change should be triggered', () => {
    it('check on change value', () => {
      assert.strictEqual(onChangeTriggered, 3);
    });
  });
});

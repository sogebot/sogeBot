/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it before */

const assert = require('assert');
const { AppDataSource } = require('../../../dest/database');

const { Settings } = require('../../../dest/database/entity/settings');
require('../../general.js');
const db = require('../../general.js').db;
const time = require('../../general.js').time;

let stats;
let onChangeTriggered = 0;

describe('Persistent string - @func1', () => {
  before(async () => {
    await db.cleanup();
    const { persistent } =  require('../../../dest/helpers/core/persistent');

    stats = persistent({
      value:     '0',
      name:      'string',
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

  describe('string = test', () => {
    it('trigger change', () => {
      stats.value = 'test';
    });
    it('value should be changed in db', async () => {
      await time.waitMs(1000);
      const value = await AppDataSource.getRepository(Settings).findOneByOrFail({ name: 'string', namespace: '/test' });
      assert(JSON.parse(value.value) === 'test');
    });
  });

  describe('On change should be triggered', () => {
    it('check on change value', () => {
      assert.strictEqual(onChangeTriggered, 1);
    });
  });
});

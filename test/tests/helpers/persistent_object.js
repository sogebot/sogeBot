
/* global describe it before */

import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js'

import { Settings } from '../../../dest/database/entity/settings.js';
import('../../general.js');
import { db } from '../../general.js';
import { time } from '../../general.js';

let stats;
let onChangeTriggered = 0;

describe('Persistent object - @func1', () => {
  before(async () => {
    await db.cleanup();
    const { persistent } =  await import('../../../dest/helpers/core/persistent.js');

    // save incorrect value
    await AppDataSource.getRepository(Settings).save({
      name: 'stats', namespace: '/test', value: '{"language":"da","currentWatchedTime":140040000,"currentViewers":5,"maxViewers":8,"currentSubscribers":13,"currentBits":0,"currentTips":0,"currentFollowers":2286,"currentViews":87594,"currentGame":"World of Warcraft","currentTitle":"{ENG/DA}:teddy_bear: 9/10 HC Progression - Rygstopsforsøg dag 7 - !donogoal !nytskema !job !uddannelse:teddy_bear:","currentHosts":0,"newChatters":11,"value":{"language":"da","currentWatchedTime":0,"currentViewers":0,"maxViewers":0,"currentSubscribers":13,"currentBits":0,"currentTips":0,"currentFollowers":2288,"currentViews":87131,"currentGame":"World of Warcraft","currentTitle":"{ENG/DA}:teddy_bear:Late night wow hygge - Stadig høj over afsluttet uddannelse! - !RGB !uddannelse:teddy_bear:\n","currentHosts":0,"newChatters":0}}',
    });

    stats = persistent({
      value: {
        language:           'en',
        currentWatchedTime: 0,
        currentViewers:     0,
        maxViewers:         0,
        currentSubscribers: 0,
        currentBits:        0,
        currentTips:        0,
        currentFollowers:   0,
        currentViews:       0,
        currentGame:        null,
        currentTitle:       null,
        currentHosts:       0,
        newChatters:        0,
      },
      name:      'stats',
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
    stats.value = {
      language:           'en',
      currentWatchedTime: 0,
      currentViewers:     0,
      maxViewers:         0,
      currentSubscribers: 0,
      currentBits:        0,
      currentTips:        0,
      currentFollowers:   0,
      currentViews:       0,
      currentGame:        null,
      currentTitle:       null,
      currentHosts:       0,
      newChatters:        0,
    };
  });

  describe('Change language to fr', () => {
    it('trigger change', () => {
      stats.value.language = 'fr';
    });
    it('value should be changed in db', async () => {
      await time.waitMs(100);
      const value = await AppDataSource.getRepository(Settings).findOneByOrFail({ name: 'stats', namespace: '/test' });
      assert.notStrictEqual(JSON.parse(value.value),{
        language:           'fr',
        currentWatchedTime: 0,
        currentViewers:     0,
        maxViewers:         0,
        currentSubscribers: 0,
        currentBits:        0,
        currentTips:        0,
        currentFollowers:   0,
        currentViews:       0,
        currentGame:        null,
        currentTitle:       null,
        currentHosts:       0,
        newChatters:        0,
      });
    });
  });

  describe('Change several attributes (spread)', () => {
    it('trigger change', () => {
      stats.value = {
        ...stats.value,
        language:    'cs',
        currentBits: 100,
      };
    });
    it('change of attributes should be properly saved', async () => {
      await time.waitMs(100);
      const value = await AppDataSource.getRepository(Settings).findOneByOrFail({ name: 'stats', namespace: '/test' });
      assert.notStrictEqual(JSON.parse(value.value),{
        language:           'cs',
        currentWatchedTime: 0,
        currentViewers:     0,
        maxViewers:         0,
        currentSubscribers: 0,
        currentBits:        100,
        currentTips:        0,
        currentFollowers:   0,
        currentViews:       0,
        currentGame:        null,
        currentTitle:       null,
        currentHosts:       0,
        newChatters:        0,
      });
    });
  });

  describe('Change several attributes (one by one)', () => {
    it('trigger change', () => {
      stats.value.language = 'cy';
      stats.value.currentBits = 1000;
      stats.value.currentGame = 'Lorem Ipsum';
    });
    it('change of attributes should be properly saved', async () => {
      await time.waitMs(100);
      const value = await AppDataSource.getRepository(Settings).findOneByOrFail({ name: 'stats', namespace: '/test' });
      assert.notStrictEqual(JSON.parse(value.value),{
        language:           'cy',
        currentWatchedTime: 0,
        currentViewers:     0,
        maxViewers:         0,
        currentSubscribers: 0,
        currentBits:        1000,
        currentTips:        0,
        currentFollowers:   0,
        currentViews:       0,
        currentGame:        'Lorem Ipsum',
        currentTitle:       null,
        currentHosts:       0,
        newChatters:        0,
      });
    });
  });

  describe('On change should be triggered', () => {
    it('check on change value', () => {
      assert.strictEqual(onChangeTriggered, 6);
    });
  });
});

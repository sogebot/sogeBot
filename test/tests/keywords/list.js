/* global describe it */
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const assert = require('assert');

const { getRepository } = require('typeorm');
const { Keyword } = require('../../../dest/entity/keyword');
const { User } = require('../../../dest/entity/user');

// users
const owner = { username: 'soge__', userId: Math.random() };

const keywords = [
  { keyword: 'slqca', response: 'hptqm', enabled: Math.random() >= 0.5 },
  { keyword: 'urfiu', response: 'mtcjt', enabled: Math.random() >= 0.5 },
  { keyword: 'frqzw', response: 'lordw', enabled: Math.random() >= 0.5 },
  { keyword: 'awpgh', response: 'powyc', enabled: Math.random() >= 0.5 },
  { keyword: 'tanhq', response: 'tlygw', enabled: Math.random() >= 0.5 },
  { keyword: 'nvgqy', response: 'vjkvb', enabled: Math.random() >= 0.5 },
  { keyword: 'yulym', response: 'cvhis', enabled: Math.random() >= 0.5 },
  { keyword: 'xgbxs', response: 'fdezi', enabled: Math.random() >= 0.5 },
  { keyword: 'grgju', response: 'lgexv', enabled: Math.random() >= 0.5 },
  { keyword: 'mwhpv', response: 'pmuex', enabled: Math.random() >= 0.5 },
];

describe('Keywords - listing', () => {
  describe('Listing without any keywords', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await getRepository(User).save({ username: user.username, userId: user.userId });
    });

    it('Expecting empty list', async () => {
      await global.systems.keywords.list({ sender: owner, parameters: '' });
      await message.isSent('keywords.list-is-empty', owner);
    });
  });

  describe('Listing with keywords', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
    });

    for(const k of keywords) {
      it (`Creating random keyword | ${k.keyword} | ${k.response}`, async () => {
        const keyword = await global.systems.keywords.add({ sender: owner, parameters: `-k ${k.keyword} -r ${k.response}` });
        k.id = keyword.id;
        assert.notStrictEqual(k, null);
        await getRepository(Keyword).update({ id: keyword.id }, { enabled: k.enabled });
      });
    }

    it('Trigger list command', async () => {
      await global.systems.keywords.list({ sender: owner, parameters: '' });
    })

    it('List not empty', async () => {
      await message.isSent('keywords.list-is-not-empty', owner);
    })

    for(const k of keywords) {
      it(`List populated by ${k.keyword} | ${k.response}`, async () => {
        await message.isSentRaw(`${k.enabled ? '🗹' : '☐'} ${k.id} | ${k.keyword} | ${k.response}`, owner, 5000);
      });
    }
  });
});

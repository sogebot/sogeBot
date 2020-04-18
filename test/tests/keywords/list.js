/* global describe it */
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const assert = require('assert');

const keywords = (require('../../../dest/systems/keywords')).default;

const { getRepository } = require('typeorm');
const { Keyword } = require('../../../dest/database/entity/keyword');
const { User } = require('../../../dest/database/entity/user');

// users
const owner = { username: 'soge__', userId: Math.floor(Math.random() * 100000) };

const keywordsList = [
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
      await getRepository(User).save({ username: owner.username, userId: owner.userId });
    });

    it('Expecting empty list', async () => {
      const r = await keywords.list({ sender: owner, parameters: '' });
      assert.strictEqual(r[0].response, '$sender, list of keywords is empty');
    });
  });

  describe('Listing with keywords', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
    });

    for(const k of keywordsList) {
      it (`Creating random keyword | ${k.keyword} | ${k.response}`, async () => {
        const r = await keywords.add({ sender: owner, parameters: `-k ${k.keyword} -r ${k.response}` });
        const keyword = await getRepository(Keyword).findOne({ keyword: k.keyword });
        assert.strictEqual(r[0].response, `$sender, keyword ${k.keyword} (${keyword.id}) was added`);
        await getRepository(Keyword).update({ id: keyword.id }, { enabled: k.enabled });
      });
    }

    it('Expected populated list', async () => {
      const r = await keywords.list({ sender: owner, parameters: '' });
      assert.strictEqual(r[0].response, '$sender, list of keywords');

      let i = 0;
      for(const k of keywordsList.sort((a, b) => {
        const nameA = a.keyword.toUpperCase(); // ignore upper and lowercase
        const nameB = b.keyword.toUpperCase(); // ignore upper and lowercase
        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }

        // names must be equal
        return 0;
      })) {
        const keyword = await getRepository(Keyword).findOne({ keyword: k.keyword });
        assert.strictEqual(r[++i].response, `${k.enabled ? '🗹' : '☐'} ${keyword.id} | ${k.keyword} | ${k.response}`, JSON.stringify({k, r, i}, undefined, 2));
      };
    });
  });
});

/* global describe it beforeEach */
import('../../general.js');

import { db } from '../../general.js';
import { message, url } from '../../general.js';

import cooldown from '../../../dest/systems/cooldown.js'
import assert from 'assert';
// users
const owner = { userName: '__broadcaster__' };

describe('Cooldowns - set() - @func3', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('', async () => {
    const r = await cooldown.main({ sender: owner, parameters: '' });
    assert.strictEqual(r[0].response, 'Usage => ' + url + '/systems/cooldowns');
  });

  it('!alias', async () => {
    const r = await cooldown.main({ sender: owner, parameters: '!alias' });
    assert.strictEqual(r[0].response, 'Usage => ' + url + '/systems/cooldowns');
  });

  it('alias', async () => {
    const r = await cooldown.main({ sender: owner, parameters: 'alias' });
    assert.strictEqual(r[0].response, 'Usage => ' + url + '/systems/cooldowns');
  });

  it('test global 20', async () => {
    const r = await cooldown.main({ sender: owner, parameters: 'test global 20' });
    assert.strictEqual(r[0].response, '$sender, global cooldown for test was set to 20s');
  });

  it('test user 20', async () => {
    const r = await cooldown.main({ sender: owner, parameters: 'test user 20' });
    assert.strictEqual(r[0].response, '$sender, user cooldown for test was set to 20s');
  });

  it('!test global 20', async () => {
    const r = await cooldown.main({ sender: owner, parameters: '!test global 20' });
    assert.strictEqual(r[0].response, '$sender, global cooldown for !test was set to 20s');
  });

  it('!test user 20', async () => {
    const r = await cooldown.main({ sender: owner, parameters: '!test user 20' });
    assert.strictEqual(r[0].response, '$sender, user cooldown for !test was set to 20s');
  });

  it('test global 20 true', async () => {
    const r = await cooldown.main({ sender: owner, parameters: 'test global 20 true' });
    assert.strictEqual(r[0].response, '$sender, global cooldown for test was set to 20s');
  });

  it('test user 20 true', async () => {
    const r = await cooldown.main({ sender: owner, parameters: 'test user 20 true' });
    assert.strictEqual(r[0].response, '$sender, user cooldown for test was set to 20s');
  });

  it('!test global 20 true', async () => {
    const r = await cooldown.main({ sender: owner, parameters: '!test global 20 true' });
    assert.strictEqual(r[0].response, '$sender, global cooldown for !test was set to 20s');
  });

  it('!test user 20 true', async () => {
    const r = await cooldown.main({ sender: owner, parameters: '!test user 20 true' });
    assert.strictEqual(r[0].response, '$sender, user cooldown for !test was set to 20s');
  });

  it('!한국어 global 20 true', async () => {
    const r = await cooldown.main({ sender: owner, parameters: '!한국어 global 20 true' });
    assert.strictEqual(r[0].response, '$sender, global cooldown for !한국어 was set to 20s');
  });

  it('!한국어 user 20 true', async () => {
    const r = await cooldown.main({ sender: owner, parameters: '!한국어 user 20 true' });
    assert.strictEqual(r[0].response, '$sender, user cooldown for !한국어 was set to 20s');
  });

  it('한국어 global 20 true', async () => {
    const r = await cooldown.main({ sender: owner, parameters: '한국어 global 20 true' });
    assert.strictEqual(r[0].response, '$sender, global cooldown for 한국어 was set to 20s');
  });

  it('한국어 user 20 true', async () => {
    const r = await cooldown.main({ sender: owner, parameters: '한국어 user 20 true' });
    assert.strictEqual(r[0].response, '$sender, user cooldown for 한국어 was set to 20s');
  });

  it('!русский global 20 true', async () => {
    const r = await cooldown.main({ sender: owner, parameters: '!русский global 20 true' });
    assert.strictEqual(r[0].response, '$sender, global cooldown for !русский was set to 20s');
  });

  it('!русский user 20 true', async () => {
    const r = await cooldown.main({ sender: owner, parameters: '!русский user 20 true' });
    assert.strictEqual(r[0].response, '$sender, user cooldown for !русский was set to 20s');
  });

  it('русский global 20 true', async () => {
    const r = await cooldown.main({ sender: owner, parameters: 'русский global 20 true' });
    assert.strictEqual(r[0].response, '$sender, global cooldown for русский was set to 20s');
  });

  it('русский user 20 true', async () => {
    const r = await cooldown.main({ sender: owner, parameters: 'русский user 20 true' });
    assert.strictEqual(r[0].response, '$sender, user cooldown for русский was set to 20s');
  });

  it('unset OK', async () => {
    const r = await cooldown.unset({ sender: owner, parameters: '!test' });
    assert.strictEqual(r[0].response, '$sender, cooldown for !test was unset');
  });

  it('unset without param', async () => {
    const r = await cooldown.unset({ sender: owner, parameters: '' });
    assert.strictEqual(r[0].response, 'Usage => ' + url + '/systems/cooldowns');
  });
});

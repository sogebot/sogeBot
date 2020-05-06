/* global describe it beforeEach */
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const cooldown = (require('../../../dest/systems/cooldown')).default;
const assert = require('assert');
// users
const owner = { username: 'soge__' };

describe('Cooldowns - set()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('', async () => {
    const r = await cooldown.main({ sender: owner, parameters: '' });
    assert.strictEqual(r[0].response, 'Sorry, $sender, but this command is not correct, use !cooldown [keyword|!command] [global|user] [seconds] [true/false]');
  });

  it('!alias', async () => {
    const r = await cooldown.main({ sender: owner, parameters: '!alias' });
    assert.strictEqual(r[0].response, 'Sorry, $sender, but this command is not correct, use !cooldown [keyword|!command] [global|user] [seconds] [true/false]');
  });

  it('alias', async () => {
    const r = await cooldown.main({ sender: owner, parameters: 'alias' });
    assert.strictEqual(r[0].response, 'Sorry, $sender, but this command is not correct, use !cooldown [keyword|!command] [global|user] [seconds] [true/false]');
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
});

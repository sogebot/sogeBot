/* global describe it */
require('../../general.js');

const assert = require('assert');

const { getRepository } = require('typeorm');

const { User } = require('../../../dest/database/entity/user');
const Message = require('../../../dest/message').default;
const alias = (require('../../../dest/systems/alias')).default;
const cooldown = (require('../../../dest/systems/cooldown')).default;
const customcommands = (require('../../../dest/systems/customcommands')).default;
const ranks = (require('../../../dest/systems/ranks')).default;
const db = require('../../general.js').db;
const message = require('../../general.js').message;

const owner = { username: '__broadcaster__', userId: String(Math.floor(Math.random() * 100000)) };

describe('Message - list filter', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await getRepository(User).save({ username: owner.username, userId: owner.userId });
  });

  describe('(list.alias) should return proper message', () => {
    for (const aliasToCreate of ['!a', '!b', '!c']) {
      it('Add alias ' + aliasToCreate, async () => {
        const r = await alias.add({ sender: owner, parameters: `-a ${aliasToCreate} -c !me` });
        assert.strictEqual(r[0].response, `$sender, alias ${aliasToCreate} for !me was added`);
      });
    }

    it('(list.alias) should return created aliases', async () => {
      const r = await new Message('(list.alias)').parse({});
      assert.strictEqual(r, 'a, b, c');
    });

    it('(list.!alias) should return created aliases', async () => {
      const r = await new Message('(list.!alias)').parse({});
      assert.strictEqual(r, '!a, !b, !c');
    });
  });

  describe('(list.command) should return proper message', () => {
    for (const command of ['!a', '!b', '!c']) {
      it('Add command ' + command, async () => {
        const r = await customcommands.add({ sender: owner, parameters: `-c ${command} -r Lorem Ipsum` });
        assert.strictEqual(r[0].response, `$sender, command ${command} was added`);
      });
    }

    it('(list.command) should return created commands', async () => {
      const r = await new Message('(list.command)').parse({});
      assert.strictEqual(r, 'a, b, c');
    });

    it('(list.!command) should return created commands', async () => {
      const r = await new Message('(list.!command)').parse({});
      assert.strictEqual(r, '!a, !b, !c');
    });
  });

  describe('(list.cooldown) should return proper message', () => {
    it('!test user 20', async () => {
      const r = await cooldown.main({ sender: owner, parameters: '!test user 20' });
      assert.strictEqual(r[0].response, '$sender, user cooldown for !test was set to 20s');
    });

    it('test global 20 true', async () => {
      const r = await cooldown.main({ sender: owner, parameters: 'test global 20 true' });
      assert.strictEqual(r[0].response, '$sender, global cooldown for test was set to 20s');

    });

    it('(list.cooldown) should return created cooldowns', async () => {
      const r = await new Message('(list.cooldown)').parse({});
      assert.strictEqual(r, '!test: 20s, test: 20s');
    });
  });

  describe('(list.ranks) should return proper message', () => {
    it('test - 20h', async () => {
      const r = await ranks.add({ sender: owner, parameters: '20 test' });
      assert.strictEqual(r[0].response, '$sender, new rank viewer test(20hours) was added');
    });

    it('test2 - 40h', async () => {
      const r = await ranks.add({ sender: owner, parameters: '40 test2' });
      assert.strictEqual(r[0].response, '$sender, new rank viewer test2(40hours) was added');
    });

    it('(list.ranks) should return created ranks', async () => {
      const r = await new Message('(list.ranks)').parse({});
      assert.strictEqual(r, 'test (20h), test2 (40h)');
    });
  });

  describe('(list.core.<permissionName>) should return proper message', () => {
    it('(list.core.CASTERS) should return core commands', async () => {
      const r = await new Message('(list.core.CASTERS)').parse({});
      assert.strictEqual(r, '_debug, alert, alias, alias add, alias edit, alias group, alias list, alias remove, alias toggle, alias toggle-visibility, bansong, command, command add, command edit, command list, command remove, command toggle, command toggle-visibility, commercial, cooldown, cooldown toggle enabled, cooldown toggle followers, cooldown toggle moderators, cooldown toggle owners, cooldown toggle subscribers, cooldown unset, disable, enable, game set, highlight, highlight list, hltb, ignore add, ignore check, ignore remove, immune, keyword, keyword add, keyword edit, keyword list, keyword remove, keyword toggle, level change, makeitrain, permission exclude-add, permission exclude-rm, permission list, permit, playlist, playlist add, playlist import, playlist list, playlist remove, playlist set, playlist steal, points add, points all, points get, points online, points remove, points set, points undo, price, price list, price set, price toggle, price unset, queue clear, queue close, queue list, queue open, queue pick, queue random, quote add, quote remove, quote set, raffle open, raffle pick, raffle remove, rank add, rank add-flw, rank add-sub, rank edit, rank edit-flw, rank edit-sub, rank help, rank list, rank list-flw, rank list-sub, rank rm, rank rm-flw, rank rm-sub, rank set, rank unset, scrim stop, set, skipsong, snipe, timers, timers add, timers list, timers rm, timers set, timers toggle, timers unset, title set, top bits, top followage, top gifts, top level, top messages, top points, top subage, top submonths, top time, top tips, tts, unbansong');
    });

    it('(list.core.VIEWERS) should return core commands', async () => {
      const r = await new Message('(list.core.VIEWERS)').parse({});
      assert.strictEqual(r, 'age, bet, currentsong, followage, followers, game, lastseen, level, level buy, me, ping, points, points give, queue, queue join, quote, quote list, raffle, rank, snipe match, songrequest, subage, subs, time, title, uptime, vote, watched, wrongsong');
    });

    it('(list.!core.VIEWERS) should return core commands', async () => {
      const r = await new Message('(list.!core.VIEWERS)').parse({});
      assert.strictEqual(r, '!age, !bet, !currentsong, !followage, !followers, !game, !lastseen, !level, !level buy, !me, !ping, !points, !points give, !queue, !queue join, !quote, !quote list, !raffle, !rank, !snipe match, !songrequest, !subage, !subs, !time, !title, !uptime, !vote, !watched, !wrongsong');
    });
  });
});

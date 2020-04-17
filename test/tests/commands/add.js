/* global describe it beforeEach */
require('../../general.js');

const db = require('../../general.js').db;
const assert = require('assert');
const message = require('../../general.js').message;

const { permission } = require('../../../dest/helpers/permissions');

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');

const customcommands = (require('../../../dest/systems/customcommands')).default;

// users
const owner = { username: 'soge__', userId: Math.floor(Math.random() * 100000) };

const failedTests = [
  { permission: null, command: null, response: null },
  { permission: null, command: '!cmd', response: null },
  { permission: null, command: 'cmd', response: null },
  { permission: null, command: 'cmd', response: 'Lorem Ipsum Dolor Sit Amet' },
  { permission: null, command: null, response: 'Lorem Ipsum Dolor Sit Amet' },
  { permission: 'unknownpermission', command: '!cmd', response: 'Lorem Ipsum Dolor Sit Amet' },
  { permission: '0efd7b1c-e460-4167-8e06-8aaf2c170319', command: '!cmd', response: 'Lorem Ipsum Dolor Sit Amet' }, // unknown uuid
];

const successTests = [
  { permission: null, command: '!cmd', response: 'Lorem Ipsum Dolor Sit Amet 1' },
  { permission: null, command: '!한국어', response: 'Lorem Ipsum Dolor Sit Amet 2' },
  { permission: null, command: '!русский', response: 'Lorem Ipsum Dolor Sit Amet 3' },
  { permission: permission.VIEWERS, command: '!cmd', response: 'Lorem Ipsum Dolor Sit Amet 4' },
  { permission: 'casters', command: '!cmd', response: 'Lorem Ipsum Dolor Sit Amet 5' },
];

function generateCommand(opts) {
  const p = opts.permission ? '-p ' + opts.permission : '';
  const c = opts.command ? '-c ' + opts.command : '';
  const r = opts.response ? '-r ' + opts.response : '';
  return [p, c, r].join(' ');
}

describe('Custom Commands - add()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();

    await getRepository(User).save({ username: owner.username, userId: owner.userId });
  });

  describe('Expected parsed fail', () => {
    for (const t of failedTests) {
      it(generateCommand(t), async () => {
        const r = await customcommands.add({ sender: owner, parameters: generateCommand(t) });
        assert.strictEqual(r[0].response, 'Sorry, $sender, but this command is not correct, use !commands');
      });
    }
  });

  describe('Expected to pass', () => {
    for (const t of successTests) {
      it(generateCommand(t), async () => {
        const r = await customcommands.add({ sender: owner, parameters: generateCommand(t) });
        assert.strictEqual(r[0].response, '$sender, command ' + t.command + ' was added');

        customcommands.run({ sender: owner, message: t.command });
        await message.isSentRaw(t.response, owner);
      });
    }

    it('2x - !a Lorem Ipsum', async () => {
      const r = await customcommands.add({ sender: owner, parameters: '-c !a -r Lorem Ipsum' });
      const r2 = await customcommands.add({ sender: owner, parameters: '-c !a -r Lorem Ipsum' });

      assert.strictEqual(r[0].response, '$sender, command !a was added');
      assert.strictEqual(r2[0].response, '$sender, command !a was added');
    });
  });
});

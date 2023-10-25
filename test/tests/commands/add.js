/* global describe it beforeEach */
import('../../general.js');

import { db } from '../../general.js';
import assert from 'assert';
import { message } from '../../general.js';

import { defaultPermissions } from '../../../dest/helpers/permissions/defaultPermissions.js';
import { User } from '../../../dest/database/entity/user.js';
import { AppDataSource } from '../../../dest/database.js';

import customcommands from '../../../dest/systems/customcommands.js';

// users
const owner = { userName: '__broadcaster__', userId: String(Math.floor(Math.random() * 100000)) };

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
  { permission: defaultPermissions.VIEWERS, command: '!cmd', response: 'Lorem Ipsum Dolor Sit Amet 4' },
  { permission: 'casters', command: '!cmd', response: 'Lorem Ipsum Dolor Sit Amet 5' },
];

function generateCommand(opts) {
  const p = opts.permission ? '-p ' + opts.permission : '';
  const c = opts.command ? '-c ' + opts.command : '';
  const r = opts.response ? '-r ' + opts.response : '';
  return [p, c, r].join(' ');
}

describe('Custom Commands - @func1 - add()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();

    await AppDataSource.getRepository(User).save({ userName: owner.userName, userId: owner.userId });
  });

  describe('Expected parsed fail', () => {
    for (const t of failedTests) {
      it(generateCommand(t), async () => {
        const r = await customcommands.add({ sender: owner, parameters: generateCommand(t) });
        assert.strictEqual(r[0].response, 'Sorry, $sender, but this command is not correct, use !command');
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

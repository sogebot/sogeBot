/* global describe it beforeEach */
import('../../general.js');

import _ from 'lodash-es'
import assert from 'assert';

import { db } from '../../general.js';
import { message } from '../../general.js';

import customcommands from '../../../dest/systems/customcommands.js';
import { defaultPermissions } from '../../../dest/helpers/permissions/defaultPermissions.js';

import { User } from '../../../dest/database/entity/user.js';
import { AppDataSource } from '../../../dest/database.js';

// users
const owner = { userName: '__broadcaster__', userId: String(Math.floor(Math.random() * 100000)) };

const parseFailedTests = [
  { permission: null, command: null, rid: null, response: null },
  { permission: null, command: '!cmd', rid: null, response: null },
  { permission: null, command: '!cmd', rid: '1', response: null },
  { permission: null, command: 'cmd', rid: '1', response: null },
  { permission: null, command: 'cmd', response: 'Lorem Ipsum Dolor Sit Amet' },
  { permission: null, command: null, response: 'Lorem Ipsum Dolor Sit Amet' },
  { permission: 'unknownpermission', command: 'cmd', rid: '1', response: 'Lorem Ipsum Dolor Sit Amet' },
  { permission: '0efd7b1c-e460-4167-8e06-8aaf2c170319', command: 'cmd', rid: '1', response: 'Lorem Ipsum Dolor Sit Amet' }, // unknown uuid
];

const unknownCommandTests = [
  { permission: defaultPermissions.VIEWERS, command: '!cmd', rid: '1', response: 'Lorem Ipsum Dolor Sit Amet' },
];

const unknownResponseTests = [
  { permission: defaultPermissions.VIEWERS, command: '!cmd', rid: '2', response: 'Lorem Ipsum Dolor Sit Amet' },
];

const successTests = [
  { permission: null, command: '!cmd', rid: '1', response: 'Lorem Ipsum', edit: 'Dolor Ipsum'},
  { permission: defaultPermissions.VIEWERS, command: '!cmd', rid: '1', response: 'Lorem Ipsum', edit: 'Dolor Ipsum'},
  { permission: 'casters', command: '!cmd', rid: '1', response: 'Lorem Ipsum', edit: 'Dolor Ipsum'},
  { permission: null, command: '!한글', rid: '1', response: 'Lorem Ipsum', edit: 'Dolor Ipsum'},
  { permission: null, command: '!русский', rid: '1', response: 'Lorem Ipsum', edit: 'Dolor Ipsum'},
];

function generateCommand(opts) {
  const p = opts.permission ? '-p ' + opts.permission : '';
  const c = opts.command ? '-c ' + opts.command : '';
  const r = opts.response ? '-r ' + opts.response : '';
  const rid = opts.rid ? '-rid ' + opts.rid : '';
  return [p, c, r, rid].join(' ');
}

describe('Custom Commands - @func1 - edit()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();

    await AppDataSource.getRepository(User).save({ userName: owner.userName, userId: owner.userId });
  });

  describe('Expected parsed fail', () => {
    for (const t of parseFailedTests) {
      it(generateCommand(t), async () => {
        const r = await customcommands.edit({ sender: owner, parameters: generateCommand(t) });
        assert.strictEqual(r[0].response, 'Sorry, $sender, but this command is not correct, use !command');
      });
    }
  });

  describe('Expected command not found', () => {
    for (const t of unknownCommandTests) {
      it(generateCommand(t), async () => {
        const r = await customcommands.edit({ sender: owner, parameters: generateCommand(t) });
        assert.strictEqual(r[0].response, '$sender, command !cmd was not found in database');
      });
    }
  });

  describe('Expected response not found', () => {
    for (const t of unknownResponseTests) {
      it(generateCommand(t), async () => {
        const add = _.cloneDeep(t); delete add.rid;
        const r = await customcommands.add({ sender: owner, parameters: generateCommand(t) });
        assert.strictEqual(r[0].response, '$sender, command ' + t.command + ' was added');

        const r2 = await customcommands.edit({ sender: owner, parameters: generateCommand(t) });
        assert.strictEqual(r2[0].response, '$sender, response #2 of command !cmd was not found in database');
      });
    }
  });

  describe('Expected to pass', () => {
    for (const t of successTests) {
      it(generateCommand(t), async () => {
        const add = _.cloneDeep(t); delete add.rid;
        const r = await customcommands.add({ sender: owner, parameters: generateCommand(add) });
        assert.strictEqual(r[0].response, '$sender, command ' + t.command + ' was added');

        customcommands.run({ sender: owner, message: t.command });
        await message.isSentRaw(t.response, owner);

        const edit = _.cloneDeep(t);
        edit.response = edit.edit;
        const r2 = await customcommands.edit({ sender: owner, parameters: generateCommand(edit) });
        assert.strictEqual(r2[0].response, '$sender, command ' + t.command + ' is changed to \'' + t.edit + '\'');

        customcommands.run({ sender: owner, message: t.command });
        await message.isSentRaw(t.edit, owner);
      });
    }
    it('!a Lorem Ipsum -> !a Ipsum Lorem', async () => {
      const r = await customcommands.add({ sender: owner, parameters: '-c !a -r Lorem Ipsum' });
      assert.strictEqual(r[0].response, '$sender, command !a was added');

      customcommands.run({ sender: owner, message: '!a' });
      await message.isSentRaw('Lorem Ipsum', owner);

      const r2 = await customcommands.edit({ sender: owner, parameters: '-c !a -rid 1 -r Ipsum Lorem' });
      assert.strictEqual(r2[0].response, `$sender, command !a is changed to 'Ipsum Lorem'`);

      customcommands.run({ sender: owner, message: '!a' });
      await message.isSentRaw('Ipsum Lorem', owner);
    });
  });
});

/* global describe it beforeEach */
import('../../general.js');

import { db } from '../../general.js';
import { message } from '../../general.js';

import { defaultPermissions } from '../../../dest/helpers/permissions/defaultPermissions.js';
import alias from '../../../dest/systems/alias.js';
import assert from 'assert';
import { prepare } from '../../../dest/helpers/commons/prepare.js';

// users
const owner = { userName: '__broadcaster__' };

const failedTests = [
  { permission: null, alias: null, command: null },
  { permission: null, alias: '!alias', command: null },
  { permission: null, alias: '!alias', command: 'asd' },
  { permission: null, alias: 'alias', command: null },
  { permission: null, alias: 'alias', command: '!asd' },
  { permission: null, alias: 'alias', command: 'asd' },
  { permission: 'unknownpermission', alias: '!a', command: '!me' },
  { permission: '0efd7b1c-e460-4167-8e06-8aaf2c170319', alias: '!a', command: '!me' }, // unknown uuid
];

const successTests = [
  { permission: null, alias: '!a', command: '!me' },
  { permission: null, alias: '!한국어', command: '!me' },
  { permission: null, alias: '!русский', command: '!me' },
  { permission: null, alias: '!with link', command: '!me http://google.com' },
  { permission: null, alias: '!a with spaces', command: '!top messages' },
  { permission: defaultPermissions.VIEWERS, alias: '!a', command: '!me' },
  { permission: 'casters', alias: '!a', command: '!me' },
];

function generateCommand(opts) {
  const p = opts.permission ? '-p ' + opts.permission : '';
  const a = opts.alias ? '-a ' + opts.alias : '';
  const c = opts.command ? '-c ' + opts.command : '';
  return [p, a, c].join(' ');
}

describe('Alias - @func1 - add()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();
  });

  describe('Expected parsed fail', () => {
    for (const t of failedTests) {
      it(generateCommand(t), async () => {
        const r = await alias.add({ sender: owner, parameters: generateCommand(t) });
        assert.strictEqual(r[0].response, prepare('alias.alias-parse-failed'));
      });
    }
  });

  describe('Expected to pass', () => {
    for (const t of successTests) {
      it(generateCommand(t), async () => {
        const r = await alias.add({ sender: owner, parameters: generateCommand(t) });
        assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { ...t }));
      });
    }

    it('2x - -a !a -c !me', async () => {
      const r = await alias.add({ sender: owner, parameters: '-a !a -c !me' });
      assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: '!a', command: '!me' }));

      const r2 = await alias.add({ sender: owner, parameters: '-a !a -c !me' });
      assert.strictEqual(r2[0].response, prepare('alias.alias-was-added', { alias: '!a', command: '!me' }));
    });
  });
});

import { db, message } from '../../general.js';

import { defaultPermissions } from '../../../dest/helpers/permissions/defaultPermissions.js';
import alias from '../../../dest/systems/alias.js';
import assert from 'assert';
import { prepare } from '../../../dest/helpers/commons/prepare.js';

// users
const owner = { userName: '__broadcaster__' };

const parseFailedTests = [
  { permission: null, alias: null, command: null },
  { permission: null, alias: '!alias', command: null },
  { permission: null, alias: '!alias', command: 'uptime' },
];

const notFoundTests = [
  { permission: null, alias: '!unknown', command: '!uptime' },
];

const successTests = [
  {
    from: { permission: defaultPermissions.VIEWERS, alias: '!a', command: '!me' },
    to:   { permission: defaultPermissions.VIEWERS, alias: '!a', command: '!uptime' },
  },
  {
    from: { permission: 'casters', alias: '!a', command: '!me' },
    to:   { permission: defaultPermissions.VIEWERS, alias: '!a', command: '!uptime' },
  },
  {
    from: { permission: defaultPermissions.VIEWERS, alias: '!a', command: '!me' },
    to:   { permission: 'moderators', alias: '!a', command: '!uptime' },
  },
  {
    from: { permission: defaultPermissions.VIEWERS, alias: '!한국어', command: '!me' },
    to:   { permission: defaultPermissions.VIEWERS, alias: '!한국어', command: '!uptime' },
  },
  {
    from: { permission: defaultPermissions.VIEWERS, alias: '!русский', command: '!me' },
    to:   { permission: defaultPermissions.VIEWERS, alias: '!русский', command: '!uptime' },
  },
  {
    from: { permission: defaultPermissions.VIEWERS, alias: '!a with spaces', command: '!me' },
    to:   { permission: defaultPermissions.VIEWERS, alias: '!a with spaces', command: '!uptime' },
  },
];

function generateCommand(opts) {
  const p = opts.permission ? '-p ' + opts.permission : '';
  const a = opts.alias ? '-a ' + opts.alias : '';
  const c = opts.command ? '-c ' + opts.command : '';
  return [p, a, c].join(' ');
}

describe('Alias - @func1 - edit()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();
  });

  describe('Expected parsed fail', () => {
    for (const t of parseFailedTests) {
      it(generateCommand(t), async () => {
        const r = await alias.edit({ sender: owner, parameters: generateCommand(t) });
        assert.strictEqual(r[0].response, prepare('alias.alias-parse-failed'));
      });
    }
  });

  describe('Expected not found fail', () => {
    for (const t of notFoundTests) {
      it(generateCommand(t), async () => {
        const r = await alias.edit({ sender: owner, parameters: generateCommand(t) });
        assert.strictEqual(r[0].response, prepare('alias.alias-was-not-found', { alias: t.alias }));
      });
    }
  });

  describe('Expected to pass', () => {
    for (const t of successTests) {
      it(generateCommand(t.from) + ' => ' + generateCommand(t.to), async () => {
        const r = await alias.add({ sender: owner, parameters: generateCommand(t.from) });
        assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: t.from.alias, command: t.from.command }));

        const r2 = await alias.edit({ sender: owner, parameters: generateCommand(t.to) });
        assert.strictEqual(r2[0].response, prepare('alias.alias-was-edited', { alias: t.from.alias, command: t.to.command }));
      });
    }
  });
});

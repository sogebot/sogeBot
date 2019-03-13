/* global describe it beforeEach */
require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

const { permission } = require('../../../dest/permissions')

// users
const owner = { username: 'soge__' }

const parseFailedTests = [
  { permission: null, alias: null, command: null },
  { permission: null, alias: '!alias', command: null },
  { permission: null, alias: '!alias', command: 'uptime' },
]

const notFoundTests = [
  { permission: null, alias: '!unknown', command: '!uptime' },
]

const successTests = [
  {
    from: { permission: permission.VIEWERS, alias: '!a', command: '!me' },
    to: { permission: permission.VIEWERS, alias: '!a', command: '!uptime' },
  },
  {
    from: { permission: 'casters', alias: '!a', command: '!me' },
    to: { permission: permission.VIEWERS, alias: '!a', command: '!uptime' },
  },
  {
    from: { permission: permission.VIEWERS, alias: '!a', command: '!me' },
    to: { permission: 'moderators', alias: '!a', command: '!uptime' },
  },
  {
    from: { permission: permission.VIEWERS, alias: '!한국어', command: '!me' },
    to: { permission: permission.VIEWERS, alias: '!한국어', command: '!uptime' },
  },
  {
    from: { permission: permission.VIEWERS, alias: '!русский', command: '!me' },
    to: { permission: permission.VIEWERS, alias: '!русский', command: '!uptime' },
  },
  {
    from: { permission: permission.VIEWERS, alias: '!a with spaces', command: '!me' },
    to: { permission: permission.VIEWERS, alias: '!a with spaces', command: '!uptime' },
  },
]

function generateCommand(opts) {
  const p = opts.permission ? '-p ' + opts.permission : '';
  const a = opts.alias ? '-a ' + opts.alias : '';
  const c = opts.command ? '-c ' + opts.command : '';
  return [p, a, c].join(' ');
}

describe('Alias - edit()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()
  })

  describe('Expected parsed fail', () => {
    for (const t of parseFailedTests) {
      it(generateCommand(t), async () => {
        global.systems.alias.edit({ sender: owner, parameters: generateCommand(t) })
        await message.isSent('alias.alias-parse-failed', owner, { sender: owner.username })
      })
    }
  })

  describe('Expected not found fail', () => {
    for (const t of notFoundTests) {
      it(generateCommand(t), async () => {
        global.systems.alias.edit({ sender: owner, parameters: generateCommand(t) })
        await message.isSent('alias.alias-was-not-found', owner, { alias: t.alias, sender: owner.username })
      })
    }
  })

  describe('Expected to pass', () => {
    for (const t of successTests) {
      it(generateCommand(t.from) + ' => ' + generateCommand(t.to), async () => {
        global.systems.alias.add({ sender: owner, parameters: generateCommand(t.from) })
        await message.isSent('alias.alias-was-added', owner, { alias: t.from.alias, command: t.from.command, sender: owner.username })

        global.systems.alias.edit({ sender: owner, parameters: generateCommand(t.to) })
        await message.isSent('alias.alias-was-edited', owner, { alias: t.from.alias, command: t.to.command, sender: owner.username })
      })
    }
  })
})

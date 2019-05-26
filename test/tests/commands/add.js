/* global describe it beforeEach */
require('../../general.js')

const db = require('../../general.js').db
const assert = require('chai').assert
const message = require('../../general.js').message

const { permission } = require('../../../dest/permissions')

// users
const owner = { username: 'soge__', userId: Math.random() }

const failedTests = [
  { permission: null, command: null, response: null },
  { permission: null, command: '!cmd', response: null },
  { permission: null, command: 'cmd', response: null },
  { permission: null, command: 'cmd', response: 'Lorem Ipsum Dolor Sit Amet' },
  { permission: null, command: null, response: 'Lorem Ipsum Dolor Sit Amet' },
  { permission: 'unknownpermission', command: '!cmd', response: 'Lorem Ipsum Dolor Sit Amet' },
  { permission: '0efd7b1c-e460-4167-8e06-8aaf2c170319', command: '!cmd', response: 'Lorem Ipsum Dolor Sit Amet' }, // unknown uuid
]

const successTests = [
  { permission: null, command: '!cmd', response: 'Lorem Ipsum Dolor Sit Amet 1' },
  { permission: null, command: '!한국어', response: 'Lorem Ipsum Dolor Sit Amet 2' },
  { permission: null, command: '!русский', response: 'Lorem Ipsum Dolor Sit Amet 3' },
  { permission: permission.VIEWERS, command: '!cmd', response: 'Lorem Ipsum Dolor Sit Amet 4' },
  { permission: 'casters', command: '!cmd', response: 'Lorem Ipsum Dolor Sit Amet 5' },
]

function generateCommand(opts) {
  const p = opts.permission ? '-p ' + opts.permission : '';
  const c = opts.command ? '-c ' + opts.command : '';
  const r = opts.response ? '-r ' + opts.response : '';
  return [p, c, r].join(' ');
}

describe('Custom Commands - add()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()

    await global.db.engine.insert('users', { username: owner.username, id: owner.userId })
  })

  describe('Expected parsed fail', () => {
    for (const t of failedTests) {
      it(generateCommand(t), async () => {
        global.systems.customCommands.add({ sender: owner, parameters: generateCommand(t) })
        await message.isSent('customcmds.commands-parse-failed', owner, { sender: owner.username })
      })
    }
  })

  describe('Expected to pass', () => {
    for (const t of successTests) {
      it(generateCommand(t), async () => {
        global.systems.customCommands.add({ sender: owner, parameters: generateCommand(t) })
        await message.isSent('customcmds.command-was-added', owner, { response: t.response, command: t.command, sender: owner.username })

        global.systems.customCommands.run({ sender: owner, message: t.command })
        await message.isSentRaw(t.response, owner)
      })
    }

    it('2x - !a Lorem Ipsum', async () => {
      global.systems.customCommands.add({ sender: owner, parameters: '-c !a -r Lorem Ipsum' })
      await message.isSent('customcmds.command-was-added', owner, { response: 'Lorem Ipsum', command: '!a', sender: owner.username })

      global.systems.customCommands.add({ sender: owner, parameters: '-c !a -r Lorem Ipsum' })
      await message.isSent('customcmds.command-was-added', owner, { response: 'Lorem Ipsum', command: '!a', sender: owner.username })
    })
  })
})

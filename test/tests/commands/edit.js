/* global describe it beforeEach */
require('../../general.js')

const _ = require('lodash')

const db = require('../../general.js').db
const message = require('../../general.js').message

const { permission } = require('../../../dest/permissions')

// users
const owner = { username: 'soge__', userId: Math.random() }

const parseFailedTests = [
  { permission: null, command: null, rid: null, response: null },
  { permission: null, command: '!cmd', rid: null, response: null },
  { permission: null, command: '!cmd', rid: '1', response: null },
  { permission: null, command: 'cmd', rid: '1', response: null },
  { permission: null, command: 'cmd', response: 'Lorem Ipsum Dolor Sit Amet' },
  { permission: null, command: null, response: 'Lorem Ipsum Dolor Sit Amet' },
  { permission: 'unknownpermission', command: 'cmd', rid: '1', response: 'Lorem Ipsum Dolor Sit Amet' },
  { permission: '0efd7b1c-e460-4167-8e06-8aaf2c170319', command: 'cmd', rid: '1', response: 'Lorem Ipsum Dolor Sit Amet' }, // unknown uuid
]

const unknownCommandTests = [
  { permission: permission.VIEWERS, command: '!cmd', rid: '1', response: 'Lorem Ipsum Dolor Sit Amet' },
]

const unknownResponseTests = [
  { permission: permission.VIEWERS, command: '!cmd', rid: '2', response: 'Lorem Ipsum Dolor Sit Amet' },
]

const successTests = [
  { permission: null, command: '!cmd', rid: '1', response: 'Lorem Ipsum', edit: 'Dolor Ipsum'},
  { permission: permission.VIEWERS, command: '!cmd', rid: '1', response: 'Lorem Ipsum', edit: 'Dolor Ipsum'},
  { permission: 'casters', command: '!cmd', rid: '1', response: 'Lorem Ipsum', edit: 'Dolor Ipsum'},
  { permission: null, command: '!한글', rid: '1', response: 'Lorem Ipsum', edit: 'Dolor Ipsum'},
  { permission: null, command: '!русский', rid: '1', response: 'Lorem Ipsum', edit: 'Dolor Ipsum'},
]

function generateCommand(opts) {
  const p = opts.permission ? '-p ' + opts.permission : '';
  const c = opts.command ? '-c ' + opts.command : '';
  const r = opts.response ? '-r ' + opts.response : '';
  const rid = opts.rid ? '-rid ' + opts.rid : '';
  return [p, c, r, rid].join(' ');
}

describe('Custom Commands - edit()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()

    await global.db.engine.insert('users', { username: owner.username, id: owner.userId })
  })

  describe('Expected parsed fail', () => {
    for (const t of parseFailedTests) {
      it(generateCommand(t), async () => {
        global.systems.customCommands.edit({ sender: owner, parameters: generateCommand(t) })
        await message.isSent('customcmds.commands-parse-failed', owner, { sender: owner.username })
      })
    }
  })

  describe('Expected command not found', () => {
    for (const t of unknownCommandTests) {
      it(generateCommand(t), async () => {
        global.systems.customCommands.edit({ sender: owner, parameters: generateCommand(t) })
        await message.isSent('customcmds.command-was-not-found', owner, { command: t.command, sender: owner.username })
      })
    }
  })

  describe('Expected response not found', () => {
    for (const t of unknownResponseTests) {
      it(generateCommand(t), async () => {
        const add = _.cloneDeep(t); delete add.rid;
        global.systems.customCommands.add({ sender: owner, parameters: generateCommand(add) })
        await message.isSent('customcmds.command-was-added', owner, { command: t.command, response: t.response, sender: owner.username })

        global.systems.customCommands.edit({ sender: owner, parameters: generateCommand(t) })
        await message.isSent('customcmds.response-was-not-found', owner, { command: t.command, response: t.rid, sender: owner.username })
      })
    }
  })

  describe('Expected to pass', () => {
    for (const t of successTests) {
      it(generateCommand(t), async () => {
        const add = _.cloneDeep(t); delete add.rid;
        global.systems.customCommands.add({ sender: owner, parameters: generateCommand(add) })
        await message.isSent('customcmds.command-was-added', owner, { command: t.command, response: t.response, sender: owner.username })

        global.systems.customCommands.run({ sender: owner, message: t.command })
        await message.isSentRaw(t.response, owner)

        const edit = _.cloneDeep(t);
        edit.response = edit.edit;
        global.systems.customCommands.edit({ sender: owner, parameters: generateCommand(edit) })
        await message.isSent('customcmds.command-was-edited', owner, { command: t.command, response: t.edit, sender: owner.username })

        global.systems.customCommands.run({ sender: owner, message: t.command })
        await message.isSentRaw(t.edit, owner)
      })
    }
    it('!a Lorem Ipsum -> !a Ipsum Lorem', async () => {
      global.systems.customCommands.add({ sender: owner, parameters: '-c !a -r Lorem Ipsum' })
      await message.isSent('customcmds.command-was-added', owner, { command: '!a', response: 'Lorem Ipsum', sender: owner.username })

      global.systems.customCommands.run({ sender: owner, message: '!a' })
      await message.isSentRaw('Lorem Ipsum', owner)

      global.systems.customCommands.edit({ sender: owner, parameters: '-c !a -rid 1 -r Ipsum Lorem' })
      await message.isSent('customcmds.command-was-edited', owner, { command: '!a', response: 'Ipsum Lorem', sender: owner.username })

      global.systems.customCommands.run({ sender: owner, message: '!a' })
      await message.isSentRaw('Ipsum Lorem', owner)
    })
  })
})

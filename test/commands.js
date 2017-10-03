/* global describe it beforeEach afterEach */

const assert = require('chai').assert
const until = require('test-until')
const _ = require('lodash')
const crypto = require('crypto')
require('./general.js')

// users
const owner = { username: 'soge__' }

// load up a bot
require('../main.js')

describe('System - Custom Commands', () => {
  beforeEach(function () {
    global.commons.sendMessage.reset()
  })
  afterEach(async function () {
    let items = await global.db.engine.find('commands')
    _.each(items, async (item) => {
      await global.db.engine.remove('commands', { _id: item._id })
    })
    items = await global.db.engine.find('settings')
    _.each(items, async (item) => {
      await global.db.engine.remove('settings', { _id: item._id })
    })
  })
  describe('#fnc', () => {
    describe('add()', () => {
      it('text: /empty/', async () => {
        global.systems.customCommands.add(global.systems.customCommands, owner, '')
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        let item = await global.db.engine.findOne('commands', { text: '' })

        assert.equal(global.commons.sendMessage.getCall(0).args[0], global.translate('customcmds.failed.parse'))
        assert.empty(item)
      })
      it('text: !me Lorem Ipsum', async () => {
        global.systems.customCommands.add(global.systems.customCommands, owner, '!me Lorem Ipsum')
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        let item = await global.db.engine.findOne('commands', { command: 'me' })

        assert.equal(global.commons.sendMessage.getCall(0).args[0], global.translate('core.isRegistered').replace(/\$keyword/g, '!me'))
        assert.empty(item)
      })
      it('text: !randomid Lorem Ipsum', async () => {
        let id = crypto.randomBytes(4).toString('hex')
        global.systems.customCommands.add(global.systems.customCommands, owner, `!${id} Lorem Ipsum`)
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        let item = await global.db.engine.findOne('commands', { command: id })

        assert.equal(global.commons.sendMessage.getCall(0).args[0], global.translate('customcmds.success.add'))
        assert.notEmpty(item)
        assert.equal(item.response, 'Lorem Ipsum')
        assert.equal(item.command, id)

        global.commons.sendMessage.reset()
        global.parser.parse(owner, `!${id}`)
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        assert.equal(global.commons.sendMessage.getCall(0).args[0], 'Lorem Ipsum')
      })
    })
    describe('list()', () => {
      it('list: /empty/', async () => {
        global.systems.customCommands.list(global.systems.customCommands, owner)
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        assert.equal(global.commons.sendMessage.getCall(0).args[0],
          global.translate('customcmds.failed.list'))
      })
      it('list: /not empty/', async () => {
        global.systems.customCommands.add(global.systems.customCommands, owner, '!' + crypto.randomBytes(4).toString('hex') + ' Lorem Ipsun')
        global.systems.customCommands.add(global.systems.customCommands, owner, '!' + crypto.randomBytes(4).toString('hex') + ' Lorem Ipsum')
        await until(() => global.commons.sendMessage.calledTwice, 5000)

        global.commons.sendMessage.reset()
        global.systems.customCommands.list(global.systems.customCommands, owner)
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        assert.isTrue(global.commons.sendMessage.firstCall.args[0].startsWith(
          global.translate('customcmds.success.list')))
      })
    })
    describe('toggle()', () => {
      it('text: /empty/', async () => {
        global.systems.customCommands.toggle(global.systems.customCommands, owner, '')
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        assert.equal(global.commons.sendMessage.getCall(0).args[0],
          global.translate('customcmds.failed.parse'))
      })
      it('commands: /incorrect commands/', async () => {
        global.systems.customCommands.toggle(global.systems.customCommands, owner, '!asdasd')
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        assert.equal(global.commons.sendMessage.getCall(0).args[0],
          global.translate('customcmds.failed.toggle')
            .replace(/\$command/g, 'asdasd'))
      })
      it('text: /correct commands/', async () => {
        let id = crypto.randomBytes(4).toString('hex')
        global.systems.customCommands.add(global.systems.customCommands, owner, `!${id} Lorem Ipsum`)
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        await global.systems.customCommands.toggle(global.systems.customCommands, owner, `!${id}`)
        await global.systems.customCommands.toggle(global.systems.customCommands, owner, `!${id}`)
        await until(() => global.commons.sendMessage.calledThrice, 5000)
        assert.equal(global.commons.sendMessage.secondCall.args[0],
          global.translate('customcmds.success.disabled')
            .replace(/\$command/g, id))
        assert.equal(global.commons.sendMessage.thirdCall.args[0],
          global.translate('customcmds.success.enabled')
            .replace(/\$command/g, id))
      })
    })
    describe('visible()', () => {
      it('text: /empty/', async () => {
        global.systems.customCommands.visible(global.systems.customCommands, owner, '')
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        assert.equal(global.commons.sendMessage.getCall(0).args[0],
          global.translate('customcmds.failed.parse'))
      })
      it('commands: /incorrect commands/', async () => {
        global.systems.customCommands.visible(global.systems.customCommands, owner, '!asdasd')
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        assert.equal(global.commons.sendMessage.getCall(0).args[0],
          global.translate('customcmds.failed.visible')
            .replace(/\$command/g, 'asdasd'))
      })
      it('text: /correct commands/', async () => {
        let id = crypto.randomBytes(4).toString('hex')
        global.systems.customCommands.add(global.systems.customCommands, owner, `!${id} Lorem Ipsum`)
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        await global.systems.customCommands.visible(global.systems.customCommands, owner, `!${id}`)
        await global.systems.customCommands.visible(global.systems.customCommands, owner, `!${id}`)
        await until(() => global.commons.sendMessage.calledThrice, 5000)
        assert.equal(global.commons.sendMessage.secondCall.args[0],
          global.translate('customcmds.success.invisible')
            .replace(/\$command/g, id))
        assert.equal(global.commons.sendMessage.thirdCall.args[0],
          global.translate('customcmds.success.visible')
            .replace(/\$command/g, id))
      })
    })
    describe('remove()', () => {
      it('text: /empty/', async () => {
        global.systems.customCommands.remove(global.systems.customCommands, owner, '')
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        assert.equal(global.commons.sendMessage.getCall(0).args[0],
          global.translate('customcmds.failed.parse'))
      })
      it('text: /incorrect id/', async () => {
        global.systems.customCommands.remove(global.systems.customCommands, owner, '!asdasd')
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        assert.equal(global.commons.sendMessage.getCall(0).args[0],
          global.translate('customcmds.failed.remove'))
      })
      it('text: /correct id/', async () => {
        let id = crypto.randomBytes(4).toString('hex')
        global.systems.customCommands.add(global.systems.customCommands, owner, `!${id} Lorem Ipsum`)
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        let item = await global.db.engine.findOne('commands', { command: id })
        assert.isNotEmpty(item)

        await global.systems.customCommands.remove(global.systems.customCommands, owner, `!${id}`)
        await until(() => global.commons.sendMessage.calledTwice, 5000)
        assert.equal(global.commons.sendMessage.secondCall.args[0],
          global.translate('customcmds.success.remove'))
        assert.isFalse(global.parser.isRegistered(id))
      })
    })
  })
})

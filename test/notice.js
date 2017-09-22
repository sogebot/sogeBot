/* global describe it before beforeEach afterEach */

const fs = require('fs')
const assert = require('chai').assert
const until = require('test-until')
const _ = require('lodash')
require('mocha-sinon')

// setup config
const config = require('../config.json')
config.settings.bot_owners = 'soge__'
config.settings.broadcaster_username = 'soge__'
fs.writeFileSync('../config.json', JSON.stringify(config))

// users
const owner = { username: 'soge__' }

// load up a bot
require('../main.js')

describe('System - Notice', () => {
  beforeEach(async function () {
    this.sinon.stub(global.commons, 'sendMessage')
  })
  afterEach(async function () {
    let items = await global.db.engine.find('notices')
    _.each(items, async (item) => {
      await global.db.engine.remove('notices', { _id: item._id })
    })
  })
  describe('#fnc', () => {
    describe('add()', () => {
      it('text: /empty/', async () => {
        global.systems.notice.add(global.systems.notice, owner, '')
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        let item = await global.db.engine.findOne('notices', { text: '' })

        assert.equal(global.commons.sendMessage.getCall(0).args[0], global.translate('notice.failed.parse'))
        assert.empty(item)
      })
      it('text: Lorem Ipsum', async () => {
        global.systems.notice.add(global.systems.notice, owner, 'Lorem Ipsum')
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        let item = await global.db.engine.findOne('notices', { text: 'Lorem Ipsum' })

        assert.equal(global.commons.sendMessage.getCall(0).args[0], global.translate('notice.success.add'))
        assert.notEmpty(item)
        assert.equal(item.text, 'Lorem Ipsum')
      })
    })
    describe('list()', () => {
      it('list: /empty/', async () => {
        global.systems.notice.list(global.systems.notice, owner)
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        assert.equal(global.commons.sendMessage.getCall(0).args[0],
          global.translate('notice.failed.list'))
      })
      it('list: /not empty/', async () => {
        global.systems.notice.add(global.systems.notice, owner, 'test 1')
        global.systems.notice.add(global.systems.notice, owner, 'test 2')
        global.systems.notice.list(global.systems.notice, owner)
        await until(() => global.commons.sendMessage.calledThrice, 5000)
        assert.isTrue(global.commons.sendMessage.thirdCall.args[0].startsWith(
          global.translate('notice.success.list')))
      })
    })
    describe('get()', () => {
      it('text: /empty/', async () => {
        global.systems.notice.get(global.systems.notice, owner, '')
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        assert.equal(global.commons.sendMessage.getCall(0).args[0],
          global.translate('notice.failed.parse'))
      })
      it('text: /incorrect id/', async () => {
        global.systems.notice.get(global.systems.notice, owner, 'asdasd')
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        assert.equal(global.commons.sendMessage.getCall(0).args[0],
          global.translate('notice.failed.notFound'))
      })
      it('text: /correct id/', async () => {
        global.systems.notice.add(global.systems.notice, owner, 'Lorem Ipsum')
        let item = await global.db.engine.findOne('notices', { text: 'Lorem Ipsum' })
        assert.isNotEmpty(item)

        global.systems.notice.get(global.systems.notice, owner, item._id)
        await until(() => global.commons.sendMessage.calledTwice, 5000)
        assert.equal(global.commons.sendMessage.secondCall.args[0],
          'Notice#' + item._id + ': ' + item.text)
      })
    })
    describe('toggle()', () => {
      it('text: /empty/', async () => {
        global.systems.notice.toggle(global.systems.notice, owner, '')
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        assert.equal(global.commons.sendMessage.getCall(0).args[0],
          global.translate('notice.failed.parse'))
      })
      it('text: /incorrect id/', async () => {
        global.systems.notice.toggle(global.systems.notice, owner, 'asdasd')
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        assert.equal(global.commons.sendMessage.getCall(0).args[0],
          global.translate('notice.failed.toggle')
            .replace(/\$notice/g, 'asdasd'))
      })
      it('text: /correct id/', async () => {
        global.systems.notice.add(global.systems.notice, owner, 'Lorem Ipsum')
        let item = await global.db.engine.findOne('notices', { text: 'Lorem Ipsum' })
        assert.isNotEmpty(item)

        await global.systems.notice.toggle(global.systems.notice, owner, item._id)
        await global.systems.notice.toggle(global.systems.notice, owner, item._id)
        await until(() => global.commons.sendMessage.calledThrice, 5000)
        assert.equal(global.commons.sendMessage.secondCall.args[0],
          global.translate('notice.success.disabled')
            .replace(/\$notice/g, item._id))
        assert.equal(global.commons.sendMessage.thirdCall.args[0],
          global.translate('notice.success.enabled')
            .replace(/\$notice/g, item._id))
      })
    })
    describe('remove()', () => {
      it('text: /empty/', async () => {
        global.systems.notice.remove(global.systems.notice, owner, '')
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        assert.equal(global.commons.sendMessage.getCall(0).args[0],
          global.translate('notice.failed.parse'))
      })
      it('text: /incorrect id/', async () => {
        global.systems.notice.remove(global.systems.notice, owner, 'asdasd')
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        assert.equal(global.commons.sendMessage.getCall(0).args[0],
          global.translate('notice.failed.notFound'))
      })
      it('text: /correct id/', async () => {
        global.systems.notice.add(global.systems.notice, owner, 'Lorem Ipsum')
        let item = await global.db.engine.findOne('notices', { text: 'Lorem Ipsum' })
        assert.isNotEmpty(item)

        await global.systems.notice.remove(global.systems.notice, owner, item._id)
        await until(() => global.commons.sendMessage.calledTwice, 5000)
        assert.equal(global.commons.sendMessage.secondCall.args[0],
          global.translate('notice.success.remove'))
      })
    })
  })
  describe('#send', () => {
    describe('0min, 5msgs', () => {
      before(async function () {
        global.commons.sendMessage.reset()
        global.parser.parse(owner, '!set noticeInterval 0')
        global.parser.parse(owner, '!set noticeMsgReq 5')
        await global.systems.notice.add(global.systems.notice, owner, 'Lorem Ipsum')
        await until(() => global.commons.sendMessage.callCount === 3, 5000)
      })
      it('sent twice after 10 messages', async () => {
        for (var i in _.range(5)) {
          global.parser.parse(owner, i)
        }
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        for (var j in _.range(5)) {
          global.parser.parse(owner, j)
        }
        await until(() => global.commons.sendMessage.calledTwice, 5000)
        assert.equal(global.commons.sendMessage.getCall(0).args[0], 'Lorem Ipsum')
        assert.equal(global.commons.sendMessage.getCall(1).args[0], 'Lorem Ipsum')
      })
    })
    describe('1s, 0msgs', () => {
      before(async function () {
        global.commons.sendMessage.reset()
        await global.db.engine.update('settings', { key: 'noticeInterval' }, { value: 0.015 })
        global.parser.parse(owner, '!set noticeMsgReq 0')
        await global.systems.notice.add(global.systems.notice, owner, 'Lorem Ipsum')
        await until(() => global.commons.sendMessage.callCount === 2, 5000)
      })
      it('sent thrice after 3s', async () => {
        await until(() => global.commons.sendMessage.calledThrice, 5000)
        assert.equal(global.commons.sendMessage.getCall(0).args[0], 'Lorem Ipsum')
        assert.equal(global.commons.sendMessage.getCall(1).args[0], 'Lorem Ipsum')
        assert.equal(global.commons.sendMessage.getCall(2).args[0], 'Lorem Ipsum')
      })
    })
  })
})

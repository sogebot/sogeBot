/* global describe it before beforeEach after */

const fs = require('fs')
const assert = require('chai').assert
const until = require('test-until')
const _ = require('lodash')
require('mocha-sinon')

// setup config
const config = require('../config.json')
config.settings.bot_owners = 'soge__'
config.settings.broadcaster_username = 'soge__'
_.each(config.systems, (system, key) => {
  config.systems[key] = false
})
config.systems.notice = true
fs.writeFileSync('../config.json', JSON.stringify(config))

// users
const owner = { username: 'soge__' }

// load up a bot
require('../main.js')

describe('System - Notice', () => {
  beforeEach(async function () {
    this.sinon.stub(global.commons, 'sendMessage')
    let items = await global.db.engine.find('notices')
    _.each(items, async (item) => {
      await global.db.engine.remove('notices', { _id: item._id })
    })
  })
  describe('#settings', () => {
    describe('noticeInterval', () => {
      describe('/num/', function () {
        before(function () {
          global.parser.parse(owner, '!set noticeInterval 15')
        })
        it('success message expected', async function () {
          await until(() => global.commons.sendMessage.calledOnce, 5000)

          let message = global.commons.sendMessage.getCall(0).args[0]
          assert.equal(message, global.translate('notice.settings.noticeInterval').replace('$value', 15))
        })
        it('should be set in db', async function () {
          let item = await global.db.engine.findOne('settings', { key: 'noticeInterval' })
          assert.isNotEmpty(item)
          assert.equal(item.value, 15)
        })
      })
      describe('/string/', function () {
        before(function () {
          global.parser.parse(owner, '!set noticeInterval test')
        })
        it('fail message expected', async function () {
          await until(() => global.commons.sendMessage.calledOnce, 5000)

          let message = global.commons.sendMessage.getCall(0).args[0]
          assert.equal(message, 'Sorry, $sender, cannot parse !set command.')
        })
        it('should not be set in db', async function () {
          let item = await global.db.engine.findOne('settings', { key: 'noticeInterval' })
          assert.notEqual(item.value, 'test')
        })
      })
      describe('/bool/', function () {
        before(function () {
          global.parser.parse(owner, '!set noticeInterval true')
        })
        it('fail message expected', async function () {
          await until(() => global.commons.sendMessage.calledOnce, 5000)

          let message = global.commons.sendMessage.getCall(0).args[0]
          assert.equal(message, 'Sorry, $sender, cannot parse !set command.')
        })
        it('should not be set in db', async function () {
          let item = await global.db.engine.findOne('settings', { key: 'noticeInterval' })
          assert.notEqual(item.value, true)
        })
      })
      describe('/empty/', function () {
        before(function () {
          global.parser.parse(owner, '!set noticeInterval')
        })
        it('success message expected', async function () {
          await until(() => global.commons.sendMessage.calledOnce, 5000)

          let message = global.commons.sendMessage.getCall(0).args[0]
          assert.equal(message, global.translate('notice.settings.noticeInterval').replace('$value', 10))
        })
        it('should be set in db as default', async function () {
          let item = await global.db.engine.findOne('settings', { key: 'noticeInterval' })
          assert.equal(item.value, 10)
        })
      })
    })
    describe('noticeMsgReq', () => {
      describe('/num/', function () {
        before(function () {
          global.parser.parse(owner, '!set noticeMsgReq 15')
        })
        it('success message expected', async function () {
          await until(() => global.commons.sendMessage.calledOnce, 5000)

          let message = global.commons.sendMessage.getCall(0).args[0]
          assert.equal(message, global.translate('notice.settings.noticeMsgReq').replace('$value', 15))
        })
        it('should be set in db', async function () {
          let item = await global.db.engine.findOne('settings', { key: 'noticeMsgReq' })
          assert.isNotEmpty(item)
          assert.equal(item.value, 15)
        })
      })
      describe('/string/', function () {
        before(function () {
          global.parser.parse(owner, '!set noticeMsgReq test')
        })
        it('fail message expected', async function () {
          await until(() => global.commons.sendMessage.calledOnce, 5000)

          let message = global.commons.sendMessage.getCall(0).args[0]
          assert.equal(message, 'Sorry, $sender, cannot parse !set command.')
        })
        it('should not be set in db', async function () {
          let item = await global.db.engine.findOne('settings', { key: 'noticeMsgReq' })
          assert.notEqual(item.value, 'test')
        })
      })
      describe('/bool/', function () {
        before(function () {
          global.parser.parse(owner, '!set noticeMsgReq true')
        })
        it('fail message expected', async function () {
          await until(() => global.commons.sendMessage.calledOnce, 5000)

          let message = global.commons.sendMessage.getCall(0).args[0]
          assert.equal(message, 'Sorry, $sender, cannot parse !set command.')
        })
        it('should be set in db', async function () {
          let item = await global.db.engine.findOne('settings', { key: 'noticeMsgReq' })
          assert.notEqual(item.value, true)
        })
      })
      describe('/empty/', function () {
        before(function () {
          global.parser.parse(owner, '!set noticeMsgReq')
        })
        it('success message expected', async function () {
          await until(() => global.commons.sendMessage.calledOnce, 5000)

          let message = global.commons.sendMessage.getCall(0).args[0]
          assert.equal(message, global.translate('notice.settings.noticeMsgReq').replace('$value', 10))
        })
        it('should be set in db as default', async function () {
          let item = await global.db.engine.findOne('settings', { key: 'noticeMsgReq' })
          assert.equal(item.value, 10)
        })
      })
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
})

/* global describe it before */

const assert = require('chai').assert
require('./general.js')

const db = require('./general.js').db
const message = require('./general.js').message

// users
const owner = { username: 'soge__' }

// load up a bot
require('../dest/main.js')

describe('Settings tests', () => {
  before(async () => {
    await db.cleanup()
    await message.prepare()
    global.configuration.register('testBool', 'settings.testBool', 'bool', true)
    global.configuration.register('testNumber', 'settings.testNumber', 'number', 1)
    global.configuration.register('testString', 'settings.testString', 'string', 'test')
  })
  describe('testBool', () => {
    describe('/bool/', function () {
      before(function () {
        global.configuration.setValue({ sender: owner, parameters: 'testBool false' })
      })
      it('success message expected', async function () {
        await message.isWarned('settings.testBool.false', owner, { sender: owner.username })
      })
      it('should be set in db', async function () {
        let item = await global.db.engine.findOne('settings', { key: 'testBool' })
        assert.isNotEmpty(item)
        assert.equal(item.value, false)
      })
    })
    describe('/string/', function () {
      before(function () {
        global.configuration.setValue({ sender: owner, parameters: 'testBool test' })
      })
      it('fail message expected', async function () {
        await message.isSentRaw(`Sorry, @${owner.username}, cannot parse !set command.`, owner, { sender: owner.username })
      })
      it('should not be set in db', async function () {
        let item = await global.db.engine.findOne('settings', { key: 'testBool' })
        assert.notEqual(item.value, 'test')
      })
    })
    describe('/number/', function () {
      before(function () {
        global.configuration.setValue({ sender: owner, parameters: 'testBool 10' })
      })
      it('fail message expected', async function () {
        await message.isSentRaw(`Sorry, @${owner.username}, cannot parse !set command.`, owner, { sender: owner.username })
      })
      it('should not be set in db', async function () {
        let item = await global.db.engine.findOne('settings', { key: 'testBool' })
        assert.notEqual(item.value, 10)
      })
    })
    describe('/empty/', function () {
      before(function () {
        global.configuration.setValue({ sender: owner, parameters: 'testBool' })
      })
      it('success message expected', async function () {
        await message.isWarned('settings.testBool.true', owner, { sender: owner.username })
      })
      it('should be set in db as default', async function () {
        let item = await global.db.engine.findOne('settings', { key: 'testBool' })
        assert.equal(item.value, true)
      })
    })
  })
  describe('testNumber', () => {
    describe('/number/', function () {
      before(function () {
        global.configuration.setValue({ sender: owner, parameters: 'testNumber 10' })
      })
      it('success message expected', async function () {
        await message.isWarned('settings.testNumber', owner, { sender: owner.username })
      })
      it('should be set in db', async function () {
        let item = await global.db.engine.findOne('settings', { key: 'testNumber' })
        assert.isNotEmpty(item)
        assert.equal(item.value, 10)
      })
    })
    describe('/string/', function () {
      before(function () {
        global.configuration.setValue({ sender: owner, parameters: 'testNumber test' })
      })
      it('fail message expected', async function () {
        await message.isSentRaw(`Sorry, @${owner.username}, cannot parse !set command.`, owner, { sender: owner.username })
      })
      it('should not be set in db', async function () {
        let item = await global.db.engine.findOne('settings', { key: 'testNumber' })
        assert.notEqual(item.value, 'test')
      })
    })
    describe('/bool/', function () {
      before(function () {
        global.configuration.setValue({ sender: owner, parameters: 'testNumber true' })
      })
      it('fail message expected', async function () {
        await message.isSentRaw(`Sorry, @${owner.username}, cannot parse !set command.`, owner, { sender: owner.username })
      })
      it('should not be set in db', async function () {
        let item = await global.db.engine.findOne('settings', { key: 'testNumber' })
        assert.notEqual(item.value, true)
      })
    })
    describe('/empty/', function () {
      before(function () {
        global.configuration.setValue({ sender: owner, parameters: 'testNumber' })
      })
      it('success message expected', async function () {
        await message.isWarned('settings.testNumber', owner, { sender: owner.username })
      })
      it('should be set in db as default', async function () {
        let item = await global.db.engine.findOne('settings', { key: 'testNumber' })
        assert.equal(item.value, 1)
      })
    })
  })
  describe('testString', () => {
    describe('/string/', function () {
      before(function () {
        global.configuration.setValue({ sender: owner, parameters: 'testString testMe!' })
      })
      it('success message expected', async function () {
        await message.isWarned('settings.testString', owner, { sender: owner.username })
      })
      it('should be set in db', async function () {
        let item = await global.db.engine.findOne('settings', { key: 'testString' })
        assert.isNotEmpty(item)
        assert.equal(item.value, 'testMe!')
      })
    })
    describe('/number/', function () {
      before(function () {
        global.configuration.setValue({ sender: owner, parameters: 'testString 10' })
      })
      it('fail message expected', async function () {
        await message.isSentRaw(`Sorry, @${owner.username}, cannot parse !set command.`, owner, { sender: owner.username })
      })
      it('should not be set in db', async function () {
        let item = await global.db.engine.findOne('settings', { key: 'testString' })
        assert.notEqual(item.value, 10)
      })
    })
    describe('/bool/', function () {
      before(function () {
        global.configuration.setValue({ sender: owner, parameters: 'testString true' })
      })
      it('fail message expected', async function () {
        await message.isSentRaw(`Sorry, @${owner.username}, cannot parse !set command.`, owner, { sender: owner.username })
      })
      it('should not be set in db', async function () {
        let item = await global.db.engine.findOne('settings', { key: 'testString' })
        assert.notEqual(item.value, true)
      })
    })
    describe('/empty/', function () {
      before(function () {
        global.configuration.setValue({ sender: owner, parameters: 'testString' })
      })
      it('success message expected', async function () {
        await message.isWarned('settings.testString', owner, { sender: owner.username })
      })
      it('should be set in db as default', async function () {
        let item = await global.db.engine.findOne('settings', { key: 'testString' })
        assert.equal(item.value, 'test')
      })
    })
  })
})

/* global describe it before */
if (require('cluster').isWorker) process.exit()

require('../../general.js')

const db = require('../../general.js').db
const msg = require('../../general.js').message
const Message = require('../../../dest/message')
const assert = require('chai').assert
const _ = require('lodash')

// stub
_.set(global, 'widgets.custom_variables.io.emit', function () {})

const tests = [
  {
    test: '$_test',
    variable: '$_test',
    initialValue: 0,
    afterValue: 5,
    type: 'number',
    command: 'This is $_test',
    expectedSent: true,
    params: { sender: global.commons.getOwner(), param: 5 }
  },
  {
    test: '$_test',
    variable: '$_test',
    initialValue: 0,
    afterValue: 1,
    type: 'number',
    command: 'This is $_test',
    expectedSent: true,
    params: { sender: global.commons.getOwner(), param: '+' }
  },
  {
    test: '$_test',
    variable: '$_test',
    initialValue: '0',
    afterValue: 1,
    type: 'number',
    command: 'This is $_test',
    expectedSent: true,
    params: { sender: global.commons.getOwner(), param: '+' }
  },
  {
    test: '$!_test',
    variable: '$_test',
    initialValue: 0,
    afterValue: -1,
    type: 'number',
    command: 'This is $!_test',
    expectedSent: false,
    params: { sender: global.commons.getOwner(), param: '-' }
  },
  {
    test: '$!_test',
    variable: '$_test',
    initialValue: '0',
    afterValue: -1,
    type: 'number',
    command: 'This is $!_test',
    expectedSent: false,
    params: { sender: global.commons.getOwner(), param: '-' }
  },
  {
    test: '$!_test',
    variable: '$_test',
    initialValue: 0,
    afterValue: 1,
    type: 'number',
    command: 'This is $!_test',
    expectedSent: false,
    params: { sender: global.commons.getOwner(), param: '+' }
  },
  {
    test: '$_test',
    variable: '$_test',
    initialValue: 0,
    afterValue: -1,
    type: 'number',
    command: 'This is $_test',
    expectedSent: true,
    params: { sender: global.commons.getOwner(), param: '-' }
  },
  {
    test: '$!_test',
    variable: '$_test',
    initialValue: 0,
    afterValue: 5,
    type: 'number',
    command: 'This is $!_test',
    expectedSent: false,
    params: { sender: global.commons.getOwner(), param: 5 }
  }
]

describe('Message - cvars filter', () => {
  before(async () => {
    await db.cleanup()
    await msg.prepare()
  })

  for (let test of tests) {
    let message = null
    describe(`'${test.test}' expect '${test.command.replace(/\$_test|\$!_test/g, test.afterValue)}' with value after ${test.afterValue}`, async () => {
      it(`create initial value '${test.initialValue}' of ${test.variable}`, async () => {
        await global.db.engine.update('custom.variables', { variableName: test.variable }, { readOnly: false, currentValue: test.initialValue, type: test.type, responseType: 0 })
      })
      it(`parse '${test.command}' with params`, async () => {
        message = await new Message(test.command).parse(test.params)
      })
      it('message parsed correctly', async () => {
        assert.equal(message, '')
      })

      if (test.params.param) {
        if (test.expectedSent) {
          it('expecting set message', async () => {
            await msg.isSent('filters.setVariable', { username: global.commons.getOwner() }, { sender: global.commons.getOwner(), variable: '$_test', value: test.afterValue })
          })
        } else {
          it('not expecting set message', async () => {
            let notSent = false
            try {
              await msg.isSent('filters.setVariable', { username: global.commons.getOwner() }, { sender: global.commons.getOwner(), variable: '$_test', value: test.afterValue })
            } catch (e) {
              notSent = true
            }
            assert.isTrue(notSent)
          })
        }
      }

      it(`check if after value is ${test.afterValue}`, async () => {
        let cvar = await global.db.engine.findOne('custom.variables', { variableName: test.variable })
        assert.equal(cvar.currentValue, test.afterValue)
      })

      it(`parse '${test.command}' without params`, async () => {
        delete test.params.param
        message = await new Message(test.command).parse(test.params)
      })
      it('message parsed correctly', async () => {
        assert.equal(message, test.command.replace(/\$_test|\$!_test/g, test.afterValue))
      })
    })
  }

  // read only tests
  for (let test of tests) {
    let message = null
    describe(`'${test.test}' expect '${test.command.replace(/\$_test|\$!_test/g, test.initialValue)}' with value after ${test.initialValue} because readOnly`, async () => {
      it(`create initial value '${test.initialValue}' of ${test.variable}`, async () => {
        await global.db.engine.update('custom.variables', { variableName: test.variable }, { readOnly: true, currentValue: test.initialValue, type: test.type, responseType: 0 })
      })
      it(`parse '${test.command}' with params`, async () => {
        message = await new Message(test.command).parse(test.params)
      })
      it('message parsed correctly', async () => {
        assert.equal(message, test.command.replace(/\$_test|\$!_test/g, test.initialValue))
      })

      if (test.params.param) {
        it('not expecting set message', async () => {
          let notSent = false
          try {
            await msg.isSent('filters.setVariable', { username: global.commons.getOwner() }, { sender: global.commons.getOwner(), variable: '$_test', value: test.afterValue })
          } catch (e) {
            notSent = true
          }
          assert.isTrue(notSent)
        })
      }

      it(`check if after value is ${test.initialValue}`, async () => {
        let cvar = await global.db.engine.findOne('custom.variables', { variableName: test.variable })
        assert.equal(cvar.currentValue, test.initialValue)
      })

      it(`parse '${test.command}' without params`, async () => {
        delete test.params.param
        message = await new Message(test.command).parse(test.params)
      })
      it('message parsed correctly', async () => {
        assert.equal(message, test.command.replace(/\$_test|\$!_test/g, test.initialValue))
      })
    })
  }
})

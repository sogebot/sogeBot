/* global describe it before */
const {
  isMainThread
} = require('worker_threads');
if (!isMainThread) process.exit()


require('../../general.js')

const db = require('../../general.js').db
const msg = require('../../general.js').message
const Message = require('../../../dest/message')
const constants = require('../../../dest/constants')
const assert = require('chai').assert
const _ = require('lodash')

// stub
_.set(global, 'widgets.custom_variables.io.emit', function () {})

describe('Message - cvars filter', async () => {
  const users = [
    { username: '__owner__', userId: Math.random(), permission: 0 },
    { username: 'moduser', is: { moderator: true }, userId: Math.random(), permission: 1},
    { username: 'regularuser', is: { regular: true }, userId: Math.random(), permission: 2},
    { username: 'vieweriuser', userId: Math.random(), permission: 3},
  ]
  const tests = [
    {
      test: '$_test',
      variable: '$_test',
      initialValue: 0,
      afterValue: 5,
      type: 'number',
      command: 'This is $_test',
      expectedSent: true,
      params: { param: 5 }
    },
    {
      test: '$_test',
      variable: '$_test',
      initialValue: 0,
      afterValue: 1,
      type: 'number',
      command: 'This is $_test',
      expectedSent: true,
      params: { param: '+' }
    },
    {
      test: '$_test',
      variable: '$_test',
      initialValue: '0',
      afterValue: 1,
      type: 'number',
      command: 'This is $_test',
      expectedSent: true,
      params: { param: '+' }
    },
    {
      test: '$!_test',
      variable: '$_test',
      initialValue: 0,
      afterValue: -1,
      type: 'number',
      command: 'This is $!_test',
      expectedSent: false,
      params: { param: '-' }
    },
    {
      test: '$!_test',
      variable: '$_test',
      initialValue: '0',
      afterValue: -1,
      type: 'number',
      command: 'This is $!_test',
      expectedSent: false,
      params: { param: '-' }
    },
    {
      test: '$!_test',
      variable: '$_test',
      initialValue: 0,
      afterValue: 1,
      type: 'number',
      command: 'This is $!_test',
      expectedSent: false,
      params: { param: '+' }
    },
    {
      test: '$_test',
      variable: '$_test',
      initialValue: 0,
      afterValue: -1,
      type: 'number',
      command: 'This is $_test',
      expectedSent: true,
      params: { param: '-' }
    },
    {
      test: '$!_test',
      variable: '$_test',
      initialValue: 0,
      afterValue: 5,
      type: 'number',
      command: 'This is $!_test',
      expectedSent: false,
      params: { param: 5 }
    }
  ]
  const permissions = [
    'OWNER_ONLY',
    'MODS',
    'REGULAR',
    'VIEWERS',
  ]

  for (let permission of [0, 1]) {
    describe('Custom variable with ' + permissions[permission] + ' permission', async () => {
      for (let user of users) {
        describe('Testing with ' + user.username, () => {
          before(async () => {
            await db.cleanup()
            await msg.prepare()

            for (let user of users) {
              await global.db.engine.insert('users', user)
            }
          })

          for (let test of tests) {
            let message = null
            let testName = null
            if (user.permission <= permission) {
              testName =`'${test.test}' expect '${test.command.replace(/\$_test|\$!_test/g, test.afterValue)}' with value after ${test.afterValue}`
            } else {
              testName =`'${test.test}' expect '${test.command.replace(/\$_test|\$!_test/g, test.initialValue)}' with value after ${test.afterValue} because insufficient permissions`
            }

            describe(testName, async () => {
              it(`create initial value '${test.initialValue}' of ${test.variable}`, async () => {
                await global.db.engine.update('custom.variables', { variableName: test.variable }, { readOnly: false, currentValue: test.initialValue, type: test.type, responseType: 0, permission: constants[permissions[permission]] })
              })
              it(`parse '${test.command}' with params`, async () => {
                message = await new Message(test.command).parse({
                  ...test.params,
                  sender: user.username
                })
              })


              it('message parsed correctly', async () => {
                if (user.permission <= permission) {
                  assert.equal(message, '')
                } else {
                  assert.equal(message, test.command.replace(/\$_test|\$!_test/g, test.initialValue))
                }
              })

              if (test.params.param) {
                if (test.expectedSent && user.permission <= permission) {
                  it('expecting set message', async () => {
                    await msg.isSent('filters.setVariable', { username: user.username }, { sender: global.commons.getOwner(), variable: '$_test', value: test.afterValue }, 1000)
                  })
                } else {
                  it('not expecting set message', async () => {
                    let notSent = false
                    try {
                      await msg.isSent('filters.setVariable', { username: user.username }, { sender: global.commons.getOwner(), variable: '$_test', value: test.afterValue }, 1000)
                    } catch (e) {
                      notSent = true
                    }
                    assert.isTrue(notSent)
                  })
                }
              }

              if (user.permission <= permission) {
                it(`check if after value is ${test.afterValue}`, async () => {
                  let cvar = await global.db.engine.findOne('custom.variables', { variableName: test.variable })
                  assert.equal(cvar.currentValue, test.afterValue)
                })
              } else {
                it(`check if after value is ${test.initialValue}`, async () => {
                  let cvar = await global.db.engine.findOne('custom.variables', { variableName: test.variable })
                  assert.equal(cvar.currentValue, test.initialValue)
                })
              }

              it(`parse '${test.command}' without params`, async () => {
                let params = _.cloneDeep(test.params)
                delete params.param
                message = await new Message(test.command).parse({
                  ...params,
                  sender: user.username
                })
              })
              it('message parsed correctly', async () => {
                if (user.permission <= permission) {
                  assert.equal(message, test.command.replace(/\$_test|\$!_test/g, test.afterValue))
                } else {
                  assert.equal(message, test.command.replace(/\$_test|\$!_test/g, test.initialValue))
                }
              })
            })
          }

          // read only tests
          for (let test of tests) {
            let message = null
            describe(`'${test.test}' expect '${test.command.replace(/\$_test|\$!_test/g, test.initialValue)}' with value after ${test.initialValue} because readOnly`, async () => {
              it(`create initial value '${test.initialValue}' of ${test.variable}`, async () => {
                await global.db.engine.update('custom.variables', { variableName: test.variable }, { readOnly: true, currentValue: test.initialValue, type: test.type, responseType: 0, permission: constants[permissions[permission]] })
              })
              it(`parse '${test.command}' with params`, async () => {
                message = await new Message(test.command).parse({
                  ...test.params,
                  sender: user.username
                })
              })
              it('message parsed correctly', async () => {
                assert.equal(message, test.command.replace(/\$_test|\$!_test/g, test.initialValue))
              })

              if (test.params.param) {
                it('not expecting set message', async () => {
                  let notSent = false
                  try {
                    await msg.isSent('filters.setVariable', { username: user.username }, { sender: global.commons.getOwner(), variable: '$_test', value: test.afterValue }, 1000)
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
                let params = _.cloneDeep(test.params)
                delete params.param
                message = await new Message(test.command).parse({
                  ...params,
                  sender: user.username
                })
              })
              it('message parsed correctly', async () => {
                assert.equal(message, test.command.replace(/\$_test|\$!_test/g, test.initialValue))
              })
            })
          }
        })
      }
    })
  }
})

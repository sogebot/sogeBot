/* global describe it beforeEach */
require('../../general.js')

const db = require('../../general.js').db
const msg = require('../../general.js').message
const Message = require('../../../dest/message')
const assert = require('chai').assert
const sinon = require('sinon')
const axios = require('axios')
const MockAdapter = require('axios-mock-adapter');
const mock = new MockAdapter(axios);

describe('Message - api filter', () => {
  before(() => {
    // add axios mock
    mock
      .onGet('http://localhost/get?test=a\\nb').reply(200, {
        test: 'a\\nb'
      })
      .onAny().passThrough(); // pass through others
  })
  after(() => {
    mock.restore();
  })
  beforeEach(async () => {
    await db.cleanup()
    await msg.prepare()
  })

  describe('#1989 - ?test=a\\\\nb should be correctly parsed', () => {
    let toParse = '(api|http://localhost/get?test=a\\nb) Lorem (api.test)'

    it('Expecting response Lorem a\\\\nb', async () => {
      let message = await new Message(toParse).parse({ })
      assert.isTrue(message === 'Lorem a\\nb')
    })
  })
})

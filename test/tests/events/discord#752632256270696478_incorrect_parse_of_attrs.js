/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it before */

const { v4: uuidv4 } = require('uuid');

require('../../general.js');
const log = require('../../../dest/helpers/log');

const assert = require('assert');
const db = require('../../general.js').db;
const message = require('../../general.js').message;
const time = require('../../general.js').time;

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');
const { Event } = require('../../../dest/database/entity/event');

const events = (require('../../../dest/events')).default;
const username = 'randomPerson';

describe('discord#752632256270696478 - event attrs are not correctly parsed - @func3', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await getRepository(Event).save({
      id: uuidv4(),
      name: 'tip',
      givenName: 'Tip alert',
      triggered: {},
      definitions: {},
      filter: '',
      isEnabled: true,
      operations: [{
        name: 'send-chat-message',
        definitions: {
          messageToSend: '$username ; $amount ; $currency ; $message ; $amountInBotCurrency ; $currencyInBot',
        },
      }],
    });

    await getRepository(User).save({ userName: username, userId: String(Math.floor(Math.random() * 100000)) });
  });

  it('trigger tip event for 10 EUR - ' + username, async () => {
    log.tip(`${username}, amount: 10.00EUR, message: Ahoj jak je`);
    events.fire('tip', {
      userId: String(Math.floor(Math.random * 100000)),
      username,
      amount: 10.00,
      message: 'Ahoj jak je',
      currency: 'EUR',
      amountInBotCurrency: '100',
      currencyInBot: 'CZK',
    });
  });

  it('wait 1s', async () => {
    await time.waitMs(1000);
  });

  it('we are expecting correctly parsed message', async () => {
    await message.debug('sendMessage.message', '@randomPerson ; 10 ; EUR ; Ahoj jak je ; 100 ; CZK');
  });
});

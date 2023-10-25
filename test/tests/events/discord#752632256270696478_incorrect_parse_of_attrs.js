/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it before */

const { v4: uuidv4 } = require('uuid');

import('../../general.js');
const { Event } = require('../../../dest/database/entity/event');
import { User } from '../../../dest/database/entity/user.js';
const events = (require('../../../dest/events')).default;
const log = require('../../../dest/helpers/log');

import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js';

import { db } from '../../general.js';
import { message } from '../../general.js';
const time = require('../../general.js').time;

const userName = 'randomPerson';

describe('discord#752632256270696478 - event attrs are not correctly parsed - @func3', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await AppDataSource.getRepository(Event).save({
      id:          uuidv4(),
      name:        'tip',
      givenName:   'Tip alert',
      triggered:   {},
      definitions: {},
      filter:      '',
      isEnabled:   true,
      operations:  [{
        name:        'send-chat-message',
        definitions: {
          messageToSend: '$username ; $amount ; $currency ; $message ; $amountInBotCurrency ; $currencyInBot',
        },
      }],
    });

    await AppDataSource.getRepository(User).save({ userName: userName, userId: String(Math.floor(Math.random() * 100000)) });
  });

  it('trigger tip event for 10 EUR - ' + userName, async () => {
    log.tip(`${userName}, amount: 10.00EUR, message: Ahoj jak je`);
    events.fire('tip', {
      userName,
      amount:              10.00,
      message:             'Ahoj jak je',
      currency:            'EUR',
      amountInBotCurrency: '100',
      currencyInBot:       'CZK',
    });
  });

  it('wait 1s', async () => {
    await time.waitMs(1000);
  });

  it('we are expecting correctly parsed message', async () => {
    await message.debug('sendMessage.message', '@randomPerson ; 10 ; EUR ; Ahoj jak je ; 100 ; CZK');
  });
});

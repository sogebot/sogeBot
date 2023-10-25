import { Currency } from '@entity/user.js';

import Integration from './_interface.js';
import { onStartup } from '../decorators/on.js';
import { settings } from '../decorators.js';
import eventlist from '../overlays/eventlist.js';
import alerts from '../registries/alerts.js';
import users from '../users.js';

import exchange from '~/helpers/currency/exchange.js';
import { mainCurrency } from '~/helpers/currency/mainCurrency.js';
import { eventEmitter } from '~/helpers/events/index.js';
import { triggerInterfaceOnTip } from '~/helpers/interface/triggers.js';
import {
  error, tip, info,
} from '~/helpers/log.js';
import { app } from '~/helpers/panel.js';

type KoFiData = {
  'message_id':string,
  'timestamp':string,
  'type': 'Donation' | 'Subscription' | 'Shop Order' | 'Commission',
  'is_public':boolean,
  'from_name':string,
  'message':string,
  'amount':string, // 3.00
  'url':string,
  'email':string,
  'currency':Currency,
  'is_subscription_payment':boolean,
  'is_first_subscription_payment':boolean,
  'kofi_transaction_id':string,
  'verification_token':string,
  'shop_items':null,
  'tier_name':null
};

class Kofi extends Integration {
  @settings()
    verification_token = '';

  @onStartup()
  onStartup() {
    if (app) {
      info('KO-FI: webhooks endpoint registered');
      app.post('/webhooks/kofi', async (req, res) => {
        if (!this.enabled) {
          return;
        }
        try {
          const data: KoFiData = JSON.parse(req.body.data);

          if (data.type !== 'Donation' || !data.is_public) {
            return; // we are parsing only public donation events
          }

          if (data.verification_token !== this.verification_token) {
            throw new Error(`Verification token doesn't match!`);
          }

          // let's get userId only from database
          const userId = await new Promise<string>(resolve => {
            users.getIdByName(data.from_name.toLowerCase())
              .then(r => resolve(r))
              .catch(() => resolve(`${data.from_name.toLowerCase()}#__anonymous__`));
          });

          const isAnonymous = userId.includes('__anonymous__');

          if (isAnonymous) {
            tip(`${userId}, amount: ${Number(data.amount).toFixed(2)}${data.currency}, message: ${data.message}`);
          } else {
            tip(`${data.from_name.toLowerCase()}#${userId}, amount: ${Number(data.amount).toFixed(2)}${data.currency}, message: ${data.message}`);
          }

          eventlist.add({
            event:     'tip',
            amount:    Number(data.amount),
            currency:  data.currency,
            userId:    userId,
            message:   data.message,
            timestamp: new Date(data.timestamp).getTime(),
          });

          eventEmitter.emit('tip', {
            isAnonymous:         isAnonymous,
            userName:            data.from_name.toLowerCase(),
            amount:              Number(data.amount).toFixed(2),
            currency:            data.currency,
            amountInBotCurrency: Number(exchange(Number(data.amount), data.currency, mainCurrency.value)).toFixed(2),
            currencyInBot:       mainCurrency.value,
            message:             data.message,
          });
          alerts.trigger({
            event:      'tip',
            service:    'kofi',
            name:       data.from_name,
            amount:     Number(Number(data.amount).toFixed(2)),
            tier:       null,
            currency:   data.currency,
            monthsName: '',
            message:    data.message,
          });

          triggerInterfaceOnTip({
            userName:  isAnonymous ? 'anonymous' : data.from_name.toLowerCase(),
            amount:    Number(data.amount),
            message:   data.message,
            currency:  data.currency,
            timestamp: new Date(data.timestamp).getTime(),
          });

          res.status(200).send(); // send 200 to ko-fi to accept  that we have this parsed
        } catch (e) {
          if (e instanceof Error) {
            error(e.stack ?? e.message);
          }
        }
      });
    } else {
      setTimeout(() => this.onStartup(), 1000);
    }
  }
}

export default new Kofi();

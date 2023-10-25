import { Currency, UserTip, UserTipInterface } from '@entity/user.js';
import * as constants from '@sogebot/ui-helpers/constants.js';
import axios from 'axios';

import Integration from './_interface.js';
import { onStartup } from '../decorators/on.js';
import { persistent, settings } from '../decorators.js';
import eventlist from '../overlays/eventlist.js';
import alerts from '../registries/alerts.js';
import users from '../users.js';

import { AppDataSource } from '~/database.js';
import { isStreamOnline, stats } from '~/helpers/api/index.js';
import exchange from '~/helpers/currency/exchange.js';
import { mainCurrency } from '~/helpers/currency/index.js';
import rates from '~/helpers/currency/rates.js';
import { eventEmitter } from '~/helpers/events/index.js';
import { triggerInterfaceOnTip } from '~/helpers/interface/triggers.js';
import {
  error, tip,
} from '~/helpers/log.js';

type DonatelloResponse = {
  content: {
    pubId: string;
    clientName: string;
    message: string;
    amount: string;
    currency: Currency;
    goal: string;
    isPublished: boolean;
    createdAt: string; // Eastern European Standard Time (EET)
  }[],
  page: number;
  size: number;
  pages: number;
  first: boolean;
  last: boolean;
  total: number;
};

const DONATES_URL = 'https://donatello.to/api/v1/donates' as const;

function getTips (page: number, jwtToken: string, lastPubId: string): Promise<[isProcessed: boolean, tips: DonatelloResponse['content']]> {
  return new Promise((resolve, reject) => {
    axios.get<DonatelloResponse>(`${DONATES_URL}?size=100&page=${page}`, {
      headers: {
        Accept:    'application/json',
        'X-Token': jwtToken,
      },
    }).then(response => {
      const data = response.data;
      const isLastPage = data.last;
      const lastIdx = data.content.findIndex(o => o.pubId === lastPubId);
      let tips: DonatelloResponse['content'] = data.content;
      if (lastIdx !== -1) {
        tips = data.content.slice(0, lastIdx);
      }
      resolve([isLastPage || lastIdx !== -1, tips]);
    }).catch(e => reject(e));
  });
}

class Donatello extends Integration {
  @persistent()
    lastPubId = '';

  @settings()
    token = '';

  @onStartup()
  interval() {
    setInterval(async () => {
      if (this.token.length === 0 || !this.enabled) {
        return;
      }

      try {
        let page = 0;
        const aggregatedTips: DonatelloResponse['content'] = [];
        let isProcessed = false;
        while(!isProcessed) {
          const data = await getTips(page, this.token, this.lastPubId);
          isProcessed = data[0];
          const tips = data[1];

          if (isProcessed) {
            aggregatedTips.push(...tips);
            break;
          }

          page++;
        }

        if (aggregatedTips.length > 0) {
          this.lastPubId = aggregatedTips[0].pubId;
        }
        for (const item of aggregatedTips) {
          this.parse(item);
        }
      } catch (e) {
        error('DONATELLO: Something wrong during tips fetch.');
        error(e);
      }
    }, constants.MINUTE);
  }

  async parse(data: DonatelloResponse['content'][number], isAnonymous = false): Promise<void> {
    const timestamp = Date.now();

    const username = data.clientName;
    const amount = Number(data.amount);

    isAnonymous = isAnonymous || username === '' || username === null ;

    if (!isAnonymous) {
      try {
        const user = await users.getUserByUsername(username);
        tip(`${username.toLowerCase()}${user.userId ? '#' + user.userId : ''}, amount: ${amount.toFixed(2)}${data.currency}, message: ${data.message}`);

        eventlist.add({
          event:    'tip',
          amount:   amount,
          currency: data.currency,
          userId:   String(await users.getIdByName(username.toLowerCase()) ?? '0'),
          message:  data.message,
          timestamp,
        });

        eventEmitter.emit('tip', {
          isAnonymous:         false,
          userName:            username.toLowerCase(),
          amount:              amount.toFixed(2),
          currency:            data.currency,
          amountInBotCurrency: Number(exchange(amount, data.currency, mainCurrency.value)).toFixed(2),
          currencyInBot:       mainCurrency.value,
          message:             data.message,
        });

        alerts.trigger({
          event:      'tip',
          service:    'donationalerts',
          name:       username.toLowerCase(),
          amount:     Number(amount.toFixed(2)),
          tier:       null,
          currency:   data.currency,
          monthsName: '',
          message:    data.message,
        });

        const newTip: UserTipInterface = {
          amount:        Number(amount),
          currency:      data.currency,
          sortAmount:    exchange(Number(amount), data.currency, mainCurrency.value),
          message:       data.message,
          tippedAt:      timestamp,
          exchangeRates: rates,
          userId:        user.userId,
        };
        AppDataSource.getRepository(UserTip).save(newTip);
      } catch {
        return this.parse(data, true);
      }
    } else {
      tip(`${username}#__anonymous__, amount: ${Number(amount).toFixed(2)}${data.currency}, message: ${data.message}`);
      alerts.trigger({
        event:      'tip',
        name:       username,
        amount:     Number(amount.toFixed(2)),
        tier:       null,
        currency:   data.currency,
        monthsName: '',
        message:    data.message,
      });
      eventlist.add({
        event:    'tip',
        amount:   amount,
        currency: data.currency,
        userId:   `${username}#__anonymous__`,
        message:  data.message,
        timestamp,
      });
    }
    triggerInterfaceOnTip({
      userName: username.toLowerCase(),
      amount:   amount,
      message:  data.message,
      currency: data.currency,
      timestamp,
    });
    if (isStreamOnline.value) {
      stats.value.currentTips = stats.value.currentTips + Number(exchange(amount, data.currency, mainCurrency.value));
    }
  }
}

export default new Donatello();

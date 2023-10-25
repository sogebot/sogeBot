import { Currency, UserTip, UserTipInterface } from '@entity/user.js';
import * as constants from '@sogebot/ui-helpers/constants.js';
import fetch from 'node-fetch';

import Integration from './_interface.js';
import { persistent, settings } from '../decorators.js';
import { onStartup } from '../decorators/on.js';
import eventlist from '../overlays/eventlist.js';
import alerts from '../registries/alerts.js';
import users from '../users.js';

import { AppDataSource } from '~/database.js';
import { isStreamOnline } from '~/helpers/api/index.js';
import { stats } from '~/helpers/api/stats.js';
import exchange from '~/helpers/currency/exchange.js';
import { mainCurrency } from '~/helpers/currency/index.js';
import rates from '~/helpers/currency/rates.js';
import { eventEmitter } from '~/helpers/events/index.js';
import { triggerInterfaceOnTip } from '~/helpers/interface/triggers.js';
import { error, tip } from '~/helpers/log.js';

type TipeeestreamEvent = {
  message: string,
  datas: {
    items: [
      {
        id: number,
        type: 'donation',
        user: {
          locked: boolean,
          hash_id: string,
          hash: string,
          avatar: {
            id: number,
            is_converted: boolean
          },
          hasPayment: string,
          currency: {
            code: Currency,
            symbol: string,
            label: string,
            available: boolean
          },
          country: string,
          campaignActivation: number,
          id: number,
          providers: {
            connectedAt: string,
            code: 'twitch' | 'youtube',
            id: number,
            username: string,
            master: boolean,
            token: string,
            followers: number,
            last_follow_update: string,
            created_at: string,
            channel: string,
          }[]
          ,
          username: string,
          pseudo: string,
          email_confirmation_at: string,
          created_at: string,
          session_at: string,
          parameters: []
        },
        ref: string,
        created_at: string,
        inserted_at: string,
        display: boolean,
        parameters: {
          amount: number,
          campaignId: number,
          currency: Currency,
          fees: number,
          identifier: string,
          formattedMessage: string,
          message?: string,
          username: string
        },
        formattedAmount: string,
        'parameters.amount': number
      }
    ],
    total_count: number
  }
};

class TipeeeStream extends Integration {
  @persistent()
    afterDate = 0;

  @settings()
    apiKey = '';

  @onStartup()
  interval() {
    setInterval(async () => {
      if (this.apiKey.length === 0 || !this.enabled) {
        return;
      }
      try {
        const beforeDate = Date.now();
        const response = await fetch(`https://api.tipeeestream.com/v1.0/events.json?apiKey=${this.apiKey}&type[]=donation&limit=100000&end=${(new Date(beforeDate)).toISOString()}&start=${(new Date(this.afterDate)).toISOString()}`);

        if (response.ok) {
          const data = await response.json() as TipeeestreamEvent;

          if (data.message !== 'success') {
            throw new Error(data.message);
          }

          for (const item of data.datas.items) {
            this.parse(item);
          }

          this.afterDate = beforeDate;
        } else {
          if (response.status === 401) {
            setTimeout(() => this.status({ state: false }), 1000);
            throw new Error('Unauthorized access, please check your apiKey. Disabling Tipeeestream integration.');
          } else {
            throw new Error(response.statusText);
          }
        }
      } catch (e) {
        if (e instanceof Error) {
          error(`TIPEEESTREAM: ${e.stack}`);
        }
      }

    }, constants.MINUTE);
  }

  async parse(data: TipeeestreamEvent['datas']['items'][number]) {
    try {
      const amount = data.parameters.amount;
      const message = data.parameters.message ?? '';
      const userName = data.parameters.username.toLowerCase();
      const donationCurrency = data.parameters.currency;

      if (isStreamOnline.value) {
        stats.value.currentTips = stats.value.currentTips + Number(exchange(amount, donationCurrency, mainCurrency.value));
      }

      let isAnonymous = false;
      const timestamp = Date.now();
      users.getUserByUsername(userName)
        .then(async(user) => {
          const newTip: UserTipInterface = {
            amount,
            currency:      donationCurrency,
            sortAmount:    exchange(Number(amount), donationCurrency, mainCurrency.value),
            message,
            exchangeRates: rates,
            tippedAt:      timestamp,
            userId:        user.userId,
          };
          AppDataSource.getRepository(UserTip).save(newTip);
          tip(`${userName.toLowerCase()}${user.userId ? '#' + user.userId : ''}, amount: ${Number(amount).toFixed(2)}${donationCurrency}, message: ${message}`);
          eventlist.add({
            event:    'tip',
            amount,
            currency: donationCurrency,
            userId:   user.userId,
            message,
            timestamp,
          });
        })
        .catch(() => {
          // user not found on Twitch
          tip(`${userName.toLowerCase()}#__anonymous__, amount: ${Number(amount).toFixed(2)}${donationCurrency}, message: ${message}`);
          eventlist.add({
            event:    'tip',
            amount,
            currency: donationCurrency,
            userId:   `${userName}#__anonymous__`,
            message,
            timestamp,
          });
          isAnonymous = true;
        }).finally(() => {
          eventEmitter.emit('tip', {
            userName:            userName.toLowerCase(),
            amount:              Number(amount).toFixed(2),
            currency:            donationCurrency,
            amountInBotCurrency: Number(exchange(amount, donationCurrency, mainCurrency.value)).toFixed(2),
            currencyInBot:       mainCurrency.value,
            message,
            isAnonymous,
          });
          alerts.trigger({
            event:      'tip',
            service:    'tipeeestream',
            name:       userName.toLowerCase(),
            amount:     Number(Number(amount).toFixed(2)),
            tier:       null,
            currency:   donationCurrency,
            monthsName: '',
            message,
          });

          triggerInterfaceOnTip({
            userName: userName.toLowerCase(),
            amount,
            message,
            currency: donationCurrency,
            timestamp,
          });
        });
    } catch (e: any) {
      error(`TIPEESTREAM: Error in parsing event: ${JSON.stringify(data)})`);
      error(e);
    }
  }
}

export default new TipeeeStream();

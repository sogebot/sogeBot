import { Currency, UserTip, UserTipInterface } from '@entity/user';
import * as constants from '@sogebot/ui-helpers/constants';
import Axios from 'axios';
import chalk from 'chalk';
import { AppDataSource } from '~/database';

import { persistent, settings } from '../decorators';
import { onChange, onStartup } from '../decorators/on';
import eventlist from '../overlays/eventlist';
import alerts from '../registries/alerts';
import users from '../users';
import Integration from './_interface';

import { isStreamOnline, stats } from '~/helpers/api/index.js';
import { mainCurrency } from '~/helpers/currency';
import exchange from '~/helpers/currency/exchange';
import rates from '~/helpers/currency/rates';
import { eventEmitter } from '~/helpers/events';
import { triggerInterfaceOnTip } from '~/helpers/interface/triggers';
import {
  error, info, tip,
} from '~/helpers/log';

type StreamElementsEvent = {
  donation: {
    user: {
      username: string,
      geo: null,
      email: string,
    },
    message: string,
    amount: number,
    currency: Currency
  },
  provider: string,
  status: string,
  deleted: boolean,
  _id: string,
  channel: string,
  transactionId: string,
  approved: string,
  createdAt: string,
  updatedAt: string
};

/* example payload (eventData)
{
  _id: '5d967959cd89a10ce12818ad',
  channel: '5afbafb0c3a79ebedde18249',
  event: 'tip',
  provider: 'twitch',
  createdAt: '2019-10-03T22:42:33.023Z',
  data: {
    tipId: '5d967959531876d2589dd772',
    username: 'qwe',
    amount: 12,
    currency: 'RUB',
    message: 'saaaaaaa',
    items: [],
    avatar: 'https://static-cdn.jtvnw.net/user-default-pictures-uv/ebe4cd89-b4f4-4cd9-adac-2f30151b4209-profile_image-300x300.png'
  },
  updatedAt: '2019-10-03T22:42:33.023Z'
} */

function getTips (offset: number, channel: string, jwtToken: string, beforeDate: number, afterDate: number): Promise<[total: number, tips: any[]]> {
  return new Promise((resolve) => {
    Axios(`https://api.streamelements.com/kappa/v2/tips/${channel}?limit=100&before=${beforeDate}&after=${afterDate}&offset=${offset}`, {
      method:  'GET',
      headers: {
        Accept:        'application/json',
        Authorization: 'Bearer ' + jwtToken,
      },
    }).then((response: any) => {
      const data = response.data;
      resolve([Number(data.total), data.docs]);
    });
  });
}

class StreamElements extends Integration {
  channel = '';

  @persistent()
    afterDate = Date.now();

  @settings()
    jwtToken = '';

  @onStartup()
  interval() {
    setInterval(async () => {
      if (this.channel.length === 0) {
        return;
      }
      const beforeDate = Date.now();

      // get initial data
      let [total, tips] = await getTips(0, this.channel, this.jwtToken, beforeDate, this.afterDate);

      while (tips.length < total) {
        tips = [...tips, ...(await getTips(tips.length, this.channel, this.jwtToken, beforeDate, this.afterDate))[1]];
      }

      for (const item of tips.filter(o => new Date(o.createdAt).getTime() >= this.afterDate)) {
        this.parse(item);
      }

      this.afterDate = beforeDate;

    }, constants.MINUTE);
  }

  @onStartup()
  @onChange('enabled')
  onStateChange (key: string, val: boolean) {
    if (val) {
      this.connect();
    } else {
      this.channel = '';
    }
  }

  @onChange('jwtToken')
  async connect () {
    if (this.jwtToken.trim() === '' || !this.enabled) {
      return;
    }

    // validate token
    try {
      const request = await Axios('https://api.streamelements.com/kappa/v2/channels/me', {
        method:  'GET',
        headers: {
          Accept:        'application/json',
          Authorization: 'Bearer ' + this.jwtToken,
        },
      }) as any;
      this.channel = request.data._id;
      info(chalk.yellow('STREAMELEMENTS:') + ` JWT token check OK. Using channel ${request.data.username}@${request.data._id}`);
    } catch (e: any) {
      error(chalk.yellow('STREAMELEMENTS:') + ' JWT token is not valid.');
      return;
    }
  }

  async parse(eventData: StreamElementsEvent) {
    const username = eventData.donation.user.username;
    const amount = eventData.donation.amount;
    const message = eventData.donation.message;
    const DONATION_CURRENCY = eventData.donation.currency;

    if (isStreamOnline.value) {
      stats.value.currentTips = stats.value.currentTips + exchange(amount, DONATION_CURRENCY, mainCurrency.value);
    }

    let isAnonymous = false;
    const timestamp = Date.now();
    users.getUserByUsername(username)
      .then(async(user) => {
        const newTip: UserTipInterface = {
          amount:        Number(amount),
          currency:      DONATION_CURRENCY,
          sortAmount:    exchange(Number(amount), DONATION_CURRENCY, mainCurrency.value),
          message,
          tippedAt:      timestamp,
          exchangeRates: rates,
          userId:        user.userId,
        };
        AppDataSource.getRepository(UserTip).save(newTip);
        tip(`${username.toLowerCase()}${user.userId ? '#' + user.userId : ''}, amount: ${Number(amount).toFixed(2)}${DONATION_CURRENCY}, message: ${message}`);

        eventlist.add({
          event:    'tip',
          amount,
          currency: DONATION_CURRENCY,
          userId:   user.userId,
          message,
          timestamp,
        });
      })
      .catch(() => {
        // user not found on Twitch
        tip(`${username.toLowerCase()}#__anonymous__, amount: ${Number(amount).toFixed(2)}${DONATION_CURRENCY}, message: ${message}`);
        eventlist.add({
          event:    'tip',
          amount,
          currency: DONATION_CURRENCY,
          userId:   `${username}#__anonymous__`,
          message,
          timestamp,
        });
        isAnonymous = true;
      }).finally(() => {
        eventEmitter.emit('tip', {
          userName:            username.toLowerCase(),
          amount:              Number(amount).toFixed(2),
          currency:            DONATION_CURRENCY,
          amountInBotCurrency: Number(exchange(amount, DONATION_CURRENCY, mainCurrency.value)).toFixed(2),
          currencyInBot:       mainCurrency.value,
          message,
          isAnonymous,
        });
        alerts.trigger({
          event:      'tips',
          service:    'streamelements',
          name:       username.toLowerCase(),
          amount:     Number(Number(amount).toFixed(2)),
          tier:       null,
          currency:   DONATION_CURRENCY,
          monthsName: '',
          message,
        });

        triggerInterfaceOnTip({
          userName: username.toLowerCase(),
          amount,
          message,
          currency: DONATION_CURRENCY,
          timestamp,
        });
      });
  }
}

export default new StreamElements();

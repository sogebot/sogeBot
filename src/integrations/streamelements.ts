import Axios from 'axios';
import chalk from 'chalk';
import io from 'socket.io-client-legacy';
import { getRepository } from 'typeorm';

import currency from '../currency';
import { UserTip, UserTipInterface } from '../database/entity/user';
import { settings } from '../decorators';
import { onChange, onStartup } from '../decorators/on';
import { isStreamOnline, stats } from '../helpers/api/index.js';
import { mainCurrency } from '../helpers/currency';
import { eventEmitter } from '../helpers/events';
import { triggerInterfaceOnTip } from '../helpers/interface/triggers';
import {
  error, info, tip,
} from '../helpers/log';
import eventlist from '../overlays/eventlist';
import alerts from '../registries/alerts';
import users from '../users';
import Integration from './_interface';

type StreamElementsEvent = {
  _id: string;
  channel: string;
  type: 'cheer' | 'follow' | 'host' | 'raid' | 'subscriber' | 'tip';
  provider: 'twitch' | 'facebook' | 'youtube';
  flagged: boolean;
  createdAt: string;
  updatedAt: string;
  data: {
    tipId: string;
    username: string;
    amount: number;
    currency: currency;
    message: string;
    items: any[];
    avatar: string;
    providerId: string;
    displayName: string;
    streak: number;
    tier: '1000' | '2000' | '3000' | 'prime';
    quantity: number
  }
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
class StreamElements extends Integration {
  socketToStreamElements: any | null = null;

  @settings()
  jwtToken = '';

  @onStartup()
  @onChange('enabled')
  onStateChange (key: string, val: boolean) {
    if (val) {
      this.connect();
    } else {
      this.disconnect();
    }
  }

  async disconnect () {
    if (this.socketToStreamElements !== null) {
      this.socketToStreamElements.removeAllListeners();
      this.socketToStreamElements.disconnect();
    }
  }

  @onChange('jwtToken')
  async connect () {
    this.disconnect();

    if (this.jwtToken.trim() === '' || !this.enabled) {
      return;
    }

    // validate token
    try {
      await Axios('https://api.streamelements.com/kappa/v2/channels/me', {
        method:  'GET',
        headers: {
          Accept:        'application/json',
          Authorization: 'Bearer ' + this.jwtToken,
        },
      });
      info(chalk.yellow('STREAMELEMENTS:') + ' JWT token check OK.');
    } catch (e) {
      error(chalk.yellow('STREAMELEMENTS:') + ' JWT token is not valid.');
      return;
    }

    this.socketToStreamElements = io('https://realtime.streamelements.com', {
      reconnection:         true,
      reconnectionDelay:    1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      transports:           ['websocket'],
    });

    this.socketToStreamElements.on('reconnect_attempt', () => {
      info(chalk.yellow('STREAMELEMENTS:') + ' Trying to reconnect to service');
    });

    this.socketToStreamElements.on('connect', () => {
      info(chalk.yellow('STREAMELEMENTS:') + ' Successfully connected socket to service');
      if (this.socketToStreamElements !== null) {
        this.socketToStreamElements.emit('authenticate', { method: 'jwt', token: this.jwtToken });
      }
    });

    this.socketToStreamElements.on('authenticated', ({ channelId }: { channelId: string }) => {
      info(chalk.yellow('STREAMELEMENTS:') + ` Successfully authenticated on service (channel ${channelId})`);
    });

    this.socketToStreamElements.on('disconnect', () => {
      info(chalk.yellow('STREAMELEMENTS:') + ' Socket disconnected from service');
      if (this.socketToStreamElements) {
        this.socketToStreamElements.open();
      }
    });

    this.socketToStreamElements.on('event', async (eventData: StreamElementsEvent) => {
      this.parse(eventData);
    });
  }

  async parse(eventData: StreamElementsEvent) {
    if (eventData.type !== 'tip') {
      return;
    }

    const { username, amount, message } = eventData.data;
    const DONATION_CURRENCY = eventData.data.currency;

    if (isStreamOnline.value) {
      stats.value.currentTips = stats.value.currentTips + currency.exchange(amount, DONATION_CURRENCY, mainCurrency.value);
    }

    let isAnonymous = false;
    const timestamp = Date.now();
    users.getUserByUsername(username)
      .then(async(user) => {
        const newTip: UserTipInterface = {
          amount:        Number(amount),
          currency:      DONATION_CURRENCY,
          sortAmount:    currency.exchange(Number(amount), DONATION_CURRENCY, mainCurrency.value),
          message,
          tippedAt:      timestamp,
          exchangeRates: currency.rates,
          userId:        user.userId,
        };
        getRepository(UserTip).save(newTip);
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
          username:            username.toLowerCase(),
          amount:              Number(amount).toFixed(2),
          currency:            DONATION_CURRENCY,
          amountInBotCurrency: Number(currency.exchange(amount, DONATION_CURRENCY, mainCurrency.value)).toFixed(2),
          currencyInBot:       mainCurrency.value,
          message,
          isAnonymous,
        });
        alerts.trigger({
          event:      'tips',
          name:       username.toLowerCase(),
          amount:     Number(Number(eventData.data.amount).toFixed(2)),
          tier:       null,
          currency:   DONATION_CURRENCY,
          monthsName: '',
          message,
        });

        triggerInterfaceOnTip({
          username: username.toLowerCase(),
          amount,
          message,
          currency: DONATION_CURRENCY,
          timestamp,
        });
      });
  }
}

export default new StreamElements();

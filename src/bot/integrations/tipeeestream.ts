import axios from 'axios';
import chalk from 'chalk';
import io from 'socket.io-client-legacy';
import { getRepository } from 'typeorm';

import currency from '../currency';
import { UserTip, UserTipInterface } from '../database/entity/user';
import { settings } from '../decorators';
import { ui } from '../decorators.js';
import { onChange, onStartup } from '../decorators/on.js';
import { isStreamOnline } from '../helpers/api/index.js';
import { stats } from '../helpers/api/stats.js';
import { mainCurrency } from '../helpers/currency';
import { eventEmitter } from '../helpers/events';
import { triggerInterfaceOnTip } from '../helpers/interface/triggers.js';
import {
  error, info, tip,
} from '../helpers/log.js';
import eventlist from '../overlays/eventlist.js';
import alerts from '../registries/alerts.js';
import users from '../users.js';
import Integration from './_interface';

type TipeeestreamEvent = {
  appKey: string;
  event: {
    type: 'donation'; // is there more?
    user: {
      avatar: string;
      country: string;
      username: string;
      providers: {
        connectedAt: string; code: 'twitch'; id: string; username: string;
      }[];
      created_at: string;
      session_at: string;
    };
    ref: string;
    inserted_at: string;
    deleted_at: string;
    created_at: string;
    parameters: {
      formattedMessage: string;
      message: string;
      username: string;
      currency: string;
      amount: number;
      resub: number;
      viewers: number;
    };
    formattedAmount: string;
    'parameters.amount': number;
  }
};

class TipeeeStream extends Integration {
  socketToTipeeestream: any | null = null;

  @settings()
  @ui({ type: 'text-input', secret: false })
  username = '';

  @settings()
  @ui({ type: 'text-input', secret: true })
  apiKey = '';

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
    if (this.socketToTipeeestream !== null) {
      this.socketToTipeeestream.removeAllListeners();
      this.socketToTipeeestream.disconnect();
      this.socketToTipeeestream = null;
    }
  }

  @onChange('apiKey')
  async connect () {
    try {
      this.disconnect();

      if (this.username.trim() === '' || this.apiKey.trim() === '' || !this.enabled) {
        return;
      }

      // get current avaliable host and port
      // destructured response from https://api.tipeeestream.com/v2.0/site/socket
      // example response: { "code": 200, "message": "success", "datas": { "port": "443", "host": "https://sso-cf.tipeeestream.com" } }
      const { data: { datas: { host, port } } } = await axios.get('https://api.tipeeestream.com/v2.0/site/socket');

      this.socketToTipeeestream = io(`${host}:${port}`,
        {
          reconnection:         true,
          reconnectionDelay:    1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: Infinity,
          query:                { access_token: this.apiKey.trim() },
        });

      if (this.socketToTipeeestream !== null) {
        this.socketToTipeeestream.on('connect_error', (e: Error) => {
          error(chalk.red('TIPEEESTREAM.COM:') + ' error while connecting, ' + e);
          this.connect(); // rerun all connect process
        });
        this.socketToTipeeestream.on('connect', () => {
          if (this.socketToTipeeestream !== null) {
            this.socketToTipeeestream.emit('join-room', { room: this.apiKey.trim(), username: this.username.trim() });
          }
          info(chalk.yellow('TIPEEESTREAM.COM:') + ' Successfully connected socket to service');
        });
        this.socketToTipeeestream.on('reconnect_attempt', () => {
          info(chalk.yellow('TIPEEESTREAM.COM:') + ' Trying to reconnect to service');
        });
        this.socketToTipeeestream.on('disconnect', () => {
          if (this.enabled) {
            info(chalk.yellow('TIPEEESTREAM.COM:') + ' Trying to reconnect to service');
            this.connect();
          } else {
            info(chalk.yellow('TIPEEESTREAM.COM:') + ' Socket disconnected from service');
            this.disconnect();
            this.socketToTipeeestream = null;
          }
        });

        this.socketToTipeeestream.on('new-event', async (data: TipeeestreamEvent) => {
          this.parse(data);
        });
      }
    } catch (e) {
      error(e);
    }
  }

  async parse(data: TipeeestreamEvent) {
    if (data.event.type !== 'donation') {
      return;
    }
    try {
      const { amount, message } = data.event.parameters;
      const username = data.event.parameters.username.toLowerCase();
      const donationCurrency = data.event.parameters.currency as currency;

      if (isStreamOnline.value) {
        stats.value.currentTips = stats.value.currentTips + Number(currency.exchange(amount, donationCurrency, mainCurrency.value));
      }

      let isAnonymous = false;
      users.getUserByUsername(username)
        .then(async(user) => {
          const newTip: UserTipInterface = {
            amount,
            currency:      donationCurrency,
            sortAmount:    currency.exchange(Number(amount), donationCurrency, mainCurrency.value),
            message,
            exchangeRates: currency.rates,
            tippedAt:      Date.now(),
            userId:        user.userId,
          };
          getRepository(UserTip).save(newTip);
          tip(`${username.toLowerCase()}${user.userId ? '#' + user.userId : ''}, amount: ${Number(amount).toFixed(2)}${donationCurrency}, message: ${message}`);
          eventlist.add({
            event:     'tip',
            amount,
            currency:  donationCurrency,
            userId:    user.userId,
            message,
            timestamp: Date.now(),
          });
        })
        .catch(() => {
          // user not found on Twitch
          tip(`${username.toLowerCase()}#__anonymous__, amount: ${Number(amount).toFixed(2)}${donationCurrency}, message: ${message}`);
          eventlist.add({
            event:     'tip',
            amount,
            currency:  donationCurrency,
            userId:    `${username}#__anonymous__`,
            message,
            timestamp: Date.now(),
          });
          isAnonymous = true;
        }).finally(() => {
          eventEmitter.emit('tip', {
            username:            username.toLowerCase(),
            amount:              Number(amount).toFixed(2),
            currency:            donationCurrency,
            amountInBotCurrency: Number(currency.exchange(amount, donationCurrency, mainCurrency.value)).toFixed(2),
            currencyInBot:       mainCurrency.value,
            message,
            isAnonymous,
          });
          alerts.trigger({
            event:      'tips',
            name:       username.toLowerCase(),
            amount:     Number(Number(amount).toFixed(2)),
            tier:       null,
            currency:   donationCurrency,
            monthsName: '',
            message,
          });

          triggerInterfaceOnTip({
            username:  username.toLowerCase(),
            amount,
            message,
            currency:  donationCurrency,
            timestamp: Date.now(),
          });
        });
    } catch (e) {
      error(`TIPEESTREAM: Error in parsing event: ${JSON.stringify(data.event)})`);
      error(e);
    }
  }
}

export default new TipeeeStream();

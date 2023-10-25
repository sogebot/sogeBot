import { Currency, UserTip, UserTipInterface } from '@entity/user.js';
import axios from 'axios';
import chalk from 'chalk';
import { io, Socket } from 'socket.io-client';

import Integration from './_interface.js';
import { onChange, onStartup } from '../decorators/on.js';
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
  debug, error, info, tip, warning,
} from '~/helpers/log.js';
import { ioServer } from '~/helpers/panel.js';
import { adminEndpoint } from '~/helpers/socket.js';
import { variables } from '~/watchers.js';

namespace StreamlabsEvent {
  export type Donation = {
    type: 'donation';
    message: {
      id: number;
      name: string;
      amount: string;
      formatted_amount: string;
      formattedAmount: string;
      message: string;
      currency: Currency;
      emotes: null;
      iconClassName: string;
      to: {
        name: string;
      };
      from: string;
      from_user_id: null;
      _id: string;
      isTest?: boolean; // our own variable
      created_at: number; // our own variable
    }[];
    event_id: string;
  };
}

class Streamlabs extends Integration {
  socketToStreamlabs: Socket | null = null;

  // save last donationId which rest api had
  @persistent()
    afterDonationId = '';

  @settings()
    accessToken = '';

  accessTokenBtn = null;

  @settings()
    socketToken = '';

  @settings()
    userName = '';

  @onStartup()
  onStartup() {
    setInterval(() => {
      if (this.onStartupTriggered) {
        this.restApiInterval();
      }
    }, 30000);
  }

  @onChange('accessToken')
  async onAccessTokenChange () {
    await this.getMe();
    await this.getSocketToken();
  }

  @onStartup()
  @onChange('enabled')
  async onStateChange (key: string, val: boolean) {
    if (val) {
      await this.getMe();
      await this.getSocketToken();
      this.connect();
    } else {
      this.disconnect();
    }
  }

  async disconnect () {
    if (this.socketToStreamlabs !== null) {
      this.socketToStreamlabs.offAny();
      this.socketToStreamlabs.disconnect();
    }
  }

  async restApiInterval () {
    if (this.enabled && this.accessToken.length > 0) {
      this.getMe();
      const after = String(this.afterDonationId).length > 0 ? `&after=${this.afterDonationId}` : '';
      const url = 'https://streamlabs.com/api/v1.0/donations?access_token=' + this.accessToken + after;
      try {
        const result = (await axios.get<any>(url)).data;
        debug('streamlabs', url);
        debug('streamlabs', result);
        ioServer?.emit('api.stats', {
          method: 'GET', data: result, timestamp: Date.now(), call: 'streamlabs', api: 'other', endpoint: url, code: 200,
        });
        let donationIdSet = false;
        for (const item of result.data) {
          if (!donationIdSet) {
            this.afterDonationId = item.donation_id;
            donationIdSet = true;
          }

          const { name, currency: currency2, amount, message, created_at } = item;
          const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;
          this.parse({
            type:    'donation',
            message: [{
              formatted_amount: `${currency2}${amount}`,
              formattedAmount:  `${currency2}${amount}`,
              amount:           String(amount),
              message:          decodeURI(message),
              from:             name,
              isTest:           false,
              created_at:       Number(created_at),
              // filling up
              _id:              '',
              currency:         currency2,
              emotes:           null,
              from_user_id:     null,
              iconClassName:    'user',
              id:               0,
              name,
              to:               { name: broadcasterUsername },
            }],
            event_id: '',
          });
        }
      } catch (e: any) {
        if (e.isAxiosError) {
          ioServer?.emit('api.stats', {
            method: 'GET', data: e.message, timestamp: Date.now(), call: 'streamlabs', api: 'other', endpoint: url, code: e.response?.status ?? 'n/a',
          });
        } else {
          ioServer?.emit('api.stats', {
            method: 'GET', data: e.stack, timestamp: Date.now(), call: 'streamlabs', api: 'other', endpoint: url, code: 0,
          });
        }
        if (e.message.includes('ETIMEDOUT')) {
          error('Streamlabs connection timed out, will retry later.');
        } else {
          error(e.stack);
        }
      }
    }
  }

  async getSocketToken() {
    if (this.enabled && this.accessToken.length > 0 ) {
      try {
        const url = 'https://streamlabs.com/api/v1.0/socket/token?access_token=' + this.accessToken;
        const result = (await axios.get<any>(url)).data;
        this.socketToken = result.socket_token;
      } catch (e) {
        if (this.socketToken === '') {
          warning('STREAMLABS: Couldn\'t fetch socket token. Will use only REST API polling.');
        }
      }
    }
  }

  async getMe() {
    if (this.enabled && this.accessToken.length > 0) {
      const url = 'https://streamlabs.com/api/v1.0/user?access_token=' + this.accessToken;
      const result = (await axios.get<any>(url)).data;
      if (this.userName !== result.streamlabs.username) {
        info('STREAMLABS: Connected as ' + result.streamlabs.username);
      }
      this.userName = result.streamlabs.username;
    } else {
      this.userName = '';
    }
  }

  sockets() {
    adminEndpoint('/integrations/streamlabs', 'revoke', async (cb) => {
      this.socketToken = '';
      this.userName = '';
      this.accessToken = '';
      this.disconnect();
      info(`STREAMLABS: User access revoked.`);
      cb(null);
    });
    adminEndpoint('/integrations/streamlabs', 'token', async (tokens, cb) => {
      this.accessToken = tokens.accessToken;
      await this.connect();
      cb(null);
    });
  }

  @onChange('socketToken')
  async connect () {
    this.disconnect();

    if (this.socketToken.trim() === '' || !this.enabled) {
      return;
    }

    this.socketToStreamlabs = io('https://sockets.streamlabs.com?token=' + this.socketToken);

    this.socketToStreamlabs.on('reconnect_attempt', () => {
      info(chalk.yellow('STREAMLABS:') + ' Trying to reconnect to service');
    });

    this.socketToStreamlabs.on('connect', () => {
      info(chalk.yellow('STREAMLABS:') + ' Successfully connected socket to service');
    });

    this.socketToStreamlabs.on('disconnect', () => {
      info(chalk.yellow('STREAMLABS:') + ' Socket disconnected from service');
      if (this.socketToStreamlabs) {
        this.socketToStreamlabs.open();
      }
    });

    this.socketToStreamlabs.on('event', async (eventData: StreamlabsEvent.Donation) => {
      this.parse(eventData);
    });
  }

  async parse(eventData: StreamlabsEvent.Donation) {
    if (eventData.type === 'donation') {
      for (const event of eventData.message) {
        const timestamp = (event.created_at * 1000) || Date.now();

        debug('streamlabs', event);
        if (!event.isTest) {
          const user = await users.getUserByUsername(event.from.toLowerCase());
          const tips = await AppDataSource.getRepository(UserTip).find({ where: { userId: user.userId } });

          // workaround for https://github.com/sogebot/sogeBot/issues/3338
          // incorrect currency on event rerun
          const parsedCurrency = (event.formatted_amount as string).match(/(?<currency>[A-Z$]{3}|\$)/);
          if (parsedCurrency && parsedCurrency.groups) {
            event.currency = (parsedCurrency.groups.currency === '$' ? 'USD' : parsedCurrency.groups.currency) as Currency;
          }

          // check if it is new tip (by message and by tippedAt time interval)
          if (tips.find(item => {
            return item.message === event.message
            && (item.tippedAt || 0) - 30000 < timestamp
            && (item.tippedAt || 0) + 30000 > timestamp;
          })) {
            return; // we already have this one
          }

          const newTip: UserTipInterface = {
            amount:        Number(event.amount),
            currency:      event.currency,
            sortAmount:    exchange(Number(event.amount), event.currency, mainCurrency.value),
            message:       event.message,
            tippedAt:      timestamp,
            exchangeRates: rates,
            userId:        user.userId,
          };
          AppDataSource.getRepository(UserTip).save(newTip);

          if (isStreamOnline.value) {
            stats.value.currentTips = stats.value.currentTips + Number(exchange(Number(event.amount), event.currency, mainCurrency.value));
          }
          tip(`${event.from.toLowerCase()}${user.userId ? '#' + user.userId : ''}, amount: ${Number(event.amount).toFixed(2)}${event.currency}, message: ${event.message}`);
        }
        eventlist.add({
          event:    'tip',
          amount:   Number(event.amount),
          currency: event.currency,
          userId:   String(await users.getIdByName(event.from.toLowerCase())),
          message:  event.message,
          timestamp,
          isTest:   event.isTest,
        });
        eventEmitter.emit('tip', {
          isAnonymous:         false,
          userName:            event.from.toLowerCase(),
          amount:              parseFloat(event.amount).toFixed(2),
          currency:            event.currency,
          amountInBotCurrency: Number(exchange(Number(event.amount), event.currency, mainCurrency.value)).toFixed(2),
          currencyInBot:       mainCurrency.value,
          message:             event.message,
        });
        alerts.trigger({
          event:      'tip',
          name:       event.from.toLowerCase(),
          service:    'streamlabs',
          tier:       null,
          amount:     Number(parseFloat(event.amount).toFixed(2)),
          currency:   event.currency,
          monthsName: '',
          message:    event.message,
        });

        triggerInterfaceOnTip({
          userName: event.from.toLowerCase(),
          amount:   Number(event.amount),
          message:  event.message,
          currency: event.currency,
          timestamp,
        });
      }
    }
  }
}

export default new Streamlabs();
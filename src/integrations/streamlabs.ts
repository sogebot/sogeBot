import axios from 'axios';
import chalk from 'chalk';
import { io, Socket } from 'socket.io-client';
import { getRepository } from 'typeorm';

import currency from '../currency';
import { UserTip, UserTipInterface } from '../database/entity/user';
import { persistent, settings } from '../decorators';
import { onChange, onStartup } from '../decorators/on';
import { isStreamOnline, stats } from '../helpers/api';
import { mainCurrency } from '../helpers/currency';
import { eventEmitter } from '../helpers/events';
import { getBroadcaster } from '../helpers/getBroadcaster';
import { triggerInterfaceOnTip } from '../helpers/interface/triggers';
import {
  debug, error, info, tip,
} from '../helpers/log';
import { ioServer } from '../helpers/panel';
import eventlist from '../overlays/eventlist';
import alerts from '../registries/alerts';
import users from '../users';
import Integration from './_interface';

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
      currency: currency;
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

  @onStartup()
  onStartup() {
    setInterval(() => {
      if (this.onStartupTriggered) {
        this.restApiInterval();
      }
    }, 30000);
  }

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
    if (this.socketToStreamlabs !== null) {
      this.socketToStreamlabs.offAny();
      this.socketToStreamlabs.disconnect();
    }
  }

  async restApiInterval () {
    if (this.enabled && this.accessToken.length > 0) {
      const after = String(this.afterDonationId).length > 0 ? `&after=${this.afterDonationId}` : '';
      const url = 'https://streamlabs.com/api/v1.0/donations?access_token=' + this.accessToken + after;
      try {
        const result = (await axios.get(url)).data;
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
              to:               { name: getBroadcaster() },
            }],
            event_id: '',
          });
        }
      } catch (e) {
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
          const tips = await getRepository(UserTip).find({ where: { userId: user.userId } });

          // workaround for https://github.com/sogehige/sogeBot/issues/3338
          // incorrect currency on event rerun
          const parsedCurrency = (event.formatted_amount as string).match(/(?<currency>[A-Z$]{3}|\$)/);
          if (parsedCurrency && parsedCurrency.groups) {
            event.currency = (parsedCurrency.groups.currency === '$' ? 'USD' : parsedCurrency.groups.currency) as currency;
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
            sortAmount:    currency.exchange(Number(event.amount), event.currency, mainCurrency.value),
            message:       event.message,
            tippedAt:      timestamp,
            exchangeRates: currency.rates,
            userId:        user.userId,
          };
          getRepository(UserTip).save(newTip);

          if (isStreamOnline.value) {
            stats.value.currentTips = stats.value.currentTips + Number(currency.exchange(Number(event.amount), event.currency, mainCurrency.value));
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
          username:            event.from.toLowerCase(),
          amount:              parseFloat(event.amount).toFixed(2),
          currency:            event.currency,
          amountInBotCurrency: Number(currency.exchange(Number(event.amount), event.currency, mainCurrency.value)).toFixed(2),
          currencyInBot:       mainCurrency.value,
          message:             event.message,
        });
        alerts.trigger({
          event:      'tips',
          name:       event.from.toLowerCase(),
          tier:       null,
          amount:     Number(parseFloat(event.amount).toFixed(2)),
          currency:   event.currency,
          monthsName: '',
          message:    event.message,
        });

        triggerInterfaceOnTip({
          username: event.from.toLowerCase(),
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
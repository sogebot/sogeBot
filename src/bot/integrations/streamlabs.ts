import * as _ from 'lodash';
import io from 'socket.io-client';
import chalk from 'chalk';
import axios from 'axios';

import Integration from './_interface';
import { settings, shared, ui } from '../decorators';
import { onChange, onStartup } from '../decorators/on';
import { debug, error, info, tip } from '../helpers/log';
import { triggerInterfaceOnTip } from '../helpers/interface/triggers';

import { getRepository } from 'typeorm';
import { User, UserTipInterface } from '../database/entity/user';
import users from '../users';
import api from '../api';
import events from '../events';
import currency from '../currency';
import eventlist from '../overlays/eventlist';
import alerts from '../registries/alerts';

class Streamlabs extends Integration {
  socketToStreamlabs: SocketIOClient.Socket | null = null;

  // save last donationId which rest api had
  @shared(true)
  afterDonationId = '';

  @settings()
  @ui({ type: 'text-input', secret: true })
  accessToken = '';

  @ui({
    type: 'link',
    href: 'https://www.sogebot.xyz/integrations/#StreamLabs',
    class: 'btn btn-primary btn-block',
    target: '_blank',
    text: 'integrations.streamlabs.settings.accessTokenBtn',
  })
  accessTokenBtn = null;

  @settings()
  @ui({ type: 'text-input', secret: true })
  socketToken = '';

  constructor() {
    super();

    setInterval(() => {
      if (this.onStartupTriggered) {
        this.restApiInterval();
      };
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
      this.socketToStreamlabs.removeAllListeners();
      this.socketToStreamlabs.disconnect();
    }
  }

  async restApiInterval () {
    if (this.enabled && this.accessToken.length > 0) {
      try {
        const after = String(this.afterDonationId).length > 0 ? `&after=${this.afterDonationId}` : '';
        const result = (await axios.get('https://streamlabs.com/api/v1.0/donations?access_token=' + this.accessToken + after)).data;
        debug('streamlabs', 'https://streamlabs.com/api/v1.0/donations?access_token=' + this.accessToken + after);
        debug('streamlabs', result);
        let donationIdSet = false;
        for (const item of result.data) {
          if (!donationIdSet) {
            this.afterDonationId = item.donation_id;
            donationIdSet = true;
          }

          const { name, currency: currency2, amount, message, created_at } = item;
          this.parse({
            type: 'donation',
            message: [{
              formatted_amount: `${currency2}${amount}`,
              amount: Number(amount),
              message: decodeURI(message),
              from: name,
              isTest: false,
              created_at: Number(created_at),
            }],
          });
        }
      } catch (e) {
        error(e);
      }
    }
  }

  @onChange('socketToken')
  async connect () {
    this.disconnect();

    if (this.socketToken.trim() === '' || !this.enabled) {
      return;
    }

    this.socketToStreamlabs = io.connect('https://sockets.streamlabs.com?token=' + this.socketToken);

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

    this.socketToStreamlabs.on('event', async (eventData) => {
      this.parse(eventData);
    });
  }

  async parse(eventData) {
    if (eventData.type === 'donation') {
      for (const event of eventData.message) {
        debug('streamlabs', event);
        if (!event.isTest) {
          const user = await users.getUserByUsername(event.from.toLowerCase());

          // workaround for https://github.com/sogehige/sogeBot/issues/3338
          // incorrect currency on event rerun
          const parsedCurrency = (event.formatted_amount as string).match(/(?<currency>[A-Z\$]{3}|\$)/);
          if (parsedCurrency && parsedCurrency.groups) {
            event.currency = parsedCurrency.groups.currency === '$' ? 'USD' : parsedCurrency.groups.currency;
          }

          const created_at = (event.created_at * 1000) || Date.now();
          // check if it is new tip (by message and by tippedAt time interval)
          if (user.tips.find(item => {
            return item.message === event.message
            && (item.tippedAt || 0) - 30000 < created_at
            && (item.tippedAt || 0) + 30000 > created_at;
          })) {
            return; // we already have this one
          }

          const newTip: UserTipInterface = {
            amount: Number(event.amount),
            currency: event.currency,
            sortAmount: currency.exchange(Number(event.amount), event.currency, currency.mainCurrency),
            message: event.message,
            tippedAt: created_at,
            exchangeRates: currency.rates,
          };
          user.tips.push(newTip);
          getRepository(User).save(user);

          if (api.isStreamOnline) {
            api.stats.currentTips += Number(currency.exchange(event.amount, event.currency, currency.mainCurrency));
          }
          tip(`${event.from.toLowerCase()}${user.userId ? '#' + user.userId : ''}, amount: ${Number(event.amount).toFixed(2)}${event.currency}, message: ${event.message}`);
        }
        eventlist.add({
          event: 'tip',
          amount: event.amount,
          currency: event.currency,
          username: event.from.toLowerCase(),
          message: event.message,
          timestamp: Date.now(),
        });
        events.fire('tip', {
          username: event.from.toLowerCase(),
          amount: parseFloat(event.amount).toFixed(2),
          currency: event.currency,
          amountInBotCurrency: Number(currency.exchange(event.amount, event.currency, currency.mainCurrency)).toFixed(2),
          currencyInBot: currency.mainCurrency,
          message: event.message,
        });
        alerts.trigger({
          event: 'tips',
          name: event.from.toLowerCase(),
          amount: Number(parseFloat(event.amount).toFixed(2)),
          currency: event.currency,
          monthsName: '',
          message: event.message,
          autohost: false,
        });

        triggerInterfaceOnTip({
          username: event.from.toLowerCase(),
          amount: event.amount,
          message: event.message,
          currency: event.currency,
          timestamp: _.now(),
        });
      }
    }
  }
}

export default new Streamlabs();
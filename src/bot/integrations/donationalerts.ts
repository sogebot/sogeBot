import _ from 'lodash';
import axios from 'axios';
import chalk from 'chalk';
import Centrifuge from 'centrifuge';
import WebSocket from 'ws';

import * as constants from '../constants.js';
import { isMainThread } from '../cluster';

import Integration from './_interface';
import { onChange, onStartup } from '../decorators/on.js';
import { settings } from '../decorators';
import { ui } from '../decorators.js';
import { info, tip } from '../helpers/log.js';
import { triggerInterfaceOnTip } from '../helpers/interface/triggers.js';

import { getRepository } from 'typeorm';
import { User, UserTipInterface } from '../database/entity/user';
import api from '../api.js';
import events from '../events.js';
import users from '../users.js';
import eventlist from '../overlays/eventlist.js';
import currency from '../currency';
import alerts from '../registries/alerts.js';

type DonationAlertsEvent = {
  id: string;
  alert_type: string;
  additional_data: string;
  username: string;
  amount: string;
  amount_formatted: string;
  amount_main: string;
  currency: currency;
  message: string;
  date_paid: string;
  emotes: null;
  _is_test_alert: boolean;
};

class Donationalerts extends Integration {
  socketToDonationAlerts: Centrifuge | null = null;
  donationChannel: Centrifuge.Subscription | null = null;

  @settings()
  @ui({ type: 'text-input', secret: true })
  access_token = '';

  constructor () {
    super();

    if (isMainThread) {
      setInterval(() => this.connect(), constants.HOUR); // restart socket each hour
    }
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

  /* async disconnect () {
    if (this.socketToDonationAlerts !== null) {
      this.socketToDonationAlerts.removeAllListeners();
      this.socketToDonationAlerts.disconnect();
    }
  }

  @onChange('secretToken')
  async connect () {
    this.disconnect();

    if (this.secretToken.trim() === '' || !this.enabled) {
      return;
    }

    this.socketToDonationAlerts = require('socket.io-client').connect('wss://socket3.donationalerts.ru:443',
      {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
      });

    if (this.socketToDonationAlerts !== null) {
      this.socketToDonationAlerts.on('connect', () => {
        if (this.socketToDonationAlerts !== null) {
          this.socketToDonationAlerts.emit('add-user', { token: this.secretToken, type: 'minor' });
        }
        info(chalk.yellow('DONATIONALERTS.RU:') + ' Successfully connected socket to service');
      });
      this.socketToDonationAlerts.on('reconnect_attempt', () => {
        info(chalk.yellow('DONATIONALERTS.RU:') + ' Trying to reconnect to service');
      });
      this.socketToDonationAlerts.on('disconnect', () => {
        info(chalk.yellow('DONATIONALERTS.RU:') + ' Socket disconnected from service');
        this.disconnect();
        this.socketToDonationAlerts = null;
      });

      this.socketToDonationAlerts.off('donation').on('donation', async (donationData: string) => {
        const data: DonationAlertsEvent = JSON.parse(donationData);

        if (parseInt(data.alert_type, 10) !== 1) {
          return;
        }
        const additionalData = JSON.parse(data.additional_data);
        eventlist.add({
          event: 'tip',
          amount: parseFloat(data.amount),
          currency: data.currency,
          username: data.username.toLowerCase(),
          message: data.message,
          song_title: _.get(additionalData, 'media_data.title', undefined),
          song_url: _.get(additionalData, 'media_data.url', undefined),
          timestamp: Date.now(),
        });

        events.fire('tip', {
          username: data.username.toLowerCase(),
          amount: parseFloat(data.amount).toFixed(2),
          currency: data.currency,
          amountInBotCurrency: Number(currency.exchange(Number(data.amount), data.currency, currency.mainCurrency)).toFixed(2),
          currencyInBot: currency.mainCurrency,
          message: data.message,
        });
        alerts.trigger({
          event: 'tips',
          name: data.username.toLowerCase(),
          amount: Number(parseFloat(data.amount).toFixed(2)),
          currency: data.currency,
          monthsName: '',
          message: data.message,
          autohost: false,
        });

        if (!data._is_test_alert) {
          const user = await users.getUserByUsername(data.username);
          const newTip: UserTipInterface = {
            amount: Number(data.amount),
            currency: data.currency,
            sortAmount: currency.exchange(Number(data.amount), data.currency, currency.mainCurrency),
            message: data.message,
            tippedAt: Date.now(),
            exchangeRates: currency.rates,
          };
          user.tips.push(newTip);
          getRepository(User).save(user);

          tip(`${data.username.toLowerCase()}${user.userId ? '#' + user.userId : ''}, amount: ${Number(data.amount).toFixed(2)}${data.currency}, message: ${data.message}`);

          if (api.isStreamOnline) {
            api.stats.currentTips += Number(currency.exchange(parseFloat(data.amount), data.currency, currency.mainCurrency));
          }
        }

        triggerInterfaceOnTip({
          username: data.username.toLowerCase(),
          amount: parseFloat(data.amount),
          message: data.message,
          currency: data.currency,
          timestamp: _.now(),
        });
      });
    }
  } */

  @onChange('secretToken')
  async connect () {
    this.disconnect();

    if (this.access_token.trim() === '' || !this.enabled) {
      return;
    }

    this.socketToDonationAlerts = new Centrifuge('wss://centrifugo.donationalerts.com/connection/websocket', {
      websocket: WebSocket,
      onPrivateSubscribe: async ({ data }, cb) => {
        const request = await axios.post('https://www.donationalerts.com/api/v1/centrifuge/subscribe', data, {
          headers: { 'Authorization': `Bearer ${this.access_token.trim()}` },
        });
        cb({ status: 200, data: { channels: request.data.channels } });
      },
    });

    const connectionOptions = await this.getOpts();

    this.socketToDonationAlerts.setToken(connectionOptions.token);

    await this.socketConnect();

    const channel = this.socketToDonationAlerts?.subscribe(`$alerts:donation_${connectionOptions.id}`);
    channel?.on('join', () => {
      this.donationChannel = channel;
      info(chalk.yellow('DONATIONALERTS.RU:') + ' Successfully joined in donations channel');
    });
    channel?.on('leaved', (reason: unknown) => {
      info(chalk.yellow('DONATIONALERTS.RU:') + ' Leaved from donations channel, reason: ' + reason);
      this.connect();
    });
    channel?.on('error', (reason: unknown) => {
      info(chalk.yellow('DONATIONALERTS.RU:') + ' Some error occured: ' + reason);
      this.connect();
    });
    channel?.on('unsubscribe', (reason: unknown) => {
      info(chalk.yellow('DONATIONALERTS.RU:') + ' Unsubscribed, trying to resubscribe. Reason: ' + reason);
      this.connect();
    });
    channel?.on('publish', ({ data }: { data: DonationAlertsEvent }) => {
      this.parseDonation(data);
    });
  }

  async disconnect () {
    if (this.socketToDonationAlerts !== null) {
      this.socketToDonationAlerts.removeAllListeners();
      this.socketToDonationAlerts.disconnect();
      this.socketToDonationAlerts = null;
    }
  }

  private async getOpts() {
    if (this.access_token.trim() === '') {
      throw new Error('Access token is empty.');
    }

    const request = await axios.get('https://www.donationalerts.com/api/v1/user/oauth', {
      headers: { 'Authorization': `Bearer ${this.access_token}` },
    });

    return {
      token: request.data.data.socket_connection_token,
      id: request.data.data.id,
    };
  }

  private socketConnect() {
    this.socketToDonationAlerts?.connect();
    return new Promise((resolve) => {
      this.socketToDonationAlerts?.on('connect', async () => {
        info(chalk.yellow('DONATIONALERTS.RU:') + ' Successfully connected socket to service');
        resolve();
      });
    });
  }

  async parseDonation(data: DonationAlertsEvent) {
    return true;
  }
}

export default new Donationalerts();

import _ from 'lodash';
import axios from 'axios';
import chalk from 'chalk';
import Centrifuge from 'centrifuge';
import WebSocket from 'ws';

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
  name: string;
  username: string;
  message: string;
  message_type: string;
  amount: number;
  currency: currency;
  billing_system: string;
};

class Donationalerts extends Integration {
  socketToDonationAlerts: Centrifuge | null = null;

  @ui({
    type: 'link',
    href: 'https://www.sogebot.xyz/integrations/#DonationAlerts',
    class: 'btn btn-primary btn-block',
    target: '_blank',
    text: 'integrations.donationalerts.settings.accessTokenBtn',
  })
  accessTokenBtn = null;

  @settings()
  @ui({ type: 'text-input', secret: true })
  access_token = '';

  @onStartup()
  @onChange('enabled')
  onStateChange(key: string, val: boolean) {
    if (val) {
      this.connect();
    } else {
      this.disconnect();
    }
  }

  @onChange('access_token')
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

    this.socketToDonationAlerts.on('disconnect', (reason: unknown) => {
      info(chalk.yellow('DONATIONALERTS.RU:') + ' Disconnected from socket: ' + reason);
      this.connect();
    });

    const channel = this.socketToDonationAlerts.subscribe(`$alerts:donation_${connectionOptions.id}`);
    channel?.on('join', () => {
      info(chalk.yellow('DONATIONALERTS.RU:') + ' Successfully joined in donations channel.');
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
    return new Promise((resolve, reject) => {
      this.socketToDonationAlerts?.on('connect', () => {
        info(chalk.yellow('DONATIONALERTS.RU:') + ' Successfully connected socket to service.');
        resolve();
      });
      setTimeout(() => {
        if (!this.socketToDonationAlerts?.isConnected()) {
          reject('Can\'t connect to DonationAlerts socket.');
        }
      }, 5 * 1000);
    });
  }

  async parseDonation(data: DonationAlertsEvent) {
    eventlist.add({
      event: 'tip',
      amount: data.amount,
      currency: data.currency,
      username: data.username.toLowerCase(),
      message: data.message,
      timestamp: Date.now(),
    });

    events.fire('tip', {
      username: data.username.toLowerCase(),
      amount: data.amount.toFixed(2),
      currency: data.currency,
      amountInBotCurrency: Number(currency.exchange(Number(data.amount), data.currency, currency.mainCurrency)).toFixed(2),
      currencyInBot: currency.mainCurrency,
      message: data.message,
    });

    alerts.trigger({
      event: 'tips',
      name: data.username.toLowerCase(),
      amount: Number(data.amount.toFixed(2)),
      currency: data.currency,
      monthsName: '',
      message: data.message,
      autohost: false,
    });

    if (data.billing_system !== 'fake') {
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
        api.stats.currentTips += Number(currency.exchange(data.amount, data.currency, currency.mainCurrency));
      }
    }

    triggerInterfaceOnTip({
      username: data.username.toLowerCase(),
      amount: data.amount,
      message: data.message,
      currency: data.currency,
      timestamp: _.now(),
    });
  }
}

export default new Donationalerts();

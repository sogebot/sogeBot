import axios from 'axios';
import Centrifuge from 'centrifuge';
import chalk from 'chalk';
import { getRepository } from 'typeorm';
import WebSocket from 'ws';

import currency from '../currency';
import { UserTip, UserTipInterface } from '../database/entity/user';
import { settings } from '../decorators';
import { onChange, onStartup } from '../decorators/on.js';
import { isStreamOnline, stats } from '../helpers/api/index.js';
import { mainCurrency } from '../helpers/currency';
import { eventEmitter } from '../helpers/events';
import { triggerInterfaceOnTip } from '../helpers/interface/triggers.js';
import { info, tip } from '../helpers/log.js';
import eventlist from '../overlays/eventlist.js';
import alerts from '../registries/alerts.js';
import users from '../users.js';
import Integration from './_interface';

const parsedTips: string[] = [];

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

  @settings()
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
      websocket:          WebSocket,
      onPrivateSubscribe: async ({ data }, cb) => {
        const request = await axios.post('https://www.donationalerts.com/api/v1/centrifuge/subscribe', data, { headers: { 'Authorization': `Bearer ${this.access_token.trim()}` } });
        cb({ status: 200, data: { channels: request.data.channels } });
      },
    });

    const connectionOptions = await this.getOpts();

    this.socketToDonationAlerts.setToken(connectionOptions.token);

    await this.socketConnect();

    this.socketToDonationAlerts.on('disconnect', (reason: unknown) => {
      info(chalk.yellow('DONATIONALERTS.RU:') + ' Disconnected from socket: ' +  JSON.stringify(reason));
      this.connect();
    });

    const channel = this.socketToDonationAlerts.subscribe(`$alerts:donation_${connectionOptions.id}`);
    channel?.on('join', () => {
      info(chalk.yellow('DONATIONALERTS.RU:') + ' Successfully joined in donations channel.');
    });
    channel?.on('leaved', (reason: unknown) => {
      info(chalk.yellow('DONATIONALERTS.RU:') + ' Leaved from donations channel, reason: ' + JSON.stringify(reason));
      this.connect();
    });
    channel?.on('error', (reason: unknown) => {
      info(chalk.yellow('DONATIONALERTS.RU:') + ' Some error occured: ' +  JSON.stringify(reason));
      this.connect();
    });
    channel?.on('unsubscribe', (reason: unknown) => {
      info(chalk.yellow('DONATIONALERTS.RU:') + ' Unsubscribed, trying to resubscribe. Reason: ' +  JSON.stringify(reason));
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

    const request = await axios.get('https://www.donationalerts.com/api/v1/user/oauth', { headers: { 'Authorization': `Bearer ${this.access_token}` } });

    return {
      token: request.data.data.socket_connection_token,
      id:    request.data.data.id,
    };
  }

  private socketConnect() {
    this.socketToDonationAlerts?.connect();
    return new Promise<void>((resolve, reject) => {
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
    // we will save id to not parse it twice (websocket shenanigans may happen)
    if (parsedTips.includes(data.id)) {
      return;
    } else {
      parsedTips.unshift(data.id);
      parsedTips.length = 20;
    }

    const timestamp = Date.now();

    eventlist.add({
      event:    'tip',
      amount:   data.amount,
      currency: data.currency,
      userId:   String(await users.getIdByName(data.username.toLowerCase()) ?? '0'),
      message:  data.message,
      timestamp,
    });

    eventEmitter.emit('tip', {
      isAnonymous:         false,
      username:            data.username.toLowerCase(),
      amount:              data.amount.toFixed(2),
      currency:            data.currency,
      amountInBotCurrency: Number(currency.exchange(Number(data.amount), data.currency, mainCurrency.value)).toFixed(2),
      currencyInBot:       mainCurrency.value,
      message:             data.message,
    });

    alerts.trigger({
      event:      'tips',
      name:       data.username.toLowerCase(),
      amount:     Number(data.amount.toFixed(2)),
      tier:       null,
      currency:   data.currency,
      monthsName: '',
      message:    data.message,
    });

    if (data.billing_system !== 'fake') {
      const user = await users.getUserByUsername(data.username);
      const newTip: UserTipInterface = {
        amount:        Number(data.amount),
        currency:      data.currency,
        sortAmount:    currency.exchange(Number(data.amount), data.currency, mainCurrency.value),
        message:       data.message,
        tippedAt:      timestamp,
        exchangeRates: currency.rates,
        userId:        user.userId,
      };
      getRepository(UserTip).save(newTip);

      tip(`${data.username.toLowerCase()}${user.userId ? '#' + user.userId : ''}, amount: ${Number(data.amount).toFixed(2)}${data.currency}, message: ${data.message}`);

      if (isStreamOnline.value) {
        stats.value.currentTips = stats.value.currentTips + Number(currency.exchange(data.amount, data.currency, mainCurrency.value));
      }
    }

    triggerInterfaceOnTip({
      username: data.username.toLowerCase(),
      amount:   data.amount,
      message:  data.message,
      currency: data.currency,
      timestamp,
    });
  }
}

export default new Donationalerts();

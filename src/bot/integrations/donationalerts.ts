import _ from 'lodash';
import chalk from 'chalk';
import * as constants from '../constants.js';
import { isMainThread } from '../cluster';

import Integration from './_interface';
import { onChange, onStartup } from '../decorators/on.js';
import { settings } from '../decorators';
import { ui } from '../decorators.js';
import { info, tip } from '../helpers/log.js';
import { triggerInterfaceOnTip } from '../helpers/interface/triggers.js';

class Donationalerts extends Integration {
  socket: SocketIOClient.Socket | null = null;

  @settings()
  @ui({ type: 'text-input', secret: true })
  secretToken = '';

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

  async disconnect () {
    if (this.socket !== null) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }
  }

  @onChange('secretToken')
  async connect () {
    this.disconnect();

    if (this.secretToken.trim() === '' || !this.enabled) {
      return;
    }

    this.socket = require('socket.io-client').connect('wss://socket.donationalerts.ru:443',
      {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
      });

    if (this.socket !== null) {
      this.socket.on('connect', () => {
        if (this.socket !== null) {
          this.socket.emit('add-user', { token: this.secretToken, type: 'minor' });
        }
        info(chalk.yellow('DONATIONALERTS.RU:') + ' Successfully connected socket to service');
      });
      this.socket.on('reconnect_attempt', () => {
        info(chalk.yellow('DONATIONALERTS.RU:') + ' Trying to reconnect to service');
      });
      this.socket.on('disconnect', () => {
        info(chalk.yellow('DONATIONALERTS.RU:') + ' Socket disconnected from service');
        this.disconnect();
        this.socket = null;
      });

      this.socket.off('donation').on('donation', async (data) => {
        data = JSON.parse(data);
        if (parseInt(data.alert_type, 10) !== 1) {
          return;
        }
        const additionalData = JSON.parse(data.additional_data);
        global.overlays.eventlist.add({
          type: 'tip',
          amount: data.amount,
          currency: data.currency,
          username: data.username.toLowerCase(),
          message: data.message,
          song_title: _.get(additionalData, 'media_data.title', undefined),
          song_url: _.get(additionalData, 'media_data.url', undefined),
          timestamp: Date.now(),
        });

        tip(`${data.username.toLowerCase()}, amount: ${Number(data.amount).toFixed(2)}${data.currency}, message: ${data.message}`);
        global.events.fire('tip', {
          username: data.username.toLowerCase(),
          amount: parseFloat(data.amount).toFixed(2),
          currency: data.currency,
          amountInBotCurrency: parseFloat(global.currency.exchange(data.amount, data.currency, global.currency.mainCurrency)).toFixed(2),
          currencyInBot: global.currency.mainCurrency,
          message: data.message,
        });
        global.registries.alerts.trigger({
          event: 'tips',
          name: data.username.toLowerCase(),
          amount: Number(parseFloat(data.amount).toFixed(2)),
          currency: data.currency,
          monthsName: '',
          message: data.message,
          autohost: false,
        });

        if (!data._is_test_alert) {
          const id = await global.users.getIdByName(data.username.toLowerCase(), false);
          if (id) {
            global.db.engine.insert('users.tips', {
              id,
              amount: Number(data.amount),
              currency: data.currency,
              _amount: global.currency.exchange(Number(data.amount), data.currency, 'EUR'), // recounting amount to EUR to have simplified ordering
              _currency: 'EUR', // we are forcing _currency to have simplified ordering
              message: data.message,
              timestamp: _.now(),
            });
          }
          if (global.api.isStreamOnline) {
            global.api.stats.currentTips += parseFloat(global.currency.exchange(data.amount, data.currency, global.currency.mainCurrency));
          }
        }

        triggerInterfaceOnTip({
          username: data.username.toLowerCase(),
          amount: data.amount,
          message: data.message,
          currency: data.currency,
          timestamp: _.now(),
        });
      });
    }
  }
}

export default Donationalerts;
export { Donationalerts };

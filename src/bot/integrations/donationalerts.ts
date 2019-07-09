import _ from 'lodash';
import chalk from 'chalk';
import constants from '../constants.js';
import { isMainThread } from 'worker_threads';

import Integration from './_interface';
import { onChange, onStartup } from '../decorators/on.js';
import { settings } from '../decorators';
import { ui } from '../decorators.js';

class Donationalerts extends Integration {
  socket: SocketIOClient.Socket | null = null;

  @settings()
  @ui({ type: 'text-input', secret: true })
  secretToken: string = '';

  constructor () {
    super();

    if (isMainThread) {
      setInterval(() => this.connect(), constants.HOUR); // restart socket each hour
    }
  }

  @onStartup()
  @onChange('enabled')
  onStateChange (key: string, val: boolean) {
    if (val) {this.connect();}
    else {this.disconnect();}
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

    if (this.secretToken.trim() === '' || !(await this.isEnabled())) {return;}

    this.socket = require('socket.io-client').connect('wss://socket.donationalerts.ru:443',
      {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity
      });

    if (this.socket !== null) {
      this.socket.on('connect', () => {
        if (this.socket !== null) {
          this.socket.emit('add-user', { token: this.secretToken, type: 'minor' });
        }
        global.log.info(chalk.yellow('DONATIONALERTS.RU:') + ' Successfully connected socket to service');
      });
      this.socket.on('reconnect_attempt', () => {
        global.log.info(chalk.yellow('DONATIONALERTS.RU:') + ' Trying to reconnect to service');
      });
      this.socket.on('disconnect', () => {
        global.log.info(chalk.yellow('DONATIONALERTS.RU:') + ' Socket disconnected from service');
        this.disconnect();
        this.socket = null;
      });

      this.socket.off('donation').on('donation', async (data) => {
        data = JSON.parse(data);
        if (parseInt(data.alert_type, 10) !== 1) {return;}
        let additionalData = JSON.parse(data.additional_data);
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

        global.log.tip(`${data.username.toLowerCase()}, amount: ${data.amount}${data.currency}, message: ${data.message}`);
        global.events.fire('tip', {
          username: data.username.toLowerCase(),
          amount: parseFloat(data.amount).toFixed(2),
          currency: data.currency,
          amountInBotCurrency: parseFloat(global.currency.exchange(data.amount, data.currency, global.currency.mainCurrency)).toFixed(2),
          currencyInBot: global.currency.mainCurrency,
          message: data.message,
        });

        if (!data._is_test_alert) {
          const id = await global.users.getIdByName(data.username.toLowerCase(), false);
          if (id) {global.db.engine.insert('users.tips', { id, amount: Number(data.amount), message: data.message, currency: data.currency, timestamp: _.now() });}
          if (await global.cache.isOnline()) {await global.db.engine.increment('api.current', { key: 'tips' }, { value: parseFloat(global.currency.exchange(data.amount, data.currency, global.currency.mainCurrency)) });}
        }

        // go through all systems and trigger on.tip
        for (let [, systems] of Object.entries({
          systems: global.systems,
          games: global.games,
          overlays: global.overlays,
          widgets: global.widgets,
          integrations: global.integrations
        })) {
          for (let [name, system] of Object.entries(systems)) {
            if (name.startsWith('_') || typeof system.on === 'undefined') {continue;}
            if (Array.isArray(system.on.tip)) {
              for (const fnc of system.on.tip) {
                system[fnc]({
                  username: data.username.toLowerCase(),
                  amount: data.amount,
                  message: data.message,
                  currency: data.currency,
                  timestamp: _.now()
                });
              }
            }
          }
        }
      });
    }
  }
}

export default Donationalerts;
export { Donationalerts };

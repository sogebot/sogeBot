import * as _ from 'lodash';
import io from 'socket.io-client';
import chalk from 'chalk';

import Integration from './_interface';
import { settings, ui } from '../decorators';
import { onChange, onStartup } from '../decorators/on';

class Streamlabs extends Integration {
  socket: SocketIOClient.Socket | null = null;

  @settings()
  @ui({ type: 'text-input', secret: true })
  socketToken: string = '';

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

  @onChange('socketToken')
  async connect () {
    this.disconnect();

    if (this.socketToken.trim() === '' || !this.enabled) {return;}

    this.socket = io.connect('https://sockets.streamlabs.com?token=' + this.socketToken);

    this.socket.on('reconnect_attempt', () => {
      global.log.info(chalk.yellow('STREAMLABS:') + ' Trying to reconnect to service');
    });

    this.socket.on('connect', () => {
      global.log.info(chalk.yellow('STREAMLABS:') + ' Successfully connected socket to service');
    });

    this.socket.on('disconnect', () => {
      global.log.info(chalk.yellow('STREAMLABS:') + ' Socket disconnected from service');
      if (this.socket) {
        this.socket.open();
      }
    });

    this.socket.on('event', async (eventData) => {
      this.parse(eventData);
    });
  }

  async parse(eventData) {
    if (eventData.type === 'donation') {
      for (let event of eventData.message) {
        if (!event.isTest) {
          const id = await global.users.getIdByName(event.from.toLowerCase(), false);
          if (id) {global.db.engine.insert('users.tips', { id, amount: Number(event.amount), message: event.message, currency: event.currency, timestamp: _.now() });}
          if (await global.cache.isOnline()) {await global.db.engine.increment('api.current', { key: 'tips' }, { value: parseFloat(global.currency.exchange(event.amount, event.currency, global.currency.mainCurrency)) });}
        }
        global.overlays.eventlist.add({
          type: 'tip',
          amount: event.amount,
          currency: event.currency,
          username: event.from.toLowerCase(),
          message: event.message,
          timestamp: Date.now(),
        });
        global.log.tip(`${event.from.toLowerCase()}, amount: ${event.amount}${event.currency}, message: ${event.message}`);
        global.events.fire('tip', {
          username: event.from.toLowerCase(),
          amount: parseFloat(event.amount).toFixed(2),
          currency: event.currency,
          amountInBotCurrency: parseFloat(global.currency.exchange(event.amount, event.currency, global.currency.mainCurrency)).toFixed(2),
          currencyInBot: global.currency.mainCurrency,
          message: event.message,
        });

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
                  username: event.from.toLowerCase(),
                  amount: event.amount,
                  message: event.message,
                  currency: event.currency,
                  timestamp: _.now()
                });
              }
            }
          }
        }
      }
    }
  }
}

export default Streamlabs;
export { Streamlabs };
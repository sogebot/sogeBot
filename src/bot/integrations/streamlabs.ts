import * as _ from 'lodash';
import io from 'socket.io-client';
import chalk from 'chalk';

import Integration from './_interface';
import { settings, ui } from '../decorators';
import { onChange, onStartup } from '../decorators/on';
import { info, tip } from '../helpers/log';
import { triggerInterfaceOnTip } from '../helpers/interface/triggers';

import { getRepository } from 'typeorm';
import { User, UserTip } from '../entity/user.js';

class Streamlabs extends Integration {
  socket: SocketIOClient.Socket | null = null;

  @settings()
  @ui({ type: 'text-input', secret: true })
  socketToken = '';

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

  @onChange('socketToken')
  async connect () {
    this.disconnect();

    if (this.socketToken.trim() === '' || !this.enabled) {
      return;
    }

    this.socket = io.connect('https://sockets.streamlabs.com?token=' + this.socketToken);

    this.socket.on('reconnect_attempt', () => {
      info(chalk.yellow('STREAMLABS:') + ' Trying to reconnect to service');
    });

    this.socket.on('connect', () => {
      info(chalk.yellow('STREAMLABS:') + ' Successfully connected socket to service');
    });

    this.socket.on('disconnect', () => {
      info(chalk.yellow('STREAMLABS:') + ' Socket disconnected from service');
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
      for (const event of eventData.message) {
        if (!event.isTest) {
          let user = await getRepository(User).findOne({ where: { username: event.from.toLowerCase() }});
          let id;
          if (!user) {
            id = await global.users.getIdByName(event.from.toLowerCase().toLowerCase(), false);
            user = await getRepository(User).findOne({ where: { userId: id }});
            if (!user && id) {
              // if we still doesn't have user, we create new
              user = new User();
              user.userId = id;
              user.username = event.from.toLowerCase().toLowerCase();
              user = await getRepository(User).save(user);
            }
          } else {
            id = user.userId;
          }

          const newTip = new UserTip();
          newTip.amount = Number(event.amount);
          newTip.currency = event.currency;
          newTip.sortAmount = global.currency.exchange(Number(event.amount), event.currency, 'EUR');
          newTip.message = event.message;
          newTip.tippedAt = Date.now();

          if (user) {
            user.tips.push(newTip);
            await getRepository(User).save(user);
          }

          if (global.api.isStreamOnline) {
            global.api.stats.currentTips += parseFloat(global.currency.exchange(event.amount, event.currency, global.currency.mainCurrency));
          }
        }
        global.overlays.eventlist.add({
          event: 'tip',
          amount: event.amount,
          currency: event.currency,
          username: event.from.toLowerCase(),
          message: event.message,
          timestamp: Date.now(),
        });
        tip(`${event.from.toLowerCase()}, amount: ${Number(event.amount).toFixed(2)}${event.currency}, message: ${event.message}`);
        global.events.fire('tip', {
          username: event.from.toLowerCase(),
          amount: parseFloat(event.amount).toFixed(2),
          currency: event.currency,
          amountInBotCurrency: parseFloat(global.currency.exchange(event.amount, event.currency, global.currency.mainCurrency)).toFixed(2),
          currencyInBot: global.currency.mainCurrency,
          message: event.message,
        });
        global.registries.alerts.trigger({
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

export default Streamlabs;
export { Streamlabs };
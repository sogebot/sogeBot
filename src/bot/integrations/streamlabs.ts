import * as _ from 'lodash';
import io from 'socket.io-client';
import chalk from 'chalk';

import Integration from './_interface';
import { settings, ui } from '../decorators';
import { onChange, onStartup } from '../decorators/on';
import { info, tip } from '../helpers/log';
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
    if (this.socketToStreamlabs !== null) {
      this.socketToStreamlabs.removeAllListeners();
      this.socketToStreamlabs.disconnect();
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
        if (!event.isTest) {
          const getUser = async (username, id) => {
            const userByUsername = await getRepository(User).findOne({ where: { username: username.toLowerCase() }});
            if (userByUsername) {
              return userByUsername;
            }

            const user = await getRepository(User).findOne({ where: { userId: id }});
            if (user) {
              return user;
            } else {
              return getRepository(User).save({
                userId: Number(id),
                username: username.toLowerCase(),
              });
            }
          };

          const user = await getUser(event.from.toLowerCase(), await users.getIdByName(event.from.toLowerCase().toLowerCase()));
          const newTip: UserTipInterface = {
            amount: Number(event.amount),
            currency: event.currency,
            sortAmount: currency.exchange(Number(event.amount), event.currency, 'EUR'),
            message: event.message,
            tippedAt: Date.now(),
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
import axios from 'axios';
import { onChange, onStartup } from '../decorators/on.js';
import { settings } from '../decorators';
import { ui } from '../decorators.js';
import { triggerInterfaceOnTip } from '../helpers/interface/triggers';
import { error, tip } from '../helpers/log';
import Integration from './_interface';
import { getRepository } from 'typeorm';

import { User, UserTipInterface } from '../database/entity/user';
import users from '../users.js';
import api from '../api.js';
import events from '../events.js';
import alerts from '../registries/alerts.js';
import eventlist from '../overlays/eventlist.js';

class Qiwi extends Integration {
  interval: any = null;

  @settings()
  @ui({ type: 'text-input', secret: true })
  secretToken = '';

  @onStartup()
  @onChange('enabled')
  onEnabledChange (key: string, val: boolean) {
    if (val) {
      this.start();
    } else {
      clearInterval(this.interval);
    }
  }

  @onChange('secretToken')
  onTokenChange (key: string, val: string) {
    if (val) {
      this.start();
    } else {
      clearInterval(this.interval);
    }
  }

  async start () {
    clearInterval(this.interval);
    if (this.secretToken.trim() === '' || !this.enabled) {
      return;
    } else {
      this.interval = setInterval(() => this.check(), 3000);
    }
  }
  async check () {
    let request: any;
    try {
      request = await axios(`https://donate.qiwi.com/api/stream/v1/widgets/${this.secretToken}/events?limit=50`);
    } catch (e) {
      error(`Qiwi: error on api request: ${e.message}`);
      return;
    }
    const data = request.data;
    if (data.events.length === 0) {
      return;
    }
    for (const event of data.events) {
      const { DONATION_SENDER, DONATION_AMOUNT, DONATION_CURRENCY, DONATION_MESSAGE } = event.attributes;
      const username = DONATION_SENDER ? DONATION_SENDER.toLowerCase() : null;
      const message = DONATION_MESSAGE ? DONATION_MESSAGE : '';
      const amount = Number(DONATION_AMOUNT);
      const currency = DONATION_CURRENCY;

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

      let id: number | null = null;
      if (username) {
        const user = await getUser(username, await users.getIdByName(username.toLowerCase()));
        id = user.userId;
        const newTip: UserTipInterface = {
          amount: Number(amount),
          currency: currency,
          sortAmount: currency.exchange(Number(amount), currency, 'EUR'),
          message: message,
          tippedAt: Date.now(),
        };
        user.tips.push(newTip);
        getRepository(User).save(user);

      }

      if (api.isStreamOnline) {
        api.stats.currentTips += parseFloat(currency.exchange(amount, currency, currency.mainCurrency));
      }

      eventlist.add({
        event: 'tip',
        amount,
        currency,
        username: username || 'Anonymous',
        message,
        timestamp: Date.now(),
      });

      tip(`${username ? username : 'Anonymous'}${id ? '#' + id : ''}, amount: ${Number(amount).toFixed(2)}${DONATION_CURRENCY}, ${message ? 'message: ' + message : ''}`);

      events.fire('tip', {
        username: username || 'Anonymous',
        amount,
        currency,
        amountInBotCurrency: parseFloat(currency.exchange(amount, currency, currency.mainCurrency)).toFixed(2),
        currencyInBot: currency.mainCurrency,
        message,
      });

      alerts.trigger({
        event: 'tips',
        name: username || 'Anonymous',
        amount,
        currency,
        monthsName: '',
        message,
        autohost: false,
      });

      triggerInterfaceOnTip({
        username: username || 'Anonymous',
        amount: amount,
        message: message,
        currency: currency,
        timestamp: Date.now(),
      });

    }

  }
}

export default new Qiwi();

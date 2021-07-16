import axios from 'axios';
import { getRepository } from 'typeorm';

import currency from '../currency';
import { UserTip, UserTipInterface } from '../database/entity/user';
import { settings } from '../decorators';
import { onChange, onStartup } from '../decorators/on.js';
import { isStreamOnline, stats } from '../helpers/api/index.js';
import { mainCurrency } from '../helpers/currency';
import { eventEmitter } from '../helpers/events';
import { triggerInterfaceOnTip } from '../helpers/interface/triggers';
import { error, tip } from '../helpers/log';
import eventlist from '../overlays/eventlist.js';
import alerts from '../registries/alerts.js';
import users from '../users.js';
import Integration from './_interface';

class Qiwi extends Integration {
  interval: any = null;

  @settings()
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
      const username: string | null = DONATION_SENDER ? DONATION_SENDER.toLowerCase() : null;
      const message = DONATION_MESSAGE ? DONATION_MESSAGE : '';
      const amount = Number(DONATION_AMOUNT);

      let id: string | null = null;
      const timestamp = Date.now();
      if (username) {
        const user = await users.getUserByUsername(username);
        id = user.userId;
        const newTip: UserTipInterface = {
          amount:        Number(amount),
          currency:      DONATION_CURRENCY,
          sortAmount:    currency.exchange(Number(amount), DONATION_CURRENCY, mainCurrency.value),
          message:       message,
          tippedAt:      timestamp,
          exchangeRates: currency.rates,
          userId:        user.userId,
        };
        getRepository(UserTip).save(newTip);
      }

      if (isStreamOnline.value) {
        stats.value.currentTips = stats.value.currentTips + currency.exchange(amount, DONATION_CURRENCY, mainCurrency.value);
      }

      eventlist.add({
        event:    'tip',
        amount,
        currency: DONATION_CURRENCY,
        userId:   String(username ? await users.getIdByName(username.toLowerCase()) ?? '0' : '0'),
        message,
        timestamp,
      });

      tip(`${username ? username : 'Anonymous'}${id ? '#' + id : ''}, amount: ${Number(amount).toFixed(2)}${DONATION_CURRENCY}, ${message ? 'message: ' + message : ''}`);

      eventEmitter.emit('tip', {
        isAnonymous:         username ? false : true,
        username:            username || 'Anonymous',
        amount:              String(amount),
        currency:            DONATION_CURRENCY,
        amountInBotCurrency: Number(currency.exchange(amount, DONATION_CURRENCY, mainCurrency.value)).toFixed(2),
        currencyInBot:       mainCurrency.value,
        message,
      });

      alerts.trigger({
        event:      'tips',
        name:       username || 'Anonymous',
        amount,
        tier:       null,
        currency:   DONATION_CURRENCY,
        monthsName: '',
        message,
      });

      triggerInterfaceOnTip({
        username: username || 'Anonymous',
        amount,
        message,
        currency: DONATION_CURRENCY,
        timestamp,
      });

    }

  }
}

export default new Qiwi();

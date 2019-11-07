import axios from 'axios';
import { onChange, onStartup } from '../decorators/on.js';
import { settings } from '../decorators';
import { ui } from '../decorators.js';
import { triggerInterfaceOnTip } from '../helpers/interface/triggers';
import { error, tip } from '../helpers/log';
import Integration from './_interface';
import { getRepository } from 'typeorm';

import { User, UserTip } from '../entity/user.js';

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

      let user = await getRepository(User).findOne({ where: { username }});
      let id;
      if (!user) {
        id = await global.users.getIdByName(username, false);
        user = await getRepository(User).findOne({ where: { userId: id }});
        if (!user && id && username) {
          // if we still doesn't have user, we create new
          user = new User();
          user.userId = id;
          user.username = data.username.toLowerCase();
        }
      }

      const newTip = new UserTip();
      newTip.amount = Number(amount);
      newTip.currency = currency;
      newTip.sortAmount = global.currency.exchange(Number(amount), currency, 'EUR');
      newTip.message = message;
      newTip.tippedAt = Date.now();

      if (user) {
        user.tips.push(newTip);
        await getRepository(User).save(user);
      }

      if (global.api.isStreamOnline) {
        global.api.stats.currentTips += parseFloat(global.currency.exchange(amount, currency, global.currency.mainCurrency));
      }

      global.overlays.eventlist.add({
        event: 'tip',
        amount,
        currency,
        username: username || 'Anonymous',
        message,
        timestamp: Date.now(),
      });

      tip(`${username ? username : 'Anonymous'}${id ? '#' + id : ''}, amount: ${Number(amount).toFixed(2)}${DONATION_CURRENCY}, ${message ? 'message: ' + message : ''}`);

      global.events.fire('tip', {
        username: username || 'Anonymous',
        amount,
        currency,
        amountInBotCurrency: parseFloat(global.currency.exchange(amount, currency, global.currency.mainCurrency)).toFixed(2),
        currencyInBot: global.currency.mainCurrency,
        message,
      });

      global.registries.alerts.trigger({
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

export default Qiwi;
export { Qiwi };

import axios from 'axios';
import { onChange, onStartup } from '../decorators/on.js';
import { settings } from '../decorators';
import { ui } from '../decorators.js';
import { triggerInterfaceOnTip } from '../helpers/interface/triggers';
import { error, tip } from '../helpers/log';
import Integration from './_interface';

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

      const id = username ? await global.users.getIdByName(username, false) : null;
      if (id) {
        global.db.engine.insert('users.tips', {
          id,
          amount,
          currency,
          _amount: global.currency.exchange(Number(amount), currency, 'EUR'), // recounting amount to EUR to have simplified ordering
          _currency: 'EUR', // we are forcing _currency to have simplified ordering
          message,
          timestamp: Date.now() });
      }

      if (global.api.isStreamOnline) {
        global.api.stats.currentTips = parseFloat(global.currency.exchange(amount, currency, global.currency.mainCurrency));
      }

      global.overlays.eventlist.add({
        type: 'tip',
        amount,
        currency,
        username: username || 'Anonymous',
        message,
        timestamp: Date.now(),
      });

      tip(`${username ? username : 'Anonymous'}${id ? '#' + id : ''}, amount: ${amount}${DONATION_CURRENCY}, ${message ? 'message: ' + message : ''}`);

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

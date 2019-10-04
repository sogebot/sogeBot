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
  enabled = true;

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
    let request: any
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
    for (let event of data.events) {
      const { DONATION_SENDER, DONATION_AMOUNT, DONATION_CURRENCY, DONATION_MESSAGE } = event.attributes;
      const username = DONATION_SENDER ? DONATION_SENDER : "Anonymous";
      const message = DONATION_MESSAGE ? DONATION_MESSAGE : "";

      const id = await global.users.getIdByName(DONATION_SENDER.toLowerCase(), false);
      if (id) {
        global.db.engine.insert('users.tips', { id, amount: DONATION_AMOUNT, message: DONATION_MESSAGE, currency: DONATION_CURRENCY, timestamp: Date.now() });
      }
      if (await global.cache.isOnline()) {
        await global.db.engine.increment('api.current', { key: 'tips' }, { value: parseFloat(global.currency.exchange(DONATION_AMOUNT, DONATION_CURRENCY, global.currency.mainCurrency)) });
      }
      global.overlays.eventlist.add({
        type: 'tip',
        amount: DONATION_AMOUNT,
        currency: DONATION_CURRENCY,
        username: username,
        message: message,
        timestamp: Date.now(),
      })
      
      tip(`${DONATION_SENDER.toLowerCase()}${id ? '#' + id : ''}, amount: ${DONATION_AMOUNT}${DONATION_CURRENCY}, ${message ? 'message: ' + message : ''}`);

      global.events.fire('tip', {
        username: username,
        amount: DONATION_AMOUNT,
        currency: DONATION_CURRENCY,
        amountInBotCurrency: parseFloat(global.currency.exchange(DONATION_AMOUNT, DONATION_CURRENCY, global.currency.mainCurrency)).toFixed(2),
        currencyInBot: global.currency.mainCurrency,
        message: message,
      })
      global.registries.alerts.trigger({
        event: 'tips',
        name: DONATION_SENDER,
        amount: Number(DONATION_AMOUNT),
        currency: DONATION_CURRENCY,
        monthsName: '',
        message: message,
        autohost: false,
      });

      triggerInterfaceOnTip({
        username: username,
        amount: DONATION_AMOUNT,
        message: message,
        currency: DONATION_CURRENCY,
        timestamp: Date.now()
      });

    }
   
  }
}

export default Qiwi;
export { Qiwi };

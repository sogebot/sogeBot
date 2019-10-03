import * as _ from 'lodash';
import io from 'socket.io-client';
import chalk from 'chalk';

import Integration from './_interface';
import { settings, ui } from '../decorators';
import { onChange, onStartup } from '../decorators/on';
import { info, tip } from '../helpers/log';
import { triggerInterfaceOnTip } from '../helpers/interface/triggers';

/* example payload (eventData)
{
  _id: '5d967959cd89a10ce12818ad',
  channel: '5afbafb0c3a79ebedde18249',
  type: 'tip',
  provider: 'twitch',
  createdAt: '2019-10-03T22:42:33.023Z',
  data: {
    tipId: '5d967959531876d2589dd772',
    username: 'qwe',
    amount: 12,
    currency: 'RUB',
    message: 'saaaaaaa',
    items: [],
    avatar: 'https://static-cdn.jtvnw.net/user-default-pictures-uv/ebe4cd89-b4f4-4cd9-adac-2f30151b4209-profile_image-300x300.png'
  },
  updatedAt: '2019-10-03T22:42:33.023Z'
} */
class StreamElements extends Integration {
  socket: SocketIOClient.Socket | null = null;

  @settings()
  @ui({ type: 'text-input', secret: true })
  jwtToken = '';

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

  @onChange('jwtToken')
  async connect () {
    this.disconnect();

    if (this.jwtToken.trim() === '' || !this.enabled) {
      return;
    }

    this.socket = io.connect('https://realtime.streamelements.com', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      transports: ['websocket'],
    });

    this.socket.on('reconnect_attempt', () => {
      info(chalk.yellow('STREAMELEMENTS:') + ' Trying to reconnect to service');
    });

    this.socket.on('connect', () => {
      info(chalk.yellow('STREAMELEMENTS:') + ' Successfully connected socket to service');
      if (this.socket !== null) {
        this.socket.emit('authenticate', { method: 'jwt', token: this.jwtToken });
      }
    });

    this.socket.on('authenticated', () => {
      info(chalk.yellow('STREAMELEMENTS:') + ' Successfully authenticated on service');
    });
    
    this.socket.on('disconnect', () => {
      info(chalk.yellow('STREAMELEMENTS:') + ' Socket disconnected from service');
      if (this.socket) {
        this.socket.open();
      }
    });

    this.socket.on('event', async (eventData) => {
      this.parse(eventData);
    });
  }

  async parse(eventData) {
    if (eventData.type !== 'tip') {
      return;
    }
    const id = await global.users.getIdByName(eventData.data.username.toLowerCase(), false);
    if (id) {
      global.db.engine.insert('users.tips', { id, amount: eventData.data.amount, message: eventData.data.message, currency: eventData.data.currency, timestamp: _.now() });
    }
    if (await global.cache.isOnline()) {
      await global.db.engine.increment('api.current', { key: 'tips' }, { value: parseFloat(global.currency.exchange(eventData.data.amount, eventData.data.currency, global.currency.mainCurrency)) });
    }
    global.overlays.eventlist.add({
      type: 'tip',
      amount: eventData.data.amount,
      currency: eventData.data.currency,
      username: eventData.data.username.toLowerCase(),
      message: eventData.data.message,
      timestamp: Date.now(),
    });
    tip(`${eventData.data.username.toLowerCase()}, amount: ${eventData.data.amount}${eventData.data.currency}, message: ${eventData.data.message}`);
    global.events.fire('tip', {
      username: eventData.data.username.toLowerCase(),
      amount: parseFloat(eventData.data.amount).toFixed(2),
      currency: eventData.data.currency,
      amountInBotCurrency: parseFloat(global.currency.exchange(eventData.data.amount, eventData.data.currency, global.currency.mainCurrency)).toFixed(2),
      currencyInBot: global.currency.mainCurrency,
      message: eventData.data.message,
    });
    global.registries.alerts.trigger({
      event: 'tips',
      name: eventData.data.username.toLowerCase(),
      amount: Number(parseFloat(eventData.data.amount).toFixed(2)),
      currency: eventData.data.currency,
      monthsName: '',
      message: eventData.data.message,
      autohost: false,
    });

    triggerInterfaceOnTip({
      username: eventData.data.username.toLowerCase(),
      amount: eventData.data.amount,
      message: eventData.data.message,
      currency: eventData.data.currency,
      timestamp: _.now(),
    });
  }
}

export default StreamElements;
export { StreamElements };
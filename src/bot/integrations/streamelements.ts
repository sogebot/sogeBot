import io from 'socket.io-client';
import chalk from 'chalk';

import Integration from './_interface';
import { settings, ui } from '../decorators';
import { onChange, onStartup } from '../decorators/on';
import { info, tip } from '../helpers/log';
import { triggerInterfaceOnTip } from '../helpers/interface/triggers';
import { getRepository } from 'typeorm';
import { User, UserTip } from '../database/entity/user';

/* example payload (eventData)
{
  _id: '5d967959cd89a10ce12818ad',
  channel: '5afbafb0c3a79ebedde18249',
  event: 'tip',
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

    const { username, amount, currency, message } = eventData.data;

    let user = await getRepository(User).findOne({ where: { username: username.toLowerCase() }});
    let id;
    if (!user) {
      id = await global.users.getIdByName(username.toLowerCase());
      user = await getRepository(User).findOne({ where: { userId: id }});
      if (!user && id) {
        // if we still doesn't have user, we create new
        user = new User();
        user.userId = Number(id);
        user.username = username.toLowerCase();
        user = await getRepository(User).save(user);
      }
    } else {
      id = user.userId;
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

    tip(`${username.toLowerCase()}${id ? '#' + id : ''}, amount: ${Number(eventData.data.amount).toFixed(2)}${eventData.data.currency}, message: ${eventData.data.message}`);
    global.events.fire('tip', {
      username: username.toLowerCase(),
      amount: parseFloat(eventData.data.amount).toFixed(2),
      currency: eventData.data.currency,
      amountInBotCurrency: parseFloat(global.currency.exchange(eventData.data.amount, eventData.data.currency, global.currency.mainCurrency)).toFixed(2),
      currencyInBot: global.currency.mainCurrency,
      message: eventData.data.message,
    });
    global.registries.alerts.trigger({
      event: 'tips',
      name: username.toLowerCase(),
      amount: Number(parseFloat(eventData.data.amount).toFixed(2)),
      currency: eventData.data.currency,
      monthsName: '',
      message: eventData.data.message,
      autohost: false,
    });

    triggerInterfaceOnTip({
      username: username.toLowerCase(),
      amount: eventData.data.amount,
      message: eventData.data.message,
      currency: eventData.data.currency,
      timestamp: Date.now(),
    });
  }
}

export default StreamElements;
export { StreamElements };
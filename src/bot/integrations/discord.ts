// 3rdparty libraries
import chalk from 'chalk';
import { get } from 'lodash';
import * as DiscordJs from 'discord.js';

// bot libraries
import Integration from './_interface';
import { settings, ui } from '../decorators';
import { onChange, onStartup } from '../decorators/on';
import { error, info } from '../helpers/log';
import { adminEndpoint } from '../helpers/socket';

const debouncing: { [func: string]: number } = {};
const isDebounced = async (func: string, ms: number): Promise<boolean> => {
  if (debouncing[func]) {
    const shouldBeDeleted = Date.now() - debouncing[func] > ms + 50;
    if (shouldBeDeleted) {
      delete debouncing[func];
    }
  }

  const isAlreadyWaiting = typeof debouncing[func] !== 'undefined';
  debouncing[func] = Date.now();
  if (isAlreadyWaiting) {
    return false; // do nothing after this (we have first waiting function)
  } else {
    // initial function - waiting for expected ms
    return new Promise((resolve) => {
      const check = () => {
        const shouldBeRun = Date.now() - debouncing[func] > ms;
        if (shouldBeRun) {
          resolve(true);
        } else {
          setTimeout(() => check(), 10);
        }
      };
      check();
    });
  }
};

class Discord extends Integration {
  client: DiscordJs.Client | null = null;

  @settings('general')
  @ui({ type: 'text-input', secret: true })
  clientId = '';

  @settings('general')
  @ui({ type: 'text-input', secret: true })
  token = '';

  @ui({
    type: 'btn-emit',
    class: 'btn btn-primary btn-block mt-1 mb-1',
    if: () => self.clientId.length > 0 && self.token.length > 0,
    emit: 'authorize',
  }, 'general')
  authorizeBtn = null;

  @settings('bot')
  listenAtChannels = '';

  @settings('bot')
  sendOnlineAnnounceToChannel = '';

  @onStartup()
  @onChange('enabled')
  @onChange('token')
  async onStateChange(key: string, value: boolean) {
    if (await isDebounced('OnStateChange', 1000)) {
      if (this.enabled && this.token.length > 0) {
        this.initClient();
        if (this.client) {
          this.client.login('token').catch((reason) => {
            error(chalk.bgRedBright('DISCORD') + ': ' + reason);
          });
        }
      } else {
        if (this.client) {
          this.client.destroy();
        }
      }
    }
  }

  initClient() {
    if (!this.client) {
      this.client = new DiscordJs.Client();
      this.client.on('ready', () => {
        if (this.client) {
          info(chalk.yellow('DISCORD: ') + `Logged in as ${get(this.client, 'user.tag', 'unknown')}!`);
        }
      });

      this.client.on('message', msg => {
        const channels = this.listenAtChannels.split(',').map(o => o.trim());
        if (msg.channel.type === 'text' && channels.length > 0) {
          console.log(msg.channel.name);
          console.log(msg.channel.id);
          if (channels.includes(msg.channel.name) || channels.includes(msg.channel.id)) {
            if (msg.content === 'ping') {
              msg.reply('pong');
            }
          }
        }
      });
    }
  }

  sockets() {
    adminEndpoint(this.nsp, 'authorize', async (cb) => {
      if (this.token === '' || this.clientId === '') {
        cb('Cannot authorize! Missing clientId or token.', null);
      } else {
        try {
          cb(null, { do: 'redirect', opts: [`https://discordapp.com/oauth2/authorize?&scope=bot&permissions=8&client_id=${this.clientId}`] });
        } catch (e) {
          error(e.stack);
          cb(e.stack, null);
        }
      }
    });
  }
}

const self = new Discord();
export default self;

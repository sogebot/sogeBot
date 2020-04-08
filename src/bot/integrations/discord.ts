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
import { debounce } from '../helpers/debounce';

import { v5 as uuidv5 } from 'uuid';

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
    if (await debounce(uuidv5('onStateChange', this.uuid), 1000)) {
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

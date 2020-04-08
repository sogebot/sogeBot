// 3rdparty libraries
import chalk from 'chalk';
import { get } from 'lodash';
import * as DiscordJs from 'discord.js';

// bot libraries
import Integration from './_interface';
import { settings, ui } from '../decorators';
import { onChange, onStartup } from '../decorators/on';
import { chatIn, chatOut, error, info, whisperOut } from '../helpers/log';
import { adminEndpoint } from '../helpers/socket';
import { debounce } from '../helpers/debounce';

import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import oauth from '../oauth';

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
          this.client.login(this.token).catch((reason) => {
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

      this.client.on('message', async (msg) => {
        if (this.client) {
          if (msg.author.tag === get(this.client, 'user.tag', null)) {
            // don't do anything on self messages;
            return;
          }

          const channels = this.listenAtChannels.split(',').map(o => o.trim());
          if (msg.channel.type === 'text' && channels.length > 0) {
            if (channels.includes(msg.channel.name) || channels.includes(msg.channel.id)) {
              chatIn(`#${msg.channel.name}: ${msg.content} [${msg.author.tag}]`);
              if (msg.content === '!link') {
                const uuid = uuidv4();
                msg.author.send(`Hello ${msg.author.tag}, to link this Discord account with your Twitch account on ${oauth.broadcasterUsername} channel, go to https://twitch.tv/${oauth.broadcasterUsername}, login to your account and send this command to chat \n\n\t\t\`!link ${uuid}\`\n\nNOTE: This expires in 10 minutes.`);
                whisperOut(`${msg.author.tag}: Hello ${msg.author.tag}, to link this Discord account with your Twitch account on ${oauth.broadcasterUsername} channel, go to https://twitch.tv/${oauth.broadcasterUsername}, login to your account and send this command to chat \\n\\n\\t\\t\`!link ${uuid}\`\\n\\nNOTE: This expires in 10 minutes.`);

                const reply = await msg.reply('check your DMs for steps to link your account.');
                chatOut(`#${msg.channel.name}: @${msg.author.tag}, check your DMs for steps to link your account. [${msg.author.tag}]`);
                setTimeout(() => {
                  msg.delete();
                  reply.delete();
                }, 10000);
              } else if (msg.content === '!ping') {
                const message = `Pong! \`${Date.now() - msg.createdTimestamp}ms\``;
                const reply = await msg.reply(message);
                chatOut(`#${msg.channel.name}: @${msg.author.tag}, ${message} [${msg.author.tag}]`);
                setTimeout(() => {
                  msg.delete();
                  reply.delete();
                }, 10000);
              }
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

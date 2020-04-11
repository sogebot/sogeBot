// 3rdparty libraries
import chalk from 'chalk';
import { get } from 'lodash';
import * as DiscordJs from 'discord.js';

// bot libraries
import Integration from './_interface';
import { command, settings, ui } from '../decorators';
import { onChange, onStartup } from '../decorators/on';
import { chatIn, chatOut, error, info, warning, whisperOut } from '../helpers/log';
import { adminEndpoint } from '../helpers/socket';
import { debounce } from '../helpers/debounce';

import { v5 as uuidv5 } from 'uuid';
import oauth from '../oauth';
import Expects from '../expects';
import { isUUID, sendMessage } from '../commons';

import { getRepository, IsNull, LessThan, Not } from 'typeorm';
import { DiscordLink } from '../database/entity/discord';
import { User } from '../database/entity/user';
import { MINUTE } from '../constants';
import Parser from '../parser';
import { Message } from '../message';

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

  @settings('bot')
  deleteMessagesAfterWhile = false;

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

  removeExpiredLinks() {
    // remove expired links
    getRepository(DiscordLink).delete({
      userId: IsNull(), createdAt: LessThan(Date.now() - (MINUTE * 10)),
    });
  }

  @command('!unlink')
  async unlinkAccounts(opts: CommandOptions) {
    this.removeExpiredLinks();
    await getRepository(DiscordLink).delete({ userId: Number(opts.sender.userId) });
    sendMessage('all links were deleted', opts.sender);
  }

  @command('!link')
  async linkAccounts(opts: CommandOptions) {
    enum error { NOT_UUID };
    this.removeExpiredLinks();

    try {
      const [ uuid ] = new Expects(opts.parameters).everything().toArray();
      if (!isUUID(uuid)) {
        throw new Error(String(error.NOT_UUID));
      }

      const link = await getRepository(DiscordLink).findOneOrFail({ id: uuid });
      // link user
      await getRepository(DiscordLink).save({
        ...link, userId: opts.sender.userId,
      });
      sendMessage(`this account was linked with ${link.tag}`, opts.sender);
    } catch (e) {
      if (e.message === String(error.NOT_UUID)) {
        sendMessage('invalid token', opts.sender);
      } else {
        warning(e.stack);
        sendMessage('something went wrong', opts.sender);
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
                this.removeExpiredLinks();
                const link = await getRepository(DiscordLink).save({
                  userId: null,
                  tag: msg.author.tag,
                  createdAt: Date.now(),
                });
                msg.author.send(`Hello ${msg.author.tag}, to link this Discord account with your Twitch account on ${oauth.broadcasterUsername} channel, go to https://twitch.tv/${oauth.broadcasterUsername}, login to your account and send this command to chat \n\n\t\t\`!link ${link.id}\`\n\nNOTE: This expires in 10 minutes.`);
                whisperOut(`${msg.author.tag}: Hello ${msg.author.tag}, to link this Discord account with your Twitch account on ${oauth.broadcasterUsername} channel, go to https://twitch.tv/${oauth.broadcasterUsername}, login to your account and send this command to chat \\n\\n\\t\\t\`!link ${link.id}\`\\n\\nNOTE: This expires in 10 minutes.`);

                const reply = await msg.reply('check your DMs for steps to link your account.');
                chatOut(`#${msg.channel.name}: @${msg.author.tag}, check your DMs for steps to link your account. [${msg.author.tag}]`);
                if (this.deleteMessagesAfterWhile) {
                  setTimeout(() => {
                    msg.delete();
                    reply.delete();
                  }, 10000);
                }
              } else if (msg.content === '!unlink') {
                await getRepository(DiscordLink).delete({ tag: msg.author.tag });
                msg.reply('all links were deleted');
              } else if (msg.content === '!ping') {
                const message = `Pong! \`${Date.now() - msg.createdTimestamp}ms\``;
                const reply = await msg.reply(message);
                chatOut(`#${msg.channel.name}: @${msg.author.tag}, ${message} [${msg.author.tag}]`);
                if (this.deleteMessagesAfterWhile) {
                  setTimeout(() => {
                    msg.delete();
                    reply.delete();
                  }, 10000);
                }
              } else {
                try {
                  // get linked account
                  const link = await getRepository(DiscordLink).findOneOrFail({ tag: msg.author.tag, userId: Not(IsNull()) });
                  if (link.userId) {
                    const user = await getRepository(User).findOneOrFail({ userId: link.userId });
                    const parser = new Parser();
                    parser.command(
                      {
                        badges: {}, color: '',  displayName: '', emoteSets: [], emotes: [], userId: link.userId, username: user.username, userType: 'viewer',
                        mod: 'false', subscriber: 'false', turbo: 'false',
                      },
                      msg.content,
                    ).then(responses => {
                      if (responses) {
                        for (let i = 0; i < responses.length; i++) {
                          setTimeout(async () => {
                            if (msg.channel.type === 'text' && channels.length > 0) {
                              const messageToSend = await new Message(responses[i].response).parse({
                                ...responses[i].attr,
                                forceWithoutAt: true, // we dont need @
                                sender: { ...responses[i].sender, username: msg.author },
                              }) as string;
                              const reply = await msg.channel.send(messageToSend);
                              chatOut(`#${msg.channel.name}: ${messageToSend} [${msg.author.tag}]`);
                              if (this.deleteMessagesAfterWhile) {
                                setTimeout(() => {
                                  msg.delete();
                                  reply.delete();
                                }, 10000);
                              }
                            };
                          }, 1000 * i);
                        };
                      }
                    });
                  }
                } catch (e) {
                  const message = `your account is not linked, use \`!link\``;
                  const reply = await msg.reply(message);
                  chatOut(`#${msg.channel.name}: @${msg.author.tag}, ${message} [${msg.author.tag}]`);
                  if (this.deleteMessagesAfterWhile) {
                    setTimeout(() => {
                      msg.delete();
                      reply.delete();
                    }, 10000);
                  }
                }
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

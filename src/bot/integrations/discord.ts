// 3rdparty libraries
import chalk from 'chalk';
import { get } from 'lodash';
import * as DiscordJs from 'discord.js';

// bot libraries
import Integration from './_interface';
import { command, settings, ui } from '../decorators';
import { onChange, onStartup, onStreamEnd, onStreamStart } from '../decorators/on';
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
import api from '../api';
import moment from 'moment';
import general from '../general';

const timezone = (process.env.TIMEZONE ?? 'system') === 'system' || !process.env.TIMEZONE ? moment.tz.guess() : process.env.TIMEZONE;

class Discord extends Integration {
  client: DiscordJs.Client | null = null;

  embed: DiscordJs.MessageEmbed | null = null;
  embedMessage: DiscordJs.Message | null = null;
  embedStartedAt = '';

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
  sendGeneralAnnounceToChannel = '';

  @settings('bot')
  deleteMessagesAfterWhile = false;

  constructor() {
    super();

    // embed updater
    setInterval(() => {
      if (this.embed && this.embedMessage && api.isStreamOnline) {
        this.embed.spliceFields(0, this.embed.fields.length);
        this.embed.addFields([
          { name: 'Now Playing', value: api.stats.currentGame},
          { name: 'Stream Title', value: api.stats.currentTitle},
          { name: 'Started At', value: this.embedStartedAt, inline: true},
          { name: 'Total Views', value: api.stats.currentViews, inline: true},
          { name: 'Followers', value: api.stats.currentFollowers, inline: true},
        ]);

        if (oauth.broadcasterType !== '') {
          this.embed.addField('Subscribers', api.stats.currentSubscribers, true);
        }
        this.embedMessage.edit(this.embed);
      }
    }, MINUTE * 10);
  }

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

  @onStreamEnd()
  updateStreamStartAnnounce() {
    if (this.embed && this.embedMessage) {
      this.embed.setColor(0xff0000);
      this.embed.setDescription(`${oauth.broadcasterUsername} is not streaming anymore! Check it next time!`);
      this.embed.spliceFields(0, this.embed.fields.length);
      this.embed.addFields([
        { name: 'Now Playing', value: api.stats.currentGame},
        { name: 'Stream Title', value: api.stats.currentTitle},
        { name: 'Started At', value: this.embedStartedAt, inline: true},
        { name: 'Stopped At', value: moment().tz(timezone).format('LLL'), inline: true},
        { name: 'Total Views', value: api.stats.currentViews, inline: true},
        { name: 'Followers', value: api.stats.currentFollowers, inline: true},
      ]);

      if (oauth.broadcasterType !== '') {
        this.embed.addField('Subscribers', api.stats.currentSubscribers, true);
      }
      this.embedMessage.edit(this.embed);
    }
    this.embed = null;
    this.embedMessage = null;
  }

  @onStreamStart()
  async sendStreamStartAnnounce() {
    moment.locale(general.lang); // set moment locale

    if (this.client && this.sendOnlineAnnounceToChannel.length > 0) {
      // search discord channel by ID
      for (const [ id, channel ] of this.client.channels.cache) {
        if (channel.type === 'text') {
          if (id === this.sendOnlineAnnounceToChannel || (channel as DiscordJs.TextChannel).name === this.sendGeneralAnnounceToChannel) {
            const ch = this.client.channels.cache.find(ch => ch.id === id);
            if (ch) {
              this.embedStartedAt = moment().tz(timezone).format('LLL');
              const embed = new DiscordJs.MessageEmbed()
                .setURL('https://twitch.tv/' + oauth.broadcasterUsername)
                .addFields([
                  { name: 'Now Playing', value: api.stats.currentGame},
                  { name: 'Stream Title', value: api.stats.currentTitle},
                  { name: 'Started At', value: this.embedStartedAt, inline: true},
                  { name: 'Total Views', value: api.stats.currentViews, inline: true},
                  { name: 'Followers', value: api.stats.currentFollowers, inline: true},
                ])
                // Set the title of the field
                .setTitle('https://twitch.tv/' + oauth.broadcasterUsername)
                // Set the color of the embed
                .setColor(0x00ff00)
                // Set the main content of the embed
                .setDescription(`${oauth.broadcasterUsername} started stream! Check it out!`)
                .setThumbnail(oauth.profileImageUrl)
                .setFooter('Announced by sogeBot - https://www.sogebot.xyz');

              if (oauth.broadcasterType !== '') {
                embed.addField('Subscribers', api.stats.currentSubscribers, true);
              }
              // Send the embed to the same channel as the message
              this.embedMessage = await (ch as DiscordJs.TextChannel).send(embed);
              chatOut(`#${(ch as DiscordJs.TextChannel).name}: [[online announce embed]] [${this.client.user?.tag}]`);
              this.embed = embed;
            }
          }
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

          // test
          this.sendStreamStartAnnounce();
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
                        mod: 'false', subscriber: 'false', turbo: 'false', discord: { author: msg.author, channel: msg.channel },
                      },
                      msg.content,
                    ).then(responses => {
                      if (responses) {
                        for (let i = 0; i < responses.length; i++) {
                          setTimeout(async () => {
                            if (msg.channel.type === 'text' && channels.length > 0) {
                              const messageToSend = await new Message(await responses[i].response).parse({
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

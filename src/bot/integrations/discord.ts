// 3rdparty libraries

// bot libraries

import chalk from 'chalk';
import * as DiscordJs from 'discord.js';
import { get } from 'lodash';
import {
  getRepository, IsNull, LessThan, Not,
} from 'typeorm';
import { v5 as uuidv5 } from 'uuid';

import { HOUR, MINUTE } from '../constants';
import { DiscordLink } from '../database/entity/discord';
import { Permissions as PermissionsEntity } from '../database/entity/permissions';
import { User } from '../database/entity/user';
import {
  command, persistent, settings, ui,
} from '../decorators';
import {
  onChange, onStartup, onStreamEnd, onStreamStart,
} from '../decorators/on';
import events from '../events';
import Expects from '../expects';
import { isStreamOnline, stats } from '../helpers/api';
import { attributesReplace } from '../helpers/attributesReplace';
import {
  announceTypes, getOwner, isUUID, prepare,
} from '../helpers/commons';
import { isBotStarted, isDbConnected } from '../helpers/database';
import { dayjs, timezone } from '../helpers/dayjs';
import { debounce } from '../helpers/debounce';
import { eventEmitter } from '../helpers/events';
import {
  chatIn, chatOut, debug, error, info, warning, whisperOut,
} from '../helpers/log';
import { generalChannel } from '../helpers/oauth/generalChannel';
import { check } from '../helpers/permissions/';
import { get as getPermission } from '../helpers/permissions/get';
import { adminEndpoint } from '../helpers/socket';
import { isModerator } from '../helpers/user';
import { Message } from '../message';
import { getIdFromTwitch } from '../microservices/getIdFromTwitch';
import oauth from '../oauth';
import Parser from '../parser';
import users from '../users';
import Integration from './_interface';

class Discord extends Integration {
  client: DiscordJs.Client | null = null;

  @persistent()
  embedStartedAt = '';
  @persistent()
  embedMessageId = '';

  @settings('general')
  @ui({ type: 'text-input', secret: true })
  clientId = '';

  @settings('general')
  @ui({ type: 'text-input', secret: true })
  token = '';

  @ui({
    type:  'btn-emit',
    class: 'btn btn-primary btn-block mt-1 mb-1',
    if:    () => self.clientId.length > 0 && self.token.length > 0,
    emit:  'discord::authorize',
  }, 'general')
  joinToServerBtn = null;

  @ui({
    type:  'btn-emit',
    class: 'btn btn-primary btn-block mt-1 mb-1',
    if:    () => self.clientId.length === 0 || self.token.length === 0,
  }, 'general')
  cannotJoinToServerBtn = null;

  @settings('bot')
  @ui({
    type: 'discord-guild',
    if:   () => self.clientId.length > 0 && self.token.length > 0,
  })
  guild = '';

  @ui({
    if:      () => self.clientId.length > 0 && self.guild.length === 0,
    type:    'helpbox',
    variant: 'info',
  }, 'bot')
  noGuildSelectedBox = null;

  @settings('bot')
  @ui({
    type: 'discord-channel',
    if:   () => self.guild.length > 0,
  })
  listenAtChannels: string | string[] = '';

  @settings('bot')
  @ui({
    type: 'discord-channel',
    if:   () => self.guild.length > 0,
  })
  sendOnlineAnnounceToChannel = '';

  @settings('bot')
  @ui({
    type: 'discord-channel',
    if:   () => self.guild.length > 0,
  })
  sendAnnouncesToChannel: { [key in typeof announceTypes[number]]: string } = {
    bets:    '',
    duel:    '',
    general: '',
    heist:   '',
    polls:   '',
    raffles: '',
    scrim:   '',
    songs:   '',
    timers:  '',
  };

  @settings('bot')
  ignorelist: string[] = [];

  @settings('status')
  @ui({
    type:   'selector', values: ['online', 'idle', 'invisible', 'dnd'],
    if:     () => self.guild.length > 0,
  })
  onlinePresenceStatusDefault: 'online' | 'idle' | 'invisible' | 'dnd' = 'online';

  @settings('status')
  @ui({
    type:   'text-input',
    secret: false,
    if:     () => self.guild.length > 0,
  })
  onlinePresenceStatusDefaultName = '';

  @settings('status')
  @ui({
    type:   'selector', values: ['streaming', 'online', 'idle', 'invisible', 'dnd'],
    if:     () => self.guild.length > 0,
  })
  onlinePresenceStatusOnStream: 'streaming' | 'online' | 'idle' | 'invisible' | 'dnd' = 'online';

  @settings('status')
  @ui({
    type:   'text-input',
    secret: false,
    if:     () => self.guild.length > 0,
  })
  onlinePresenceStatusOnStreamName = '$title';

  @settings('mapping')
  @ui({
    type: 'discord-mapping',
    if:   () => self.guild.length > 0,
  })
  rolesMapping: { [permissionId: string]: string } = {};

  @settings('bot')
  @ui({
    type: 'toggle-enable',
    if:   () => self.guild.length > 0,
  })
  deleteMessagesAfterWhile = false;

  @onStartup()
  onStartup() {
    this.addEvent();

    // embed updater
    setInterval(async () => {
      if (isStreamOnline.value && this.client && this.embedMessageId.length > 0) {
        this.changeClientOnlinePresence();
        const channel = this.client.guilds.cache.get(this.guild)?.channels.cache.get(this.sendOnlineAnnounceToChannel);
        if (channel) {
          const message = await (channel as DiscordJs.TextChannel).messages.fetch(this.embedMessageId);
          const embed = message?.embeds[0];
          if (message && embed) {
            embed.spliceFields(0, embed.fields.length);
            embed.addFields([
              { name: prepare('webpanel.responses.variable.game'), value: stats.value.currentGame },
              { name: prepare('webpanel.responses.variable.title'), value: stats.value.currentTitle },
              {
                name: prepare('integrations.discord.started-at'), value: this.embedStartedAt, inline: true,
              },
              {
                name: prepare('webpanel.viewers'), value: stats.value.currentViewers, inline: true,
              },
              {
                name: prepare('webpanel.views'), value: stats.value.currentViews, inline: true,
              },
              {
                name: prepare('webpanel.followers'), value: stats.value.currentFollowers, inline: true,
              },
            ]);
            embed.setImage(`https://static-cdn.jtvnw.net/previews-ttv/live_user_${generalChannel.value}-1920x1080.jpg?${Date.now()}`);

            if (oauth.broadcasterType !== '') {
              embed.addField(prepare('webpanel.subscribers'), stats.value.currentSubscribers, true);
            }
            message.edit(embed);
          }
        }
      }
    }, MINUTE * 10);

    setInterval(() => this.updateRolesOfLinkedUsers(), HOUR);
  }

  async updateRolesOfLinkedUsers() {
    if (!isDbConnected || !this.client) {
      return;
    }

    // go through mappings and delete zombies
    for (const mapped of Object.keys(this.rolesMapping)) {
      const doesPermissionExist = typeof (await getPermission(mapped)) !== 'undefined';
      if (!doesPermissionExist || this.rolesMapping[mapped] === '') {
        // delete permission if doesn't exist anymore
        delete this.rolesMapping[mapped];
        continue;
      }
    }

    const linkedUsers = await getRepository(DiscordLink).find();
    for (const user of linkedUsers) {
      if (!user.userId) {
        continue;
      }
      const guild = this.client.guilds.cache.get(this.guild);
      if (!guild) {
        return warning('No servers found for discord');
      }
      const discordUser = guild.member(await guild.members.fetch(user.discordId));
      if (!discordUser) {
        warning('Discord user not found');
        continue;
      }
      const botPermissionsSortedByPriority = await getRepository(PermissionsEntity).find({
        relations: ['filters'],
        order:     { order: 'ASC' },
      });

      const alreadyAssignedRoles: string[] = [];
      for (const botPermission of botPermissionsSortedByPriority) {
        if (!this.rolesMapping[botPermission.id]) {
          debug('discord.roles', `Permission ${botPermission.name}#${botPermission.id} is not mapped.`);
          // we don't have mapping set for this permission
          continue;
        }

        // role was already assigned by higher permission (we don't want to remove it)
        // e.g. Ee have same role for Subscriber and VIP
        //      User is subscriber but not VIP -> should have role
        if (alreadyAssignedRoles.includes(this.rolesMapping[botPermission.id])) {
          debug('discord.roles', `Role ${this.rolesMapping[botPermission.id]} is already mapped for user ${user.userId}`);
          continue;
        }

        const haveUserAnAccess = (await check(user.userId, botPermission.id, true)).access;
        const role = await guild.roles.fetch(this.rolesMapping[botPermission.id]);
        if (!role) {
          warning(`Role with ID ${this.rolesMapping[botPermission.id]} not found on your Discord Server`);
          continue;
        }
        debug('discord.roles', `User ${user.userId} - permission ${botPermission.id} - role ${role.name} - ${haveUserAnAccess}`);

        if (haveUserAnAccess) {
          // add role to user
          alreadyAssignedRoles.push(role.id);
          if (discordUser.roles.cache.has(role.id)) {
            debug('discord.roles', `User ${user.userId} already have role ${role.name}`);
          } else {
            discordUser.roles.add(role).catch(roleError => {
              warning('Cannot add role to user, check permission for bot (bot cannot set role above his own)');
              warning(roleError);
            }).then(member => {
              debug('discord.roles', `User ${user.userId} have new role ${role.name}`);
            });
          }
        } else {
          // remove role from user
          if (!discordUser.roles.cache.has(role.id)) {
            debug('discord.roles', `User ${user.userId} already doesn't have role ${role.name}`);
          } else {
            discordUser.roles.remove(role).catch(roleError => {
              warning('Cannot remove role to user, check permission for bot (bot cannot set role above his own)');
              warning(roleError);
            }).then(member => {
              debug('discord.roles', `User ${user.userId} have removed role ${role.name}`);
            });
          }
        }
      }
    }
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
    getRepository(DiscordLink).delete({ userId: IsNull(), createdAt: LessThan(Date.now() - (MINUTE * 10)) });
  }

  @command('!unlink')
  async unlinkAccounts(opts: CommandOptions) {
    this.removeExpiredLinks();
    await getRepository(DiscordLink).delete({ userId: opts.sender.userId });
    return [{ response: prepare('integrations.discord.all-your-links-were-deleted', { sender: opts.sender }), ...opts }];
  }

  @command('!link')
  async linkAccounts(opts: CommandOptions) {
    enum errors { NOT_UUID }
    this.removeExpiredLinks();

    try {
      const [ uuid ] = new Expects(opts.parameters).everything({ name: 'uuid' }).toArray();
      if (!isUUID(uuid)) {
        throw new Error(String(errors.NOT_UUID));
      }

      const link = await getRepository(DiscordLink).findOneOrFail({ id: uuid });
      // link user
      await getRepository(DiscordLink).save({ ...link, userId: opts.sender.userId });
      return [{ response: prepare('integrations.discord.this-account-was-linked-with', { sender: opts.sender, discordTag: link.tag }), ...opts }];
    } catch (e) {
      if (e.message.includes('Expected parameter')) {
        return [
          { response: prepare('integrations.discord.help-message', { sender: opts.sender, command: this.getCommand('!link') }), ...opts },
        ];
      } else {
        if (e.message !== String(errors.NOT_UUID)) {
          warning(e.stack);
        }
        return [{ response: prepare('integrations.discord.invalid-or-expired-token', { sender: opts.sender }), ...opts }];
      }
    }
  }

  @onStreamEnd()
  async updateStreamStartAnnounce() {
    this.changeClientOnlinePresence();
    const channel = this.client?.guilds.cache.get(this.guild)?.channels.cache.get(this.sendOnlineAnnounceToChannel);
    if (channel && this.embedMessageId !== '') {
      try {
        const message = await (channel as DiscordJs.TextChannel).messages.fetch(this.embedMessageId);
        const embed = message?.embeds[0];
        if (message && embed) {
          embed.setColor(0xff0000);
          embed.setDescription(`${generalChannel.value.charAt(0).toUpperCase() + generalChannel.value.slice(1)} is not streaming anymore! Check it next time!`);
          embed.spliceFields(0, embed.fields.length);
          embed.addFields([
            { name: prepare('webpanel.responses.variable.game'), value: stats.value.currentGame },
            { name: prepare('webpanel.responses.variable.title'), value: stats.value.currentTitle },
            {
              name: prepare('integrations.discord.streamed-at'), value: `${this.embedStartedAt} - ${dayjs().tz(timezone).format('LLL')}`, inline: true,
            },
            {
              name: prepare('webpanel.views'), value: stats.value.currentViews, inline: true,
            },
            {
              name: prepare('webpanel.followers'), value: stats.value.currentFollowers, inline: true,
            },
          ]);
          embed.setImage(`https://static-cdn.jtvnw.net/ttv-static/404_preview-1920x1080.jpg?${Date.now()}`);

          if (oauth.broadcasterType !== '') {
            embed.addField(prepare('webpanel.subscribers'), stats.value.currentSubscribers, true);
          }
          message.edit(embed);
        }
      } catch (e) {
        warning(`Discord embed couldn't be changed to offline - ${e.message}`);
      }
    }
    this.embedMessageId = '';
  }

  @onStreamStart()
  async sendStreamStartAnnounce() {
    this.changeClientOnlinePresence();
    try {
      if (this.client && this.sendOnlineAnnounceToChannel.length > 0 && this.guild.length > 0) {
        const channel = this.client.guilds.cache.get(this.guild)?.channels.cache.get(this.sendOnlineAnnounceToChannel);
        if (!channel) {
          throw new Error(`Channel ${this.sendOnlineAnnounceToChannel} not found on your discord server`);
        }

        this.embedStartedAt = dayjs().tz(timezone).format('LLL');
        const embed = new DiscordJs.MessageEmbed()
          .setURL('https://twitch.tv/' + generalChannel.value)
          .addFields([
            { name: prepare('webpanel.responses.variable.game'), value: stats.value.currentGame },
            { name: prepare('webpanel.responses.variable.title'), value: stats.value.currentTitle },
            {
              name: prepare('integrations.discord.started-at'), value: this.embedStartedAt, inline: true,
            },
            {
              name: prepare('webpanel.views'), value: stats.value.currentViews, inline: true,
            },
            {
              name: prepare('webpanel.followers'), value: stats.value.currentFollowers, inline: true,
            },
          ])
          // Set the title of the field
          .setTitle('https://twitch.tv/' + generalChannel.value)
          // Set the color of the embed
          .setColor(0x00ff00)
          // Set the main content of the embed
          .setDescription(`${generalChannel.value.charAt(0).toUpperCase() + generalChannel.value.slice(1)} started stream! Check it out!`)
          .setImage(`https://static-cdn.jtvnw.net/previews-ttv/live_user_${generalChannel.value}-1920x1080.jpg?${Date.now()}`)
          .setThumbnail(oauth.profileImageUrl)
          .setFooter('Announced by sogeBot - https://www.sogebot.xyz');

        if (oauth.broadcasterType !== '') {
          embed.addField(prepare('webpanel.subscribers'), stats.value.currentSubscribers, true);
        }
        // Send the embed to the same channel as the message
        const message = await (channel as DiscordJs.TextChannel).send(embed);
        this.embedMessageId = message.id;
        chatOut(`#${(channel as DiscordJs.TextChannel).name}: [[online announce embed]] [${this.client.user?.tag}]`);
      }
    } catch (e) {
      warning(e.stack);
    }
  }

  @onChange('onlinePresenceStatusOnStreamName')
  @onChange('onlinePresenceStatusDefaultName')
  @onChange('onlinePresenceStatusOnStream')
  @onChange('onlinePresenceStatusDefault')
  async changeClientOnlinePresence() {
    if (!isBotStarted) {
      setTimeout(() => {
        this.changeClientOnlinePresence();
      }, 1000);
      return;
    }
    try {
      if (isStreamOnline.value) {
        const activityString = await new Message(this.onlinePresenceStatusOnStreamName).parse();
        if (this.onlinePresenceStatusOnStream === 'streaming') {
          this.client?.user?.setStatus('online');
          this.client?.user?.setPresence({
            status:   'online', activity: {
              name: activityString, type: 'STREAMING', url: `https://twitch.tv/${generalChannel.value}`,
            },
          });
        } else {
          this.client?.user?.setStatus(this.onlinePresenceStatusOnStream);
          if (activityString !== '') {
            this.client?.user?.setActivity('');
          } else {
            this.client?.user?.setPresence({ status: this.onlinePresenceStatusOnStream, activity: { name: activityString } });
          }
        }
      } else {
        const activityString = await new Message(this.onlinePresenceStatusDefaultName).parse();
        if (activityString !== ''){
          this.client?.user?.setStatus(this.onlinePresenceStatusDefault);
          this.client?.user?.setPresence({ status: this.onlinePresenceStatusDefault, activity: { name: activityString } });
        } else {
          this.client?.user?.setActivity('');
          this.client?.user?.setStatus(this.onlinePresenceStatusDefault);
        }
      }
    } catch (e) {
      warning(e.stack);
    }
  }

  public addEvent(){
    if (typeof events === 'undefined') {
      setTimeout(() => this.addEvent(), 1000);
    } else {
      events.supportedOperationsList.push(
        {
          id: 'send-discord-message', definitions: { channel: '', messageToSend: '' }, fire: this.fireSendDiscordMessage,
        },
      );
    }
  }

  /* note: as we are using event, we need to use self as pointer to discord class */
  public async fireSendDiscordMessage(operation: Events.OperationDefinitions, attributes: Events.Attributes): Promise<void> {
    const dMchannel = String(operation.channel);
    try {
      if (self.client === null) {
        throw new Error('Discord integration is not connected');
      }
      const username = attributes.username === null || typeof attributes.username === 'undefined' ? getOwner() : attributes.username;
      const userObj = await getRepository(User).findOne({ username });
      if (!userObj && !attributes.test) {
        await getRepository(User).save({
          userId: await getIdFromTwitch(username),
          username,
        });
        return self.fireSendDiscordMessage(operation, { ...attributes, username });
      } else if (!userObj) {
        return;
      }

      const message = attributesReplace(attributes, String(operation.messageToSend));
      const messageContent = await self.replaceLinkedUsernameInMessage(await new Message(message).parse());
      const channel = await self.client.guilds.cache.get(self.guild)?.channels.cache.get(dMchannel);
      await (channel as DiscordJs.TextChannel).send(messageContent);
      chatOut(`#${(channel as DiscordJs.TextChannel).name}: ${messageContent} [${self.client.user?.tag}]`);
    } catch (e) {
      warning(e.stack);
    }
  }

  async replaceLinkedUsernameInMessage(message: string) {
    // search linked users and change to @<id>
    let match;
    const usernameRegexp = /@(?<username>[A-Za-z0-9_]{3,15})\b/g;
    while ((match = usernameRegexp.exec(message)) !== null) {
      if (match) {
        const username = match.groups?.username as string;
        const userId = await users.getIdByName(username);
        const link = await getRepository(DiscordLink).findOne({ userId });
        if (link) {
          message = message.replace(`@${username}`, `<@${link.discordId}>`);
        }
      }
    }
    return message;
  }

  initClient() {
    if (!this.client) {
      this.client = new DiscordJs.Client({
        partials: ['REACTION', 'MESSAGE', 'CHANNEL'],
        ws:       { intents: ['GUILD_MESSAGES', 'GUILDS'] },
      });
      this.client.on('ready', () => {
        if (this.client) {
          info(chalk.yellow('DISCORD: ') + `Logged in as ${get(this.client, 'user.tag', 'unknown')}!`);
          this.changeClientOnlinePresence();
          this.updateRolesOfLinkedUsers();
        }
      });

      this.client.on('message', async (msg) => {
        if (this.client && this.guild) {

          const isSelf = msg.author.tag === get(this.client, 'user.tag', null);
          const isDM = msg.channel.type === 'dm';
          const isDifferentGuild = msg.guild?.id !== this.guild;
          const isInIgnoreList
             = this.ignorelist.includes(msg.author.tag)
            || this.ignorelist.includes(msg.author.id)
            || this.ignorelist.includes(msg.author.username);
          if (isSelf || isDM || isDifferentGuild || isInIgnoreList) {
            return;
          }

          if (msg.channel.type === 'text') {
            const listenAtChannels = [
              ...Array.isArray(this.listenAtChannels) ? this.listenAtChannels : [this.listenAtChannels],
            ].filter(o => o !== '');
            if (listenAtChannels.includes(msg.channel.id)) {
              this.message(msg.content, msg.channel, msg.author, msg);
            }
          }
        }
      });
    }
  }

  async message(content: string, channel: DiscordJsTextChannel, author: DiscordJsUser, msg?: DiscordJs.Message) {
    chatIn(`#${channel.name}: ${content} [${author.tag}]`);
    if (msg) {
      if (content === this.getCommand('!link')) {
        this.removeExpiredLinks();
        const link = await getRepository(DiscordLink).save({
          userId:    null,
          tag:       author.tag,
          discordId: author.id,
          createdAt: Date.now(),
        });
        const message = prepare('integrations.discord.link-whisper', {
          tag:         msg.author.tag,
          broadcaster: generalChannel.value,
          id:          link.id,
          command:     this.getCommand('!link'),
        });
        author.send(message);
        whisperOut(`${author.tag}: ${message}`);

        const reply = await msg.reply(prepare('integrations.discord.check-your-dm'));
        chatOut(`#${channel.name}: @${author.tag}, ${prepare('integrations.discord.link-whisper')} [${msg.author.tag}]`);
        if (this.deleteMessagesAfterWhile) {
          setTimeout(() => {
            msg.delete();
            reply.delete();
          }, 10000);
        }
        return;
      } else if (content === this.getCommand('!unlink')) {
        await getRepository(DiscordLink).delete({ tag: author.tag });
        const reply = await msg.reply(prepare('integrations.discord.all-your-links-were-deleted'));
        chatOut(`#${channel.name}: @${author.tag}, ${prepare('integrations.discord.all-your-links-were-deleted')} [${msg.author.tag}]`);
        if (this.deleteMessagesAfterWhile) {
          setTimeout(() => {
            msg.delete();
            reply.delete();
          }, 10000);
        }
        return;
      }
    }
    try {
      // get linked account
      const link = await getRepository(DiscordLink).findOneOrFail({ tag: author.tag, userId: Not(IsNull()) });
      if (link.userId) {
        const user = await getRepository(User).findOneOrFail({ userId: link.userId });
        const parser = new Parser();
        parser.started_at = (msg || { createdTimestamp: Date.now() }).createdTimestamp;
        parser.sender = {
          isModerator: isModerator(user),
          badges:      {}, color:       '',  displayName: '', emoteSets:   [], emotes:      [], userId:      String(link.userId), username:    user.username, userType:    'viewer',
          mod:         'false', subscriber:  'false', turbo:       'false', discord:     { author, channel },
        };

        eventEmitter.emit('keyword-send-x-times', {
          username: user.username, message: content, source: 'discord',
        });
        if (content.startsWith('!')) {
          eventEmitter.emit('command-send-x-times', {
            username: user.username, message: content, source: 'discord',
          });
        }

        parser.message = content;
        parser.process().then(responses => {
          if (responses) {
            for (let i = 0; i < responses.length; i++) {
              setTimeout(async () => {
                if (channel.type === 'text') {
                  const messageToSend = await new Message(await responses[i].response).parse({
                    ...responses[i].attr,
                    forceWithoutAt: true, // we dont need @
                    sender:         { ...responses[i].sender, discord: { author, channel } },
                  }) as string;
                  const reply = await channel.send(messageToSend);
                  chatOut(`#${channel.name}: ${messageToSend} [${author.tag}]`);
                  if (this.deleteMessagesAfterWhile) {
                    setTimeout(() => {
                      reply.delete();
                    }, 10000);
                  }
                }
              }, 1000 * i);
            }
          }
          if (this.deleteMessagesAfterWhile) {
            if (msg) {
              setTimeout(() => {
                msg.delete();
              }, 10000);
            }
          }
        });
      }
    } catch (e) {
      const message = prepare('integrations.discord.your-account-is-not-linked', { command: this.getCommand('!link') });
      if (msg) {
        const reply = await msg.reply(message);
        chatOut(`#${channel.name}: @${author.tag}, ${message} [${author.tag}]`);
        if (this.deleteMessagesAfterWhile) {
          setTimeout(() => {
            msg.delete();
            reply.delete();
          }, 10000);
        }
      }
    }
  }

  sockets() {
    adminEndpoint(this.nsp, 'discord::getRoles', async (cb) => {
      try {
        if (this.client && this.guild) {
          return cb(null, this.client.guilds.cache.get(this.guild)?.roles.cache
            .sort((a, b) => {
              const nameA = a.name.toUpperCase(); // ignore upper and lowercase
              const nameB = b.name.toUpperCase(); // ignore upper and lowercase
              if (nameA < nameB) {
                return -1;
              }
              if (nameA > nameB) {
                return 1;
              }
              // names must be equal
              return 0;
            })
            .map(o => ({ html: `<strong>${o.name}</strong> &lt;${o.id}&gt;`, value: o.id })),
          );
        } else {
          cb(null, []);
        }
      } catch (e) {
        cb(e.message, []);
      }
    });
    adminEndpoint(this.nsp, 'discord::getGuilds', async (cb) => {
      try {
        if (this.client) {
          return cb(null, this.client.guilds.cache
            .sort((a, b) => {
              const nameA = a.name.toUpperCase(); // ignore upper and lowercase
              const nameB = b.name.toUpperCase(); // ignore upper and lowercase
              if (nameA < nameB) {
                return -1;
              }
              if (nameA > nameB) {
                return 1;
              }
              // names must be equal
              return 0;
            })
            .map(o => ({ html: `<strong>${o.name}</strong> &lt;${o.id}&gt;`, value: o.id })));
        } else {
          cb(null, []);
        }
      } catch (e) {
        cb(e.message, []);
      }
    });
    adminEndpoint(this.nsp, 'discord::getChannels', async (cb) => {
      try {
        if (this.client && this.guild) {
          cb(null, this.client.guilds.cache.get(this.guild)?.channels.cache
            .filter(o => o.type === 'text')
            .sort((a, b) => {
              const nameA = (a as DiscordJs.TextChannel).name.toUpperCase(); // ignore upper and lowercase
              const nameB = (b as DiscordJs.TextChannel).name.toUpperCase(); // ignore upper and lowercase
              if (nameA < nameB) {
                return -1;
              }
              if (nameA > nameB) {
                return 1;
              }
              // names must be equal
              return 0;
            })
            .map(o => ({ html: `<strong>#${(o as DiscordJs.TextChannel).name}</strong> &lt;${o.id}&gt;`, value: o.id })),
          );
        } else {
          cb(null, []);
        }
      } catch (e) {
        cb(e.stack, []);
      }
    });
    adminEndpoint(this.nsp, 'discord::authorize', async (cb) => {
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

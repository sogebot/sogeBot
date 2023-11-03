import { DiscordLink } from '@entity/discord.js';
import { Events } from '@entity/event.js';
import { Permissions as PermissionsEntity } from '@entity/permissions.js';
import { User } from '@entity/user.js';
import { HOUR, MINUTE } from '@sogebot/ui-helpers/constants.js';
import { dayjs, timezone } from '@sogebot/ui-helpers/dayjsHelper.js';
import chalk from 'chalk';
import * as DiscordJs from 'discord.js';
import { ChannelType, GatewayIntentBits } from 'discord.js';
import { get } from 'lodash-es';
import { IsNull, LessThan, Not } from 'typeorm';
import { v5 as uuidv5 } from 'uuid';

import Integration from './_interface.js';
import {
  onChange, onStartup, onStreamEnd, onStreamStart,
} from '../decorators/on.js';
import {
  command, persistent, settings,
} from '../decorators.js';
import events from '../events.js';
import { Expects } from  '../expects.js';
import { Message } from '../message.js';
import { Parser } from '../parser.js';
import users from '../users.js';

import { AppDataSource } from '~/database.js';
import { isStreamOnline, stats } from '~/helpers/api/index.js';
import { attributesReplace } from '~/helpers/attributesReplace.js';
import {
  announceTypes, getOwner, getUserSender, isUUID, prepare,
} from '~/helpers/commons/index.js';
import { isBotStarted, isDbConnected } from '~/helpers/database.js';
import { debounce } from '~/helpers/debounce.js';
import { eventEmitter } from '~/helpers/events/index.js';
import {
  chatIn, chatOut, debug, error, info, warning, whisperOut,
} from '~/helpers/log.js';
import { check } from '~/helpers/permissions/check.js';
import { get as getPermission } from '~/helpers/permissions/get.js';
import { adminEndpoint } from '~/helpers/socket.js';
import * as changelog from '~/helpers/user/changelog.js';
import { getIdFromTwitch } from '~/services/twitch/calls/getIdFromTwitch.js';
import { variables } from '~/watchers.js';

class Discord extends Integration {
  client: DiscordJs.Client | null = null;

  @persistent()
    embedStartedAt = '';
  @persistent()
    embedMessageId = '';

  @settings('general')
    clientId = '';

  @settings('general')
    token = '';

  @settings('bot')
    guild = '';

  @settings('bot')
    listenAtChannels: string | string[] = '';

  @settings('bot')
    sendOnlineAnnounceToChannel = '';

  @settings('bot')
    onlineAnnounceMessage = '';

  @settings('bot')
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
    fields: string[] = ['$game', '$title', '$tags', '$startedAt', '$viewers', '$followers', '$subscribers'];

  @settings('bot')
    fieldsDisabled: string[] = [''];

  @settings('bot')
    ignorelist: string[] = [];

  @settings('status')
    onlinePresenceStatusDefault: 'online' | 'idle' | 'invisible' | 'dnd' = 'online';

  @settings('status')
    onlinePresenceStatusDefaultName = '';

  @settings('status')
    onlinePresenceStatusOnStream: 'streaming' | 'online' | 'idle' | 'invisible' | 'dnd' = 'online';

  @settings('status')
    onlinePresenceStatusOnStreamName = '$title';

  @settings('mapping')
    rolesMapping: { [permissionId: string]: string } = {};

  @settings('bot')
    deleteMessagesAfterWhile = false;

  generateEmbed(isOnline: boolean) {
    const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;
    const profileImageUrl = variables.get('services.twitch.profileImageUrl') as string;

    const color = isOnline ? 0x00ff00 : 0xff0000;
    const description = isOnline
      ? `${broadcasterUsername.charAt(0).toUpperCase() + broadcasterUsername.slice(1)} started stream! Check it out!`
      : `${broadcasterUsername.charAt(0).toUpperCase() + broadcasterUsername.slice(1)} is not streaming anymore! Check it next time!`;

    return new DiscordJs.EmbedBuilder()
      .setURL('https://twitch.tv/' + broadcasterUsername)
      .addFields(
        this.fields
          .filter((o) => this.filterFields(o, isOnline))
          .map((o) => this.prepareFields(o, isOnline)))
    // Set the title of the field
      .setTitle('https://twitch.tv/' + broadcasterUsername)
    // Set the color of the embed
      .setColor(color)
    // Set the main content of the embed
      .setDescription(description)
      .setImage(isOnline ? `https://static-cdn.jtvnw.net/previews-ttv/live_user_${broadcasterUsername}-1920x1080.jpg?${Date.now()}`: null)
      .setThumbnail(isOnline ? profileImageUrl : null)
      .setFooter({ text: prepare('integrations.discord.announced-by') + ' - https://www.sogebot.xyz' });
  }

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

          debug('discord.embed', `Trying to update message ${this.embedMessageId}.`);
          if (message) {
            debug('discord.embed', `Updating message ${this.embedMessageId}.`);
            message.edit({ embeds: [this.generateEmbed(true)] })
              .then(() => debug('discord.embed', `Message ${this.embedMessageId} was updated.`))
              .catch((e) => debug('discord.embed', e));
          } else {
            debug('discord.embed', `Error during update of ${this.embedMessageId}. Message not found. ${JSON.stringify({ message })}`);
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

    const linkedUsers = await AppDataSource.getRepository(DiscordLink).find();
    for (const user of linkedUsers) {
      if (!user.userId) {
        continue;
      }
      const guild = this.client.guilds.cache.get(this.guild);
      if (!guild) {
        return warning('No servers found for discord');
      }

      let discordUser: DiscordJs.GuildMember;
      try {
        discordUser = await guild.members.fetch(user.discordId);
      } catch (e) {
        await AppDataSource.getRepository(DiscordLink).delete({ userId: user.userId });
        warning(`Discord user ${user.tag}@${user.discordId} not found - removed from link table`);
        continue;
      }

      const botPermissionsSortedByPriority = await PermissionsEntity.find({
        order: { order: 'ASC' },
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
              warning(`Cannot add role '${role.name}' to user ${user.userId}, check permission for bot (bot cannot set role above his own)`);
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

  async removeExpiredLinks() {
    // remove expired links
    await AppDataSource.getRepository(DiscordLink).delete({ userId: IsNull(), createdAt: LessThan(Date.now() - (MINUTE * 10)) });
  }

  @command('!unlink')
  async unlinkAccounts(opts: CommandOptions) {
    this.removeExpiredLinks();
    await AppDataSource.getRepository(DiscordLink).delete({ userId: opts.sender.userId });
    return [{ response: prepare('integrations.discord.all-your-links-were-deleted-with-sender', { sender: opts.sender }), ...opts }];
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

      const link = await AppDataSource.getRepository(DiscordLink).findOneByOrFail({ id: uuid, userId: IsNull() });
      // link user
      await AppDataSource.getRepository(DiscordLink).save({ ...link, userId: opts.sender.userId });
      return [{ response: prepare('integrations.discord.this-account-was-linked-with', { sender: opts.sender, discordTag: link.tag }), ...opts }];
    } catch (e: any) {
      if (e.message.includes('Expected parameter')) {
        return [
          { response: prepare('integrations.discord.help-message', { sender: opts.sender, command: this.getCommand('!link') }), ...opts },
        ];
      } else {
        if (e.message !== String(errors.NOT_UUID)) {
          warning(e.stack);
        }
        return [{ response: prepare('integrations.discord.invalid-or-expired-token', { sender: opts.sender }), ...opts }];
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

        debug('discord.embed', `Trying to update message ${this.embedMessageId}.`);
        if (message) {
          debug('discord.embed', `Updating message ${this.embedMessageId}.`);
          message.edit({ embeds: [this.generateEmbed(false)] })
            .then(() => debug('discord.embed', `Message ${this.embedMessageId} was updated.`))
            .catch((e) => debug('discord.embed', e));
        } else {
          debug('discord.embed', `Error during update of ${this.embedMessageId}. Message not found. ${JSON.stringify({ message })}`);
        }
      } catch (e: any) {
        warning(`Discord embed couldn't be changed to offline - ${e.message}`);
      }
    }
    this.embedMessageId = '';
  }

  filterFields(o: string, isOnline: boolean) {
    const broadcasterType = variables.get('services.twitch.broadcasterType') as string;

    if (this.fieldsDisabled.includes(o)) {
      return false;
    }

    if (!isOnline) {
      if (['$viewers', '$followers', '$subscribers'].includes(o)) {
        return false;
      }
    }

    if (o === '$subscribers' && broadcasterType !== '') {
      return false;
    }

    if (o === '$tags' && (stats.value.currentTags ?? []).length === 0) {
      // don't show empty tags
      return false;
    }
    return true;
  }

  prepareFields(o: string, isOnline: boolean) {
    if (o === '$game') {
      return { name: prepare('webpanel.responses.variable.game'), value: stats.value.currentGame ?? '' };
    }
    if (o === '$title') {
      return { name: prepare('webpanel.responses.variable.title'), value: stats.value.currentTitle ?? '' };
    }
    if (o === '$tags') {
      return { name: prepare('webpanel.responses.variable.tags'), value: `${(stats.value.currentTags ?? []).map(tag => `${tag}`).join(', ')}` ?? '' };
    }
    if (o === '$startedAt') {
      if (isOnline) {
        return { name: prepare('integrations.discord.started-at'), value: this.embedStartedAt, inline: true };
      } else {
        return { name: prepare('integrations.discord.streamed-at'), value: `${this.embedStartedAt} - ${dayjs().tz(timezone).format('LLL')}`, inline: true };
      }
    }
    if (o === '$viewers') {
      return { name: prepare('webpanel.viewers'), value: String(stats.value.currentViewers), inline: true };
    }
    if (o === '$followers') {
      return { name: prepare('webpanel.followers'), value: String(stats.value.currentFollowers), inline: true };
    }
    if (o === '$subscribers') {
      return { name: prepare('webpanel.subscribers'), value: String(stats.value.currentSubscribers), inline: true };
    }
    return { name: o, value: 'unknown field' };
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
        // Send the embed to the same channel as the message
        const message = await (channel as DiscordJs.TextChannel).send({
          content: this.onlineAnnounceMessage.length > 0 ? this.onlineAnnounceMessage : undefined,
          embeds:  [this.generateEmbed(true)],
        });
        this.embedMessageId = message.id;
        chatOut(`#${(channel as DiscordJs.TextChannel).name}: [[online announce embed]] [${this.client.user?.tag}]`);
      }
    } catch (e: any) {
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
      const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;
      if (isStreamOnline.value) {
        const activityString = await new Message(this.onlinePresenceStatusOnStreamName).parse();
        if (this.onlinePresenceStatusOnStream === 'streaming') {
          this.client?.user?.setStatus('online');
          this.client?.user?.setPresence({
            status:     'online',
            activities: [{
              name: activityString, type: DiscordJs.ActivityType.Streaming, url: `https://twitch.tv/${broadcasterUsername}`,
            }],
          });
        } else {
          this.client?.user?.setStatus(this.onlinePresenceStatusOnStream);
          if (activityString !== '') {
            this.client?.user?.setActivity('');
          } else {
            this.client?.user?.setPresence({ status: this.onlinePresenceStatusOnStream, activities: [{ name: activityString }] });
          }
        }
      } else {
        const activityString = await new Message(this.onlinePresenceStatusDefaultName).parse();
        if (activityString !== ''){
          this.client?.user?.setStatus(this.onlinePresenceStatusDefault);
          this.client?.user?.setPresence({ status: this.onlinePresenceStatusDefault, activities: [{ name: activityString }] });
        } else {
          this.client?.user?.setActivity('');
          this.client?.user?.setStatus(this.onlinePresenceStatusDefault);
        }
      }
    } catch (e: any) {
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
      const userName = attributes.username === null || typeof attributes.username === 'undefined' ? getOwner() : attributes.username;
      await changelog.flush();
      const userObj = await AppDataSource.getRepository(User).findOneBy({ userName });
      if (!attributes.test) {
        if (!userObj) {
          changelog.update(await getIdFromTwitch(userName), { userName });
          return self.fireSendDiscordMessage(operation, { ...attributes, userName });
        }
      }

      const message = attributesReplace(attributes, String(operation.messageToSend));
      const messageContent = await self.replaceLinkedUsernameInMessage(await new Message(message).parse());
      const channel = await self.client.guilds.cache.get(self.guild)?.channels.cache.get(dMchannel);
      await (channel as DiscordJs.TextChannel).send(messageContent);
      chatOut(`#${(channel as DiscordJs.TextChannel).name}: ${messageContent} [${self.client.user?.tag}]`);
    } catch (e: any) {
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
        const link = await AppDataSource.getRepository(DiscordLink).findOneBy({ userId });
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
        intents: [
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.Guilds,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.DirectMessages,
        ],
        partials: [
          DiscordJs.Partials.Reaction,
          DiscordJs.Partials.Message,
          DiscordJs.Partials.Channel,
        ],
      });
      this.client.on('ready', () => {
        if (this.client) {
          info(chalk.yellow('DISCORD: ') + `Logged in as ${get(this.client, 'user.tag', 'unknown')}!`);
          this.changeClientOnlinePresence();
          this.updateRolesOfLinkedUsers();
        }
      });
      this.client.on('error', (err) => {
        error(`DISCORD: ${err.stack || err.message}`);
      });

      this.client.on('messageCreate', async (msg) => {
        if (this.client && this.guild) {

          const isSelf = msg.author.tag === get(this.client, 'user.tag', null);
          const isDM = msg.channel.type === ChannelType.DM;
          const isDifferentGuild = msg.guild?.id !== this.guild;
          const isInIgnoreList
             = this.ignorelist.includes(msg.author.tag)
            || this.ignorelist.includes(msg.author.id)
            || this.ignorelist.includes(msg.author.username);
          if (isSelf || isDM || isDifferentGuild || isInIgnoreList) {
            return;
          }

          if (msg.channel.type === ChannelType.GuildText) {
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
      const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;
      if (content === this.getCommand('!_debug')) {
        info('======= COPY DISCORD DEBUG MESSAGE FROM HERE =======');
        info('Content: ');
        info(content);
        info('Author: ');
        info(JSON.stringify(author, null, 2));
        info('Message: ');
        info(JSON.stringify(msg, null, 2));
        info('Channel: ');
        info(JSON.stringify(channel, null, 2));
        info('======= END OF DISCORD DEBUG MESSAGE =======');

        if (this.deleteMessagesAfterWhile) {
          setTimeout(() => {
            msg.delete();
          }, 10000);
        }
        return;
      }
      if (content === this.getCommand('!link')) {
        this.removeExpiredLinks();
        const link = await AppDataSource.getRepository(DiscordLink).save({
          userId:    null,
          tag:       author.tag,
          discordId: author.id,
          createdAt: Date.now(),
        });
        const message = prepare('integrations.discord.link-whisper', {
          tag:         author.tag,
          broadcaster: broadcasterUsername,
          id:          link.id,
          command:     this.getCommand('!link'),
        });
        try {
          await author.send(message);
          whisperOut(`${author.tag}: ${message}`);
        } catch (e) {
          const reply = await msg.reply(`@${author.tag}, Cannot send whisper to you. Please enable it in your Discord settings.`);
          chatOut(`#${channel.name}: @${author.tag}, Cannot send whisper to you. Please enable it in your Discord settings. [${author.tag}]`);
          if (this.deleteMessagesAfterWhile) {
            setTimeout(() => {
              msg.delete();
              reply.delete();
            }, 10000);
          }
        }

        const reply = await msg.reply(prepare('integrations.discord.check-your-dm'));
        chatOut(`#${channel.name}: @${author.tag}, ${prepare('integrations.discord.check-your-dm')} [${author.tag}]`);
        if (this.deleteMessagesAfterWhile) {
          setTimeout(() => {
            msg.delete();
            reply.delete();
          }, 10000);
        }
        return;
      } else if (content === this.getCommand('!unlink')) {
        await AppDataSource.getRepository(DiscordLink).delete({ discordId: author.id });
        const reply = await msg.reply(prepare('integrations.discord.all-your-links-were-deleted'));
        chatOut(`#${channel.name}: @${author.tag}, ${prepare('integrations.discord.all-your-links-were-deleted')} [${author.tag}]`);
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
      const link = await AppDataSource.getRepository(DiscordLink).findOneByOrFail({ discordId: author.id, userId: Not(IsNull()) });
      if (link.userId) {
        const user = await changelog.getOrFail(link.userId);
        const parser = new Parser();
        parser.started_at = (msg || { createdTimestamp: Date.now() }).createdTimestamp;
        parser.discord = { author, channel };
        parser.sender = getUserSender(user.userId, user.userName);

        eventEmitter.emit('keyword-send-x-times', {
          userName: user.userName, message: content, source: 'discord',
        });
        if (content.startsWith('!')) {
          eventEmitter.emit('command-send-x-times', {
            userName: user.userName, message: content, source: 'discord',
          });
        }

        parser.message = content;
        parser.process().then(responses => {
          if (responses) {
            for (let i = 0; i < responses.length; i++) {
              setTimeout(async () => {
                if (channel.type === ChannelType.GuildText) {
                  const messageToSend = await new Message(await responses[i].response).parse({
                    ...responses[i].attr,
                    forceWithoutAt: true, // we dont need @
                    sender:         { ...responses[i].sender },
                    discord:        { author, channel },
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
    } catch (e: any) {
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
    adminEndpoint('/integrations/discord', 'discord::getRoles', async (cb) => {
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
            .map(o => ({ text: `<strong>${o.name}</strong> <small class="font-italic">${o.id}</small>`, value: o.id })) || [],
          );
        } else {
          cb(null, []);
        }
      } catch (e: any) {
        cb(e.message, []);
      }
    });
    adminEndpoint('/integrations/discord', 'discord::getGuilds', async (cb) => {
      try {
        if (this.client) {
          await this.client.guilds.fetch();
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
            .map(o => ({ text: `<strong>${o.name}</strong> <small class="font-italic">${o.id}</small>`, value: o.id })));
        } else {
          cb(null, []);
        }
      } catch (e: any) {
        cb(e.message, []);
      }
    });
    adminEndpoint('/integrations/discord', 'discord::getChannels', async (cb) => {
      try {
        if (this.client && this.guild) {
          cb(null, this.client.guilds.cache.get(this.guild)?.channels.cache
            .filter(o => o.type === ChannelType.GuildText)
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
            .map(o => ({ text: `<strong>#${(o as DiscordJs.TextChannel).name}</strong> <small class="font-italic">${o.id}</small>`, value: o.id })) || [],
          );
        } else {
          cb(null, []);
        }
      } catch (e: any) {
        cb(e.stack, []);
      }
    });
    adminEndpoint('/integrations/discord', 'discord::authorize', async (cb) => {
      if (this.token === '' || this.clientId === '') {
        cb('Cannot authorize! Missing clientId or token. Please save changes before authorizing.', null);
      } else {
        try {
          cb(null, { do: 'redirect', opts: [`https://discordapp.com/oauth2/authorize?&scope=bot&permissions=8&client_id=${this.clientId}`] });
        } catch (e: any) {
          error(e.stack);
          cb(e.stack, null);
        }
      }
    });
  }
}

const self = new Discord();
export default self;
